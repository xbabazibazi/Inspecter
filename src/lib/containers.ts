/**
 * Konteyner referans verisi.
 *
 * DİKKAT: Bu değerler NOMİNALDİR. Gerçek iç ölçüler imalatçıya, yaşa ve
 * hatta göre ±%2 oynayabilir. Kritik yüklemelerde taşıyıcının kendi
 * konteyner spesifikasyonuyla doğrulayın.
 *
 * Tüm uzunluklar milimetre, ağırlıklar kilogram.
 */

export type ContainerId =
  | '20dv'
  | '40dv'
  | '40hc'
  | '45hc'
  | '20rf'
  | '40rfhc';

export interface ContainerSpec {
  id: ContainerId;
  name: string;
  /** İç uzunluk (mm) */
  L: number;
  /** İç genişlik (mm) */
  W: number;
  /** İç yükseklik (mm) */
  H: number;
  /** Kapı genişliği (mm) */
  doorW: number;
  /** Kapı yüksekliği (mm) */
  doorH: number;
  /** Kataloglanan iç hacim (m³) — L·W·H'den küçük olabilir (köşe payları) */
  vol: number;
  /** Azami yük (kg) */
  payload: number;
  /** Dara (kg) */
  tare: number;
  /** Soğutmalı mı */
  reefer: boolean;
}

export const CONTAINERS: ContainerSpec[] = [
  { id: '20dv',   name: "20' DV",    L: 5898,  W: 2352, H: 2393, doorW: 2340, doorH: 2280, vol: 33.2, payload: 28200, tare: 2230, reefer: false },
  { id: '40dv',   name: "40' DV",    L: 12032, W: 2352, H: 2393, doorW: 2340, doorH: 2280, vol: 67.7, payload: 26700, tare: 3750, reefer: false },
  { id: '40hc',   name: "40' HC",    L: 12032, W: 2352, H: 2698, doorW: 2340, doorH: 2585, vol: 76.4, payload: 26500, tare: 3900, reefer: false },
  { id: '45hc',   name: "45' HC",    L: 13556, W: 2352, H: 2698, doorW: 2340, doorH: 2585, vol: 86.0, payload: 25600, tare: 4800, reefer: false },
  { id: '20rf',   name: "20' RF",    L: 5449,  W: 2290, H: 2244, doorW: 2290, doorH: 2220, vol: 28.0, payload: 27400, tare: 3000, reefer: true },
  { id: '40rfhc', name: "40' RF HC", L: 11577, W: 2286, H: 2500, doorW: 2280, doorH: 2460, vol: 66.0, payload: 25500, tare: 4600, reefer: true },
];

export const byId = (id: string): ContainerSpec | undefined =>
  CONTAINERS.find((c) => c.id === id);

/** Geometrik iç hacim (m³) — kataloglanan `vol` yerine hesap için kullanılır. */
export const geometricVolume = (c: ContainerSpec): number =>
  (c.L * c.W * c.H) / 1e9;
