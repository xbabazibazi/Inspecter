/**
 * Yükleme hesaplayıcı — katman sezgiseli + artık şerit doldurma.
 *
 * Tam 3B bin-packing NP-zordur. Bu modül daha dar ama pratikte
 * ihracatçının gerçekten sorduğu soruyu çözer: tek tip koli, eksen hizalı
 * yerleşim, dikey istifleme sınırı, ağırlık tavanı.
 *
 * Yöntem:
 *  1. Kolinin izinli yönelimlerini üret (6, "bu taraf yukarı" ise 2).
 *  2. Her yönelim için ana blok: nx·ny·nz.
 *  3. Uzunluk ve genişlik yönündeki artık şeritleri ikinci bir yönelimle
 *     doldurmayı dene (bir seviye derinlik — köşe bloğu çift sayılmaz).
 *  4. Ağırlık tavanını uygula, hangi kısıtın bağladığını raporla.
 *
 * Tüm uzunluklar mm, ağırlıklar kg.
 */

import { CONTAINERS, ContainerSpec, geometricVolume } from './containers';

export interface Carton {
  /** mm */
  l: number;
  /** mm */
  w: number;
  /** mm */
  h: number;
  /** Koli başına brüt ağırlık (kg) */
  grossKg: number;
  /** Üst üste kaç koli konulabilir (dikey adet). 0 / undefined = sınırsız */
  maxStack?: number;
  /** true ise koli devrilemez: dikey eksen sabit, yalnız yatay 90° dönüş */
  thisSideUp?: boolean;
}

export interface Block {
  /** Bloğun konteyner tabanındaki başlangıcı (mm) */
  x: number;
  y: number;
  /** Bu bloktaki kolinin yönelimi (mm) */
  bl: number;
  bw: number;
  bh: number;
  nx: number;
  ny: number;
  nz: number;
  main: boolean;
}

export interface RegionFit {
  count: number;
  blocks: Block[];
}

export interface LoadResult {
  container: ContainerSpec;
  /** Yerleşen koli adedi (ağırlık tavanı uygulanmış) */
  cartons: number;
  /** Ağırlık tavanı olmasa yerleşecek adet */
  cartonsByVolume: number;
  /** Ağırlıkça izin verilen azami adet */
  cartonsByWeight: number;
  /** Hangi kısıt bağlıyor */
  boundBy: 'volume' | 'weight' | 'none';
  /** 0–1 */
  volUtil: number;
  /** 0–1 */
  wtUtil: number;
  /** Yüklenen brüt ağırlık (kg) */
  grossKg: number;
  /** Yüklenen hacim (m³) */
  cbm: number;
  /** Yerleşim blokları (görselleştirme için) — ağırlık kısıtı uygulanmadan önceki plan */
  blocks: Block[];
  /** Koli hiçbir yönelimde kapıdan geçmiyorsa uyarı */
  doorWarning: boolean;
  /** Koli hiçbir yönelimde konteynere sığmıyorsa */
  fits: boolean;
}

/** Kolinin izinli yönelimleri, yinelenenler ayıklanmış. */
export function orientations(c: Carton): Array<[number, number, number]> {
  const { l, w, h } = c;
  const all: Array<[number, number, number]> = c.thisSideUp
    ? [
        [l, w, h],
        [w, l, h],
      ]
    : [
        [l, w, h],
        [w, l, h],
        [l, h, w],
        [h, l, w],
        [w, h, l],
        [h, w, l],
      ];
  const seen = new Set<string>();
  return all.filter((o) => {
    const k = o.join('x');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Bir dikdörtgen prizma bölgeye kaç koli sığar.
 * `allowRemainder` false ise artık şeritler denenmez (özyineleme bir seviye).
 */
export function packRegion(
  L: number,
  W: number,
  H: number,
  carton: Carton,
  allowRemainder = true,
): RegionFit {
  const maxStack =
    carton.maxStack && carton.maxStack > 0 ? carton.maxStack : Infinity;
  let best: RegionFit = { count: 0, blocks: [] };

  for (const [bl, bw, bh] of orientations(carton)) {
    if (bl > L || bw > W || bh > H) continue;

    const nx = Math.floor(L / bl);
    const ny = Math.floor(W / bw);
    const nz = Math.min(Math.floor(H / bh), maxStack);
    if (nx < 1 || ny < 1 || nz < 1) continue;

    const blocks: Block[] = [
      { x: 0, y: 0, bl, bw, bh, nx, ny, nz, main: true },
    ];
    let total = nx * ny * nz;

    if (allowRemainder) {
      const usedL = nx * bl;
      const usedW = ny * bw;
      const RL = L - usedL;
      const RW = W - usedW;

      // Bölge A: kalan uzunluk × tam genişlik
      if (RL > 0) {
        const r = packRegion(RL, W, H, carton, false);
        if (r.count > 0) {
          total += r.count;
          for (const b of r.blocks) blocks.push({ ...b, x: b.x + usedL, main: false });
        }
      }
      // Bölge B: kullanılan uzunluk × kalan genişlik  (köşe A'ya ait, çift sayılmaz)
      if (RW > 0) {
        const r = packRegion(usedL, RW, H, carton, false);
        if (r.count > 0) {
          total += r.count;
          for (const b of r.blocks) blocks.push({ ...b, y: b.y + usedW, main: false });
        }
      }
    }

    if (total > best.count) best = { count: total, blocks };
  }

  return best;
}

/** Tek bir konteyner tipi için sonuç. */
export function fitContainer(
  container: ContainerSpec,
  carton: Carton,
): LoadResult {
  const fit = packRegion(container.L, container.W, container.H, carton);
  const cartonsByVolume = fit.count;

  const cartonsByWeight =
    carton.grossKg > 0
      ? Math.floor(container.payload / carton.grossKg)
      : Infinity;

  const cartons = Math.min(cartonsByVolume, cartonsByWeight);

  const boxCbm = (carton.l * carton.w * carton.h) / 1e9;
  const contCbm = geometricVolume(container);

  // Kapı kontrolü: en az bir yönelim kapıdan geçmeli
  const passesDoor = orientations(carton).some(
    ([bl, bw, bh]) =>
      (bw <= container.doorW && bh <= container.doorH) ||
      (bl <= container.doorW && bh <= container.doorH),
  );

  let boundBy: LoadResult['boundBy'] = 'none';
  if (cartons > 0) {
    boundBy = cartonsByWeight < cartonsByVolume ? 'weight' : 'volume';
  }

  return {
    container,
    cartons,
    cartonsByVolume,
    cartonsByWeight: Number.isFinite(cartonsByWeight) ? cartonsByWeight : 0,
    boundBy,
    volUtil: contCbm > 0 ? (cartons * boxCbm) / contCbm : 0,
    wtUtil: container.payload > 0 ? (cartons * carton.grossKg) / container.payload : 0,
    grossKg: cartons * carton.grossKg,
    cbm: cartons * boxCbm,
    blocks: fit.blocks,
    doorWarning: cartonsByVolume > 0 && !passesDoor,
    fits: cartons > 0,
  };
}

/** Tüm konteyner tipleri için sonuç. */
export function fitAll(
  carton: Carton,
  ids?: string[],
): LoadResult[] {
  const list = ids ? CONTAINERS.filter((c) => ids.includes(c.id)) : CONTAINERS;
  return list.map((c) => fitContainer(c, carton));
}

export interface OrderPlan extends LoadResult {
  /** Sipariş için gereken konteyner adedi */
  containersNeeded: number;
  /** Son konteynerdeki koli adedi */
  lastContainerCartons: number;
  /** Son konteynerin hacim doluluğu (0–1) */
  lastVolUtil: number;
  /** Varsa toplam navlun */
  totalFreight?: number;
}

/**
 * Belirli bir koli adedi için konteyner ihtiyacı.
 * `rates` verilirse (konteyner id → birim navlun) toplam maliyet de hesaplanır.
 */
export function planOrder(
  carton: Carton,
  totalCartons: number,
  ids?: string[],
  rates?: Record<string, number>,
): OrderPlan[] {
  return fitAll(carton, ids)
    .filter((r) => r.fits)
    .map((r) => {
      const containersNeeded = Math.ceil(totalCartons / r.cartons);
      const lastContainerCartons =
        totalCartons - (containersNeeded - 1) * r.cartons;
      const boxCbm = (carton.l * carton.w * carton.h) / 1e9;
      const contCbm = geometricVolume(r.container);
      const rate = rates?.[r.container.id];
      return {
        ...r,
        containersNeeded,
        lastContainerCartons,
        lastVolUtil: (lastContainerCartons * boxCbm) / contCbm,
        totalFreight: rate && rate > 0 ? rate * containersNeeded : undefined,
      };
    });
}
