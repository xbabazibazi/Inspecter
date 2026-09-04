/**
 * Hazır palet ölçüleri — "Palet ekle" bir yerleşim varlığı değil, yalnızca kalem
 * formunu bir kerelik dolduran bir kısayoldur (bkz. ConsolidationPlanner). Seçilince
 * taban ölçüsü palete eşitlenir, yüksekliğe ve ağırlığa palet eklenir; sonrasında
 * normal bir kalem gibi elle düzenlenebilir. Bu yüzden `lib/consolidate.ts`'in
 * yerleşim algoritmasında paletlere özel bir kavram yok — kasıtlı olarak basit.
 *
 * Ölçüler cm, ağırlık (dara) kg — EPAL/ISO 6780 standart palet ölçüleri, nominal.
 */
export interface PalletSpec {
  id: string;
  name: string;
  l: number;
  w: number;
  h: number;
  kg: number;
}

export const PALLETS: PalletSpec[] = [
  { id: 'eur-wood', name: 'EUR ahşap (EPAL1) 120×80', l: 120, w: 80, h: 14.4, kg: 25 },
  { id: 'eur-plastic', name: 'EUR plastik 120×80', l: 120, w: 80, h: 15, kg: 22 },
  { id: 'eur-half', name: 'Yarım EUR (EPAL6) 80×60', l: 80, w: 60, h: 14.4, kg: 12 },
  { id: 'us', name: 'US ahşap 120×100', l: 120, w: 100, h: 15, kg: 25 },
];

export function palletById(id: string): PalletSpec | undefined {
  return PALLETS.find((p) => p.id === id);
}
