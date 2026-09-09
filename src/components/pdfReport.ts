/**
 * Konsolidasyon planı PDF'i — jsPDF ile doğrudan istemci tarafında üretilir.
 *
 * Neden `window.print()` değil: Capacitor'ın native Android/iOS sarmalayıcısında
 * sayfa çıplak bir WebView içinde çalışır ve `window.print()`in bağlı olduğu bir
 * yazdırma işleyicisi YOK — düğme tarayıcıda çalışıp uygulama içinde sessizce
 * hiçbir şey yapmazdı.
 *
 * Neden `navigator.share`/`<a download>` de TEK BAŞINA yetmiyor: aynı sebep —
 * çıplak WebView'da bunlar da bir indirme yöneticisine/paylaşım köprüsüne bağlı
 * değil, native uygulamada sessizce başarısız olabiliyor. Bu yüzden native
 * platformda (`Capacitor.isNativePlatform()`) @capacitor/filesystem + @capacitor/share
 * kullanılıyor — ikisi de gerçek native köprü, WebView'ın kendi API desteğine
 * bağımlı değil. Tarayıcıda ise Web Share API / blob indirme aynen çalışır.
 *
 * Font: jsPDF'in yerleşik fontları Türkçe ı/İ/ğ/Ğ/ş/Ş'yi RENDER EDEMEZ (Latin-1
 * dışı). Gömülü Archivo alt kümesi için bkz. `pdfFont.ts`.
 */
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { ConsolidationResult } from '@/lib/consolidate';
import type { EquipmentSpec } from '@/lib/equipment';
import { fmt, pct } from './ui';

const FONT = 'Archivo';

/** Marka renkleri (globals.css token'larının RGB karşılığı). */
const C_ACCENT: [number, number, number] = [9, 74, 65];
const C_ACCENT_SOFT: [number, number, number] = [220, 234, 230];
const C_INK: [number, number, number] = [19, 26, 24];
const C_INK_2: [number, number, number] = [90, 99, 96];
const C_RULE: [number, number, number] = [178, 186, 181];
const C_STAMP: [number, number, number] = [158, 59, 46];
/** İkon düzlemleri — src/app/icon.svg ile aynı. */
const C_ICON_TOP: [number, number, number] = [244, 248, 246];
const C_ICON_LEFT: [number, number, number] = [191, 217, 211];
const C_ICON_RIGHT: [number, number, number] = [232, 98, 44];

interface ReportItem {
  label: string;
  l: number;
  w: number;
  h: number;
  kg: number;
  qty: number;
  cylinder: boolean;
}

/** Yerleşmiş bir blok — 2D görünümler için, tümü mm. */
export interface ReportBlock {
  /** uzunluk ekseni başlangıcı */
  x: number;
  /** yükseklik ekseni başlangıcı (tabandan) */
  y: number;
  /** genişlik ekseni ofseti */
  z: number;
  /** kapladığı uzunluk */
  l: number;
  /** kapladığı genişlik */
  w: number;
  /** kapladığı yükseklik */
  h: number;
  color: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const s = hex.replace('#', '');
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

/**
 * Ortografik yükseklik görünümü (elevation) çizer — 3D ekran görüntüsünün
 * aksine bu **veriden** üretilir: yakalama riski yok, baskıda vektör keskinliği
 * korunur ve ölçüler birebir doğrudur.
 *
 * `a` yatay eksen, `b` dikey eksen (yükseklik). Yükseklik yukarı doğru
 * büyüdüğü için PDF'in yukarıdan-aşağı y ekseni ters çevrilir.
 */
function drawElevation(
  doc: jsPDF,
  x0: number,
  y0: number,
  drawW: number,
  drawH: number,
  spanA: number,
  spanB: number,
  boxes: Array<{ a: number; b: number; da: number; db: number; color: string }>,
) {
  const sa = drawW / spanA;
  const sb = drawH / spanB;

  // ekipman kesiti
  doc.setFillColor(252, 252, 251);
  doc.setDrawColor(...C_RULE);
  doc.setLineWidth(0.4);
  doc.rect(x0, y0, drawW, drawH, 'FD');

  for (const bx of boxes) {
    const px = x0 + bx.a * sa;
    const pw = Math.max(0.4, bx.da * sa);
    const ph = Math.max(0.4, bx.db * sb);
    const py = y0 + drawH - (bx.b + bx.db) * sb;
    doc.setFillColor(...hexToRgb(bx.color));
    doc.setDrawColor(40, 44, 42);
    doc.setLineWidth(0.15);
    doc.rect(px, py, pw, ph, 'FD');
  }
}

/**
 * Marka amblemini çizer — uygulama ikonuyla (icon.svg, 32 birimlik tuval) aynı
 * geometri, `size` mm'ye ölçeklenmiş: yuvarlak kare + oluklu konteyner silueti.
 */
function drawLogoMark(doc: jsPDF, x: number, y: number, size: number) {
  const k = size / 32; // icon.svg 32x32 tuvalinden mm'ye
  const P = (px: number, py: number): [number, number] => [x + px * k, y + py * k];

  /** Dört köşeli düzlemi dolgu olarak çizer (jsPDF `lines` göreli delta ister). */
  const quad = (pts: Array<[number, number]>, fill: [number, number, number]) => {
    const [p0, ...rest] = pts;
    const deltas = rest.map((p, i) => {
      const prev = i === 0 ? p0 : rest[i - 1];
      return [p[0] - prev[0], p[1] - prev[1]];
    });
    doc.setFillColor(...fill);
    doc.lines(deltas, p0[0], p0[1], [1, 1], 'F', true);
  };

  doc.setFillColor(...C_ACCENT);
  doc.roundedRect(x, y, size, size, 5 * k, 5 * k, 'F');

  // İzometrik konteyner — ikonla aynı üç düzlem.
  quad([P(4.94, 11.18), P(16, 5.65), P(27.07, 11.18), P(16, 16.71)], C_ICON_TOP);
  quad([P(4.94, 11.18), P(16, 16.71), P(16, 26.31), P(4.94, 20.77)], C_ICON_LEFT);
  quad([P(16, 16.71), P(27.07, 11.18), P(27.07, 20.77), P(16, 26.31)], C_ICON_RIGHT);
}

export async function buildConsolidationPdf(
  equipment: EquipmentSpec,
  result: ConsolidationResult,
  items: ReportItem[],
  snapshot: string | null,
  /** Görüntü alınamadıysa sebebi — PDF'te boş bırakmak yerine yazılır. */
  snapshotError: string | null = null,
  /** 2D yandan/önden görünümler için yerleşmiş bloklar. */
  blocks: ReportBlock[] = [],
): Promise<Blob> {
  // Font ~76 KB; yalnızca PDF üretilirken yüklensin diye dinamik import.
  const { ARCHIVO_REGULAR_B64, ARCHIVO_BOLD_B64 } = await import('./pdfFont');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.addFileToVFS('Archivo-Regular.ttf', ARCHIVO_REGULAR_B64);
  doc.addFont('Archivo-Regular.ttf', FONT, 'normal');
  doc.addFileToVFS('Archivo-Bold.ttf', ARCHIVO_BOLD_B64);
  doc.addFont('Archivo-Bold.ttf', FONT, 'bold');

  const marginX = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - marginX * 2;

  // ---- başlık (marka kilidi) ----
  const badge = 11;
  drawLogoMark(doc, marginX, 12, badge);

  doc.setFont(FONT, 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...C_INK);
  doc.text('INSPECTER', marginX + badge + 4, 18.5, { charSpace: 0.3 });

  doc.setFont(FONT, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C_INK_2);
  doc.text('Konsolidasyon planı', marginX + badge + 4, 22.8);
  doc.text(new Date().toLocaleDateString('tr-TR'), pageW - marginX, 18.5, { align: 'right' });

  doc.setDrawColor(...C_RULE);
  doc.setLineWidth(0.4);
  doc.line(marginX, 26.5, pageW - marginX, 26.5);

  let y = 35;

  // ---- ekipman + durum ----
  doc.setFont(FONT, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...C_INK);
  doc.text(equipment.name, marginX, y);

  const fits = result.boundBy === 'none';
  const status = fits ? 'SIĞIYOR' : result.boundBy === 'length' ? 'UZUNLUK AŞILDI' : 'AĞIRLIK AŞILDI';
  doc.setFont(FONT, 'bold');
  doc.setFontSize(8);
  const stW = doc.getTextWidth(status) + 6;
  doc.setFillColor(...(fits ? C_ACCENT_SOFT : [242, 225, 221] as [number, number, number]));
  doc.roundedRect(pageW - marginX - stW, y - 4.6, stW, 6.4, 1, 1, 'F');
  doc.setTextColor(...(fits ? C_ACCENT : C_STAMP));
  doc.text(status, pageW - marginX - stW / 2, y, { align: 'center' });

  y += 9;

  // ---- özet ----
  const rows: Array<[string, string]> = [
    [
      'Uzunluk kullanımı',
      `${fmt(result.totalLengthUsed / 10)} / ${fmt((equipment.L * (1 - result.allowance)) / 10)} cm · ${pct(result.lengthUtil)}`,
    ],
    [
      'Ağırlık kullanımı',
      `${fmt(result.totalWeight)} / ${fmt(equipment.payload * (1 - result.allowance))} kg · ${pct(result.weightUtil)}`,
    ],
  ];
  if (result.blocks.length > 0) {
    rows.push(['Net yük hacmi', `${fmt(result.cargoVolume / 1e9, 1)} m³`]);
    rows.push([
      'Fire (boşluk)',
      `${fmt(result.voidVolume / 1e9, 1)} m³ · dolu bölümde %${Math.round(result.voidRatio * 100)}`,
    ]);
  }
  if (result.allowance > 0) rows.push(['Fire payı', `%${Math.round(result.allowance * 100)}`]);

  doc.setFontSize(10);
  for (const [k, v] of rows) {
    doc.setFont(FONT, 'normal');
    doc.setTextColor(...C_INK_2);
    doc.text(k, marginX, y);
    doc.setFont(FONT, 'bold');
    doc.setTextColor(...C_INK);
    doc.text(v, marginX + 45, y);
    y += 6;
  }

  // ---- uyarılar ----
  const warn = (text: string) => {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...C_STAMP);
    const lines = doc.splitTextToSize(text, contentW) as string[];
    doc.text(lines, marginX, y);
    y += lines.length * 5 + 1;
    doc.setTextColor(...C_INK);
  };

  y += 1;
  if (result.unfitItems.length > 0) {
    warn(`Sığmayan kalemler: ${result.unfitItems.map((i) => i.label).join(', ')}`);
  }
  if (!fits) {
    warn(
      result.boundBy === 'length'
        ? `Kapasite aşıldı — gereken uzunluk ${fmt(result.lengthOverflow / 10)} cm fazla.`
        : `Kapasite aşıldı — toplam ağırlık ${fmt(result.weightOverflow)} kg fazla.`,
    );
  }

  // ---- 3D görünüm ----
  // Tabloda ÖNCE geliyor ve boyutu sınırlanıyor: yükleme ekibinin ilk bakacağı
  // şey bu, ayrıca mobil tuval neredeyse kare olduğu için (ör. 720x680) tam
  // genişlikte ~172 mm tutuyordu ve sessizce ikinci sayfaya taşıyordu.
  y += 4;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C_INK);
  doc.text('3D yerleşim görünümü', marginX, y);
  y += 5;

  if (snapshot) {
    const props = doc.getImageProperties(snapshot);
    const MAX_H = 95; // mm — her zaman ilk sayfaya sığsın
    let w = contentW;
    let h = (props.height * w) / props.width;
    if (h > MAX_H) {
      h = MAX_H;
      w = (props.width * h) / props.height;
    }
    const x = marginX + (contentW - w) / 2; // dar kalırsa ortala
    doc.setDrawColor(...C_RULE);
    doc.setLineWidth(0.3);
    doc.addImage(snapshot, 'PNG', x, y, w, h);
    doc.rect(x, y, w, h, 'S');
    y += h + 6;
  } else {
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C_STAMP);
    const reason = snapshotError ?? 'Görüntü alınamadı.';
    const lines = doc.splitTextToSize(
      `${reason} Sahneyi bir kez döndürüp tekrar dene.`, contentW,
    ) as string[];
    doc.text(lines, marginX, y);
    doc.setTextColor(...C_INK);
    y += lines.length * 5 + 4;
  }

  // ---- 2D ortografik görünümler ----
  // Ekran görüntüsünün aksine bunlar veriden çizilir: ölçüler birebir, baskıda
  // vektör keskinliğinde ve yakalama başarısız olsa bile her zaman çıkarlar.
  if (blocks.length > 0) {
    const SIDE_H = 30;  // mm
    const FRONT_H = 34; // mm
    const gap = 8;
    const frontW = (FRONT_H * equipment.W) / equipment.H;
    const labelH = 5;
    const needed = labelH + Math.max(SIDE_H, FRONT_H) + 8;
    if (y + needed > pageH - 18) { doc.addPage(); y = 20; }

    const sideW = contentW - frontW - gap;

    doc.setFont(FONT, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C_INK_2);
    doc.text('Yandan görünüm (uzunluk × yükseklik)', marginX, y);
    doc.text('Önden görünüm', marginX + sideW + gap, y);
    y += 3;

    drawElevation(
      doc, marginX, y, sideW, SIDE_H, equipment.L, equipment.H,
      blocks.map((b) => ({ a: b.x, b: b.y, da: b.l, db: b.h, color: b.color })),
    );
    drawElevation(
      doc, marginX + sideW + gap, y, frontW, FRONT_H, equipment.W, equipment.H,
      blocks.map((b) => ({ a: b.z, b: b.y, da: b.w, db: b.h, color: b.color })),
    );

    y += Math.max(SIDE_H, FRONT_H) + 3.5;

    doc.setFont(FONT, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C_INK_2);
    doc.text(
      `Kasa ${fmt(equipment.L / 10)} × ${fmt(equipment.W / 10)} × ${fmt(equipment.H / 10)} cm · ölçekli`,
      marginX, y,
    );
    y += 6;
    doc.setTextColor(...C_INK);
  }

  // ---- kalem tablosu ----
  doc.setFont(FONT, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C_INK);
  doc.text('Kalemler', marginX, y);
  y += 6;

  const cols = [marginX, marginX + 9, marginX + 78, marginX + 118, marginX + 155];
  const headers = ['#', 'Etiket', 'Ölçü (cm)', 'Ağırlık (kg/ad.)', 'Adet'];

  const tableHead = () => {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C_INK_2);
    headers.forEach((h, i) => doc.text(h, cols[i], y));
    y += 1.8;
    doc.setDrawColor(...C_RULE);
    doc.setLineWidth(0.3);
    doc.line(marginX, y, pageW - marginX, y);
    y += 4.6;
  };
  tableHead();

  doc.setFontSize(9.5);
  items.forEach((it, i) => {
    if (y > pageH - 22) {
      doc.addPage();
      y = 20;
      tableHead();
      doc.setFontSize(9.5);
    }
    doc.setFont(FONT, 'normal');
    doc.setTextColor(...C_INK_2);
    doc.text(String(i + 1), cols[0], y);
    doc.setTextColor(...C_INK);
    const label = it.label + (it.cylinder ? ' (silindir)' : '');
    doc.text(doc.splitTextToSize(label, 64)[0] as string, cols[1], y);
    doc.text(`${fmt(it.l)}×${fmt(it.w)}×${fmt(it.h)}`, cols[2], y);
    doc.text(fmt(it.kg, 1), cols[3], y);
    doc.text(String(it.qty), cols[4], y);
    y += 5.6;
  });

  // ---- altbilgi (her sayfaya) ----
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C_INK_2);
    doc.text(
      'Bu bir yerleşim tahminidir; ambalaj ve bağlama payı için fire payı girilebilir.',
      marginX,
      pageH - 10,
    );
    doc.text(`${p} / ${pages}`, pageW - marginX, pageH - 10, { align: 'right' });
  }

  return doc.output('blob');
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function shareOrDownloadPdf(blob: Blob, fileName: string): Promise<'shared' | 'downloaded'> {
  if (Capacitor.isNativePlatform()) {
    const base64 = await blobToBase64(blob);
    const written = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
    await Share.share({ title: 'Inspecter Konsolidasyon Planı', files: [written.uri] });
    return 'shared';
  }

  const file = new File([blob], fileName, { type: 'application/pdf' });
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };

  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Inspecter Konsolidasyon Planı' });
      return 'shared';
    } catch {
      // Kullanıcı paylaşım sayfasını iptal etti — indirmeye düş.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
