/**
 * ISO 6346 — konteyner numarası doğrulama ve kontrol hanesi hesabı.
 *
 * Biçim: 4 harf (3 harf sahip kodu + kategori tanımlayıcı) + 6 rakam + 1 kontrol hanesi.
 * Örn. MSCU 739428 4
 *
 * Kontrol hanesi: her karakterin sayısal karşılığı 2^(pozisyon) ile çarpılır
 * (pozisyon 0..9), toplam mod 11 alınır; 10 çıkarsa 0 yazılır.
 * Harf değerlerinde 11'in katları atlanır (11, 22, 33).
 */

const LETTER_VALUES: Record<string, number> = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19,
  J: 20, K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29,
  S: 30, T: 31, U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
};

/** Kategori tanımlayıcı (4. harf) */
export const CATEGORIES: Record<string, string> = {
  U: 'Yük konteyneri',
  J: 'Ayrılabilir ekipman',
  Z: 'Treyler / şasi',
  R: 'Soğutmalı (eski kullanım)',
};

export interface ParsedContainerNo {
  ok: boolean;
  /** Boşluk ve tireden arındırılmış, büyük harfe çevrilmiş hâli */
  normalized: string;
  ownerCode?: string;
  category?: string;
  serial?: string;
  /** Girilen kontrol hanesi (verilmişse) */
  givenCheck?: number;
  /** Hesaplanan doğru kontrol hanesi */
  computedCheck?: number;
  error?: string;
}

/** 10 karakterlik gövde (4 harf + 6 rakam) için kontrol hanesini hesaplar. */
export function checkDigit(body: string): number {
  const s = body.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/^[A-Z]{4}\d{6}$/.test(s)) {
    throw new Error('Gövde 4 harf + 6 rakam olmalı');
  }
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = s[i];
    const val = i < 4 ? LETTER_VALUES[ch] : Number(ch);
    sum += val * 2 ** i;
  }
  const rem = sum % 11;
  return rem === 10 ? 0 : rem;
}

/** Tam veya kısmi konteyner numarasını çözümler ve doğrular. */
export function parseContainerNo(input: string): ParsedContainerNo {
  const normalized = (input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (normalized.length < 10) {
    return {
      ok: false,
      normalized,
      error: `Eksik: ${normalized.length}/11 karakter. 4 harf + 6 rakam + kontrol hanesi bekleniyor.`,
    };
  }
  if (normalized.length > 11) {
    return { ok: false, normalized, error: 'Fazla karakter: en çok 11 olmalı.' };
  }

  const body = normalized.slice(0, 10);
  if (!/^[A-Z]{4}\d{6}$/.test(body)) {
    return {
      ok: false,
      normalized,
      error: 'Biçim hatalı: ilk 4 karakter harf, sonraki 6 karakter rakam olmalı.',
    };
  }

  const ownerCode = body.slice(0, 3);
  const category = body[3];
  const serial = body.slice(4, 10);
  const computed = checkDigit(body);

  if (normalized.length === 10) {
    // Kontrol hanesi verilmemiş — hesapla ve döndür
    return { ok: true, normalized, ownerCode, category, serial, computedCheck: computed };
  }

  const given = Number(normalized[10]);
  return {
    ok: given === computed,
    normalized,
    ownerCode,
    category,
    serial,
    givenCheck: given,
    computedCheck: computed,
    error:
      given === computed
        ? undefined
        : `Kontrol hanesi uyuşmuyor: ${given} girildi, ${computed} olmalı.`,
  };
}

/** Görüntüleme biçimi: MSCU 739428-4 */
export function formatContainerNo(normalized: string): string {
  const s = normalized.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length < 10) return s;
  return `${s.slice(0, 4)} ${s.slice(4, 10)}${s.length > 10 ? '-' + s[10] : ''}`;
}
