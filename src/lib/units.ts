/**
 * Navlun ağırlığı hesapları.
 *
 * LCL (parsiyel deniz): ücret W/M kuralıyla, yani max(m³, ton) üzerinden alınır.
 * Hava kargo: ücret max(brüt kg, hacim ağırlığı) üzerinden alınır;
 *             hacim ağırlığı = cm³ / bölen. IATA standart böleni 6000'dir,
 *             kurye/ekspres taşıyıcılar 5000 kullanabilir — sözleşmene bak.
 */

export interface Dims {
  /** cm */
  l: number;
  /** cm */
  w: number;
  /** cm */
  h: number;
  /** adet */
  qty: number;
  /** koli başına brüt kg */
  grossKg: number;
}

export function cbm(d: Dims): number {
  return (d.l * d.w * d.h * d.qty) / 1e6;
}

export function totalGrossKg(d: Dims): number {
  return d.grossKg * d.qty;
}

export interface SeaLcl {
  cbm: number;
  tons: number;
  /** Faturalanacak W/M birimi */
  chargeable: number;
  basis: 'volume' | 'weight' | 'equal';
}

export function seaLcl(d: Dims): SeaLcl {
  const v = cbm(d);
  const t = totalGrossKg(d) / 1000;
  return {
    cbm: v,
    tons: t,
    chargeable: Math.max(v, t),
    basis: v > t ? 'volume' : t > v ? 'weight' : 'equal',
  };
}

export interface AirFreight {
  grossKg: number;
  volumetricKg: number;
  chargeableKg: number;
  basis: 'volume' | 'weight' | 'equal';
  divisor: number;
}

export function air(d: Dims, divisor = 6000): AirFreight {
  const g = totalGrossKg(d);
  const vol = (d.l * d.w * d.h * d.qty) / divisor;
  return {
    grossKg: g,
    volumetricKg: vol,
    chargeableKg: Math.max(g, vol),
    basis: vol > g ? 'volume' : g > vol ? 'weight' : 'equal',
    divisor,
  };
}

/** Yaygın birim çevrimleri */
export const convert = {
  cmToIn: (v: number) => v / 2.54,
  inToCm: (v: number) => v * 2.54,
  kgToLb: (v: number) => v * 2.20462262,
  lbToKg: (v: number) => v / 2.20462262,
  cbmToCft: (v: number) => v * 35.3146667,
  cftToCbm: (v: number) => v / 35.3146667,
};
