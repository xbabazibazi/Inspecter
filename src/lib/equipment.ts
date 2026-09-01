/**
 * Konsolidasyon aracı için birleşik ekipman veri seti — deniz konteynerleri +
 * karayolu treylerleri.
 *
 * `containers.ts`'teki `CONTAINERS` buraya aynen dahil edilir; o dosyaya dokunulmaz,
 * `/yukleme` aracı bu değişiklikten etkilenmez.
 *
 * DİKKAT — treyler ölçüleri: Sektörde yaygın kabul edilen nominal iç ölçülerdir
 * (üreticiye ve dorse tipine göre ±birkaç cm oynayabilir). Kritik yüklemelerde
 * taşıyıcının kendi dorse spesifikasyonuyla doğrulayın. Burada şu bilgiye ihtiyaç
 * var: gerçek bir nakliyeci/taşıyıcı spesifikasyon sayfasıyla teyit.
 *
 * Tüm uzunluklar milimetre, ağırlıklar kilogram.
 */

import { CONTAINERS, ContainerSpec } from './containers';

export type EquipmentKind = 'container' | 'trailer';

export interface EquipmentSpec extends Omit<ContainerSpec, 'id'> {
  id: string;
  kind: EquipmentKind;
}

const asContainerEquipment: EquipmentSpec[] = CONTAINERS.map((c) => ({
  ...c,
  kind: 'container',
}));

const TRAILERS: EquipmentSpec[] = [
  {
    id: '13m6-tenteli',
    name: "13,6m Tenteli (Standart)",
    kind: 'trailer',
    L: 13600, W: 2480, H: 2700,
    doorW: 2480, doorH: 2700,
    vol: 91.0, payload: 24000, tare: 7000, reefer: false,
  },
  {
    id: '13m6-mega',
    name: "13,6m Mega Tenteli",
    kind: 'trailer',
    L: 13600, W: 2480, H: 3000,
    doorW: 2480, doorH: 3000,
    vol: 101.0, payload: 24000, tare: 7500, reefer: false,
  },
];

export const EQUIPMENT: EquipmentSpec[] = [...TRAILERS, ...asContainerEquipment];

export const equipmentById = (id: string): EquipmentSpec | undefined =>
  EQUIPMENT.find((e) => e.id === id);

/** Geometrik iç hacim (m³). */
export const geometricVolume = (e: EquipmentSpec): number =>
  (e.L * e.W * e.H) / 1e9;
