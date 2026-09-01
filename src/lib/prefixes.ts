/**
 * Yaygın konteyner sahip kodları (BIC prefix'leri).
 *
 * DİKKAT: Bu liste eksiktir ve yalnızca en sık karşılaşılan kodları içerir.
 * Tam ve güncel kayıt BIC'tedir (bic-code.org). Sahiplik el değiştirebilir;
 * eski numaralar devralınan hat adıyla dolaşımda kalabilir.
 */

export interface PrefixOwner {
  owner: string;
  note?: string;
}

export const PREFIXES: Record<string, PrefixOwner> = {
  MSC: { owner: 'MSC' },
  MED: { owner: 'MSC' },
  MSD: { owner: 'MSC' },
  MAE: { owner: 'Maersk' },
  MSK: { owner: 'Maersk' },
  MRK: { owner: 'Maersk' },
  MRS: { owner: 'Maersk' },
  SEA: { owner: 'Sealand', note: 'Maersk grubu' },
  SUD: { owner: 'Hamburg Süd', note: 'Maersk grubu' },
  CMA: { owner: 'CMA CGM' },
  CGM: { owner: 'CMA CGM' },
  ECM: { owner: 'CMA CGM' },
  APL: { owner: 'APL', note: 'CMA CGM grubu' },
  ANN: { owner: 'ANL', note: 'CMA CGM grubu' },
  COS: { owner: 'COSCO' },
  CBH: { owner: 'COSCO' },
  CCL: { owner: 'COSCO' },
  OOL: { owner: 'OOCL', note: 'COSCO grubu' },
  OOC: { owner: 'OOCL', note: 'COSCO grubu' },
  HLC: { owner: 'Hapag-Lloyd' },
  HLX: { owner: 'Hapag-Lloyd' },
  UAC: { owner: 'UASC', note: 'Hapag-Lloyd ile birleşti' },
  ONE: { owner: 'ONE' },
  NYK: { owner: 'NYK', note: 'ONE öncesi' },
  MOL: { owner: 'MOL', note: 'ONE öncesi' },
  KKL: { owner: '"K" Line', note: 'ONE öncesi' },
  EGH: { owner: 'Evergreen' },
  EIS: { owner: 'Evergreen' },
  EGS: { owner: 'Evergreen' },
  EMC: { owner: 'Evergreen' },
  YML: { owner: 'Yang Ming' },
  YMM: { owner: 'Yang Ming' },
  HMM: { owner: 'HMM' },
  HDM: { owner: 'HMM', note: 'Hyundai Merchant Marine' },
  ZIM: { owner: 'ZIM' },
  ZCS: { owner: 'ZIM' },
  PIL: { owner: 'PIL' },
  WHL: { owner: 'Wan Hai' },
  SIT: { owner: 'SITC' },
  ARK: { owner: 'Arkas', note: 'Türkiye' },
  TCL: { owner: 'Triton', note: 'kiralama' },
  TCN: { owner: 'Triton', note: 'kiralama' },
  TRH: { owner: 'Triton', note: 'kiralama' },
  TGH: { owner: 'Textainer', note: 'kiralama' },
  TEM: { owner: 'Textainer', note: 'kiralama' },
  CAI: { owner: 'CAI', note: 'kiralama' },
  FCI: { owner: 'Florens', note: 'kiralama' },
  DFS: { owner: 'Florens', note: 'kiralama' },
  GES: { owner: 'Seaco', note: 'kiralama' },
  BMO: { owner: 'Beacon', note: 'kiralama' },
};

export function lookupPrefix(code: string): PrefixOwner | undefined {
  return PREFIXES[code.toUpperCase().slice(0, 3)];
}
