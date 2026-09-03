/**
 * Excel/CSV toplu içe aktarma — saf metin işleme, React'e bağımlı değil.
 *
 * `xlsx` (SheetJS) npm paketi düzeltilmemiş yüksek önem dereceli güvenlik açıkları
 * taşıyor (prototype pollution + ReDoS, "no fix available" — bkz. GHSA-4r6h-8v6p-xvw6,
 * GHSA-5pgg-2g8v-p4x9). Bu yüzden gerçek .xlsx ikili biçimini ayrıştırmıyoruz; kullanıcı
 * Excel'den "Farklı Kaydet → CSV" ile dışa aktarır (standart, tek adımlık bir işlem) ve
 * biz CSV'yi kendi ayrıştırıcımızla okuruz — sıfır bağımlılık, sıfır bilinen açık.
 */

export interface ImportedItem {
  label: string;
  l: number;
  w: number;
  h: number;
  kg: number;
  qty: number;
  maxStack: number | null;
  thisSideUp: boolean;
}

export interface ImportResult {
  items: ImportedItem[];
  warnings: string[];
}

const HEADER_ALIASES: Record<
  'label' | 'l' | 'w' | 'h' | 'kg' | 'qty' | 'maxStack' | 'thisSideUp',
  string[]
> = {
  label: ['etiket', 'isim', 'ad', 'ürün', 'firma', 'kalem', 'label', 'name', 'item'],
  l: ['uzunluk', 'boy', 'length', 'l', 'uzunluk(cm)', 'uzunluk cm'],
  w: ['genişlik', 'en', 'width', 'w', 'genişlik(cm)', 'genişlik cm'],
  h: ['yükseklik', 'height', 'h', 'yükseklik(cm)', 'yükseklik cm'],
  kg: ['ağırlık', 'brüt ağırlık', 'weight', 'kg', 'ağırlık(kg/adet)', 'ağırlık kg'],
  qty: ['adet', 'miktar', 'adedi', 'qty', 'quantity'],
  maxStack: ['azami kat', 'kat', 'max stack', 'maxstack', 'stack'],
  thisSideUp: ['bu taraf yukarı', 'dik', 'this side up', 'sideup', 'side up'],
};

function normalizeHeader(s: string): string {
  return s
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

function detectDelimiter(firstLine: string): string {
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestCount = 0;
  for (const d of candidates) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) { bestCount = count; best = d; }
  }
  return best;
}

/** RFC4180'e yakın CSV ayrıştırıcı — tırnaklı alan, kaçışlı tırnak, CRLF/LF destekler. */
export function parseCsv(text: string): string[][] {
  const cleaned = text.replace(/^﻿/, ''); // BOM
  const firstLine = cleaned.split(/\r?\n/, 1)[0] ?? '';
  const delim = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inQuotes) {
      if (c === '"') {
        if (cleaned[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') { inQuotes = true; }
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* \n ile birlikte ele alınır */ }
    else { field += c; }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** Başlık satırını esnek eşler (Türkçe/İngilizce, büyük/küçük harf, boşluk fark etmez). */
export function parseImportRows(rows: string[][]): ImportResult {
  const warnings: string[] = [];
  if (rows.length === 0) return { items: [], warnings: ['Dosya boş görünüyor.'] };

  const header = rows[0].map(normalizeHeader);
  const colIndex: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {};
  for (const key of Object.keys(HEADER_ALIASES) as Array<keyof typeof HEADER_ALIASES>) {
    const normAliases = HEADER_ALIASES[key].map(normalizeHeader);
    const idx = header.findIndex((h) => normAliases.includes(h));
    if (idx >= 0) colIndex[key] = idx;
  }

  const required: Array<keyof typeof HEADER_ALIASES> = ['l', 'w', 'h', 'kg', 'qty'];
  const missing = required.filter((k) => colIndex[k] === undefined);
  if (missing.length > 0) {
    warnings.push(
      `Beklenen sütunlar bulunamadı: ${missing.join(', ')}. "Şablonu indir" ile doğru başlıkları görebilirsin.`,
    );
    return { items: [], warnings };
  }

  const readNum = (row: string[], key: 'l' | 'w' | 'h' | 'kg' | 'qty'): number | null => {
    const raw = (row[colIndex[key]!] ?? '').trim().replace(',', '.');
    if (raw === '') return null;
    const v = parseFloat(raw);
    return Number.isFinite(v) ? v : null;
  };

  const items: ImportedItem[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every((c) => c.trim() === '')) continue;

    const l = readNum(row, 'l');
    const w = readNum(row, 'w');
    const h = readNum(row, 'h');
    const kg = readNum(row, 'kg');
    const qty = readNum(row, 'qty');

    if (l === null || w === null || h === null || kg === null || qty === null
      || l <= 0 || w <= 0 || h <= 0 || qty <= 0 || kg < 0) {
      warnings.push(`${r + 1}. satır atlandı: ölçü/ağırlık/adet eksik veya geçersiz.`);
      continue;
    }

    const label = colIndex.label !== undefined ? (row[colIndex.label] ?? '').trim() : '';
    const maxStackRaw = colIndex.maxStack !== undefined ? (row[colIndex.maxStack] ?? '').trim().replace(',', '.') : '';
    const maxStackVal = parseFloat(maxStackRaw);
    const sideUpRaw = colIndex.thisSideUp !== undefined
      ? (row[colIndex.thisSideUp] ?? '').trim().toLocaleLowerCase('tr')
      : '';
    const thisSideUp = ['1', 'evet', 'yes', 'true', 'x', 'dik'].includes(sideUpRaw);

    items.push({
      label: label || `Kalem ${items.length + 1}`,
      l, w, h, kg, qty,
      maxStack: Number.isFinite(maxStackVal) && maxStackVal > 0 ? Math.floor(maxStackVal) : null,
      thisSideUp,
    });
  }

  if (items.length === 0 && warnings.length === 0) {
    warnings.push('İçe aktarılabilir satır bulunamadı.');
  }
  return { items, warnings };
}

/** İndirilebilir CSV şablonu — Türkçe Excel varsayılanı ile uyumlu ";" ayraçlı. */
export function csvTemplate(): string {
  const header = ['Etiket', 'Uzunluk(cm)', 'Genişlik(cm)', 'Yükseklik(cm)', 'Ağırlık(kg/adet)', 'Adet', 'Azami kat', 'Bu taraf yukarı'];
  const example1 = ['Firma A', '120', '80', '100', '300', '10', '', ''];
  const example2 = ['Firma B', '60', '40', '40', '15', '40', '5', 'evet'];
  return [header, example1, example2].map((r) => r.join(';')).join('\r\n');
}
