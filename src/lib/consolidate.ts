/**
 * Konsolidasyon (groupage) yerleşimi — öncelik sıralı, üst üste yığmalı sütun paketleme.
 *
 * Tam 3D bin-packing değil, ama pier2pier tarzı "her kalem kendi uzunluk dilimini
 * kaplar" modelinden daha verimli: kalemler, dizideki sırayla (öncelik) işlenir. Bir
 * kalem ekipmanın tam yüksekliğini doldurmazsa, o uzunluk dilimindeki (sütundaki)
 * kalan yükseklik sıradaki — daha düşük öncelikli — kalemlere açık kalır; onlar aynı
 * sütunda üst üste yerleşebilir. Böylece boşuna uzunluk harcanmaz. Yalnızca mevcut
 * sütunlarda yer kalmayınca yeni bir uzunluk dilimi açılır. `loadcalc.ts`'teki
 * `orientations()` fonksiyonu yeniden kullanılıyor.
 *
 * Tüm uzunluklar mm, ağırlıklar kg.
 */

import type { EquipmentSpec } from './equipment';
import { orientations, type Carton } from './loadcalc';

export interface LineItem {
  id: string;
  label: string;
  /** mm */
  l: number;
  /** mm */
  w: number;
  /** mm */
  h: number;
  /** Birim başına brüt ağırlık (kg) */
  grossKg: number;
  qty: number;
  maxStack?: number;
  thisSideUp?: boolean;
}

export interface PlacedItemBlock {
  item: LineItem;
  /** Bloğun ekipman tabanındaki uzunluk ekseni başlangıcı (mm) */
  x: number;
  /** Bloğun taban seviyesinden yükseklik ekseni başlangıcı (mm) — üst üste yığmada 0'dan büyük olabilir */
  y: number;
  /** Seçilen yönelim (mm) */
  bl: number;
  bw: number;
  bh: number;
  /** Genişlik boyunca adet */
  ny: number;
  /** Bu blokta üst üste konan kat sayısı */
  nz: number;
  /** Bloğun kapladığı uzunluk (mm) = bl */
  length: number;
}

export interface ConsolidationResult {
  equipment: EquipmentSpec;
  blocks: PlacedItemBlock[];
  /** Hiçbir yönelimde genişlik×yüksekliğe sığmayan kalemler */
  unfitItems: LineItem[];
  totalLengthUsed: number;
  lengthOverflow: number;
  /** 0–1, 1'i aşabilir (taşma durumunda) */
  lengthUtil: number;
  totalWeight: number;
  weightOverflow: number;
  /** 0–1, 1'i aşabilir (taşma durumunda) */
  weightUtil: number;
  boundBy: 'length' | 'weight' | 'none';
  /** Yerleşen kargonun net hacmi (mm³) — sığmayan kalemler hariç */
  cargoVolume: number;
  /** Kasanın kullanılan bölümünün zarf hacmi (mm³): kullanılan uzunluk × kasa kesiti */
  usedEnvelopeVolume: number;
  /** Fire: zarf − kargo (mm³). Genişlik/yükseklik/eksik sıra boşluklarının toplamı */
  voidVolume: number;
  /** 0–1, kullanılan zarf içindeki fire oranı */
  voidRatio: number;
  /** Uygulanan fire payı (0–1) — uzunluk/ağırlık limitleri bu oranda kısılmıştır */
  allowance: number;
}

/** Bir bloğun 3B kutusu (mm). `boxFromBlock` ile üretilir; elle taşımada x/z geçersiz kılınabilir. */
export interface Box3 {
  x0: number; x1: number;
  y0: number; y1: number;
  z0: number; z1: number;
}

/** Bir bloğun kutusunu üretir. `x`/`y`/`zOffset` verilirse otomatik konum yerine kullanılır (elle taşıma önizlemesi). */
export function boxFromBlock(block: PlacedItemBlock, x = block.x, zOffset = 0, y = block.y): Box3 {
  return {
    x0: x, x1: x + block.length,
    y0: y, y1: y + block.nz * block.bh,
    z0: zOffset, z1: zOffset + block.ny * block.bw,
  };
}

/** İki kutu 3B olarak kesişiyor mu (temas etmek yetmez, gerçek örtüşme gerekir). */
export function boxesOverlap(a: Box3, b: Box3): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1
    && a.y0 < b.y1 && b.y0 < a.y1
    && a.z0 < b.z1 && b.z0 < a.z1;
}

const clampMm = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/**
 * Elle bırakılan blok için geçerli konum bulur. Denenen konum serbestse aynen döner;
 * bir blokla çakışıyorsa geri fırlatmak yerine, çakışan her kutunun dört kenarına
 * tek eksenli "itme" adayları üretilir ve ekipman sınırı içinde kalan, hiçbir blokla
 * çakışmayan, denenen noktaya en yakın aday seçilir — blok hedefin hemen yanına oturur.
 * Hiçbir aday uymuyorsa null döner (çağıran son geçerli konumu korur).
 */
export function resolvePlacement(
  block: PlacedItemBlock,
  x: number,
  z: number,
  y: number,
  others: Box3[],
  equipment: EquipmentSpec,
): { x: number; z: number } | null {
  const occW = block.ny * block.bw;
  const maxX = equipment.L - block.length;
  const maxZ = equipment.W - occW;
  const cx = clampMm(x, 0, maxX);
  const cz = clampMm(z, 0, maxZ);

  const fits = (px: number, pz: number) =>
    !others.some((ob) => boxesOverlap(boxFromBlock(block, px, pz, y), ob));

  if (fits(cx, cz)) return { x: cx, z: cz };

  const attempted = boxFromBlock(block, cx, cz, y);
  const candidates: Array<{ x: number; z: number }> = [];
  for (const ob of others) {
    if (!boxesOverlap(attempted, ob)) continue;
    candidates.push({ x: ob.x1, z: cz });                // sağ kenarına
    candidates.push({ x: ob.x0 - block.length, z: cz }); // sol kenarına
    candidates.push({ x: cx, z: ob.z1 });                // ön kenarına
    candidates.push({ x: cx, z: ob.z0 - occW });         // arka kenarına
  }

  let best: { x: number; z: number } | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    if (c.x < 0 || c.x > maxX || c.z < 0 || c.z > maxZ) continue;
    if (!fits(c.x, c.z)) continue;
    const d = (c.x - cx) ** 2 + (c.z - cz) ** 2;
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
}

interface Fit {
  bl: number;
  bw: number;
  bh: number;
  ny: number;
  nz: number;
  capacity: number;
}

interface Column {
  x: number;
  length: number;
  usedHeight: number;
}

/** Sabit bir uzunluk sınırı (ör. mevcut sütunun derinliği) içinde en çok adet sığdıran yönelimi bulur. */
function bestFit(
  orients: Array<[number, number, number]>,
  maxLength: number,
  maxHeight: number,
  W: number,
  maxLayers: number,
): Fit | null {
  let best: Fit | null = null;
  for (const [bl, bw, bh] of orients) {
    if (bl > maxLength || bh > maxHeight || bw > W) continue;
    const ny = Math.floor(W / bw);
    const nz = Math.min(Math.floor(maxHeight / bh), maxLayers);
    if (ny < 1 || nz < 1) continue;
    const capacity = ny * nz;
    if (!best || capacity > best.capacity) best = { bl, bw, bh, ny, nz, capacity };
  }
  return best;
}

/**
 * Yeni bir sütun açarken uzunluk serbest seçilebildiği için hedef farklıdır: kapasiteyi
 * değil, verilen adet için gereken toplam uzunluğu (⌈qty/kapasite⌉ × bl) minimize eden
 * yönelim aranır — aynı kapasiteyi daha kısa bir derinlikle veren yönelim tercih edilir.
 */
function bestNewColumnFit(
  orients: Array<[number, number, number]>,
  qty: number,
  maxHeight: number,
  W: number,
  maxLayers: number,
): Fit | null {
  let best: (Fit & { neededLength: number }) | null = null;
  for (const [bl, bw, bh] of orients) {
    if (bh > maxHeight || bw > W) continue;
    const ny = Math.floor(W / bw);
    const nz = Math.min(Math.floor(maxHeight / bh), maxLayers);
    if (ny < 1 || nz < 1) continue;
    const capacity = ny * nz;
    const neededLength = Math.ceil(qty / capacity) * bl;
    if (!best || neededLength < best.neededLength) best = { bl, bw, bh, ny, nz, capacity, neededLength };
  }
  return best;
}

/**
 * Kalemleri öncelik sırasıyla (dizideki sıra = öncelik), üst üste yığarak yerleştirir.
 *
 * `allowance` (fire payı, 0–1): ambalaj şişmesi, ayırıcı ve bağlama gibi hesaplanamayan
 * saha kayıpları için ihtiyat payı. Yerleşim geometrisini DEĞİŞTİRMEZ; yalnızca uzunluk
 * ve ağırlık limitlerini o oranda kısar — doluluk ve taşma uyarıları erken tetiklenir.
 */
export function placeItems(
  equipment: EquipmentSpec,
  items: LineItem[],
  allowance = 0,
): ConsolidationResult {
  const columns: Column[] = [];
  const blocks: PlacedItemBlock[] = [];
  const unfitItems: LineItem[] = [];
  let cursor = 0;

  for (const item of items) {
    if (item.qty <= 0) continue;

    const carton: Carton = {
      l: item.l, w: item.w, h: item.h, grossKg: item.grossKg,
      maxStack: item.maxStack, thisSideUp: item.thisSideUp,
    };
    const orients = orientations(carton);
    const maxLayers = item.maxStack && item.maxStack > 0 ? item.maxStack : Infinity;

    if (!bestFit(orients, Infinity, equipment.H, equipment.W, maxLayers)) {
      unfitItems.push(item);
      continue;
    }

    let remaining = item.qty;
    const layersPlacedInColumn = new Map<Column, number>();

    while (remaining > 0) {
      // Önce mevcut sütunlardaki kalan yüksekliğe (öncekilerin bıraktığı boşluğa) sığdırmayı dene.
      for (const col of columns) {
        if (remaining <= 0) break;
        const leftoverH = equipment.H - col.usedHeight;
        if (leftoverH <= 0) continue;
        const already = layersPlacedInColumn.get(col) ?? 0;
        const allowedLayers = maxLayers - already;
        if (allowedLayers <= 0) continue;

        const fit = bestFit(orients, col.length, leftoverH, equipment.W, allowedLayers);
        if (!fit) continue;

        const placeQty = Math.min(remaining, fit.capacity);
        const nzUsed = Math.ceil(placeQty / fit.ny);
        blocks.push({ item, x: col.x, y: col.usedHeight, bl: fit.bl, bw: fit.bw, bh: fit.bh, ny: fit.ny, nz: nzUsed, length: fit.bl });
        col.usedHeight += nzUsed * fit.bh;
        layersPlacedInColumn.set(col, already + nzUsed);
        remaining -= placeQty;
      }

      if (remaining <= 0) break;

      // Mevcut sütunlarda yer kalmadı — yeni bir uzunluk dilimi (sütun) aç.
      const fit = bestNewColumnFit(orients, remaining, equipment.H, equipment.W, maxLayers)!;
      const placeQty = Math.min(remaining, fit.capacity);
      const nzUsed = Math.ceil(placeQty / fit.ny);
      const col: Column = { x: cursor, length: fit.bl, usedHeight: nzUsed * fit.bh };
      columns.push(col);
      layersPlacedInColumn.set(col, nzUsed);
      blocks.push({ item, x: cursor, y: 0, bl: fit.bl, bw: fit.bw, bh: fit.bh, ny: fit.ny, nz: nzUsed, length: fit.bl });
      cursor += fit.bl;
      remaining -= placeQty;
    }
  }

  const totalLengthUsed = cursor;
  const totalWeight = items.reduce((s, it) => s + Math.max(0, it.qty) * it.grossKg, 0);

  const safeAllowance = Math.min(Math.max(allowance, 0), 0.5);
  const effectiveL = equipment.L * (1 - safeAllowance);
  const effectivePayload = equipment.payload * (1 - safeAllowance);

  const lengthOverflow = Math.max(0, totalLengthUsed - effectiveL);
  const weightOverflow = Math.max(0, totalWeight - effectivePayload);

  let boundBy: ConsolidationResult['boundBy'] = 'none';
  if (lengthOverflow > 0 && weightOverflow > 0) {
    const lengthRatio = effectiveL > 0 ? lengthOverflow / effectiveL : 0;
    const weightRatio = effectivePayload > 0 ? weightOverflow / effectivePayload : 0;
    boundBy = lengthRatio >= weightRatio ? 'length' : 'weight';
  } else if (lengthOverflow > 0) {
    boundBy = 'length';
  } else if (weightOverflow > 0) {
    boundBy = 'weight';
  }

  // Fire: kasanın kullanılan bölümü (uzunluk × tam kesit) ile gerçekten yüklenen kargo
  // hacmi arasındaki fark. Genişlik şeridi, sütun tepesi ve eksik son sıra boşluklarının
  // tamamını kapsar — blok verisinden kesin çıkar, varsayım içermez.
  const unfitSet = new Set(unfitItems);
  const cargoVolume = items.reduce(
    (s, it) => (unfitSet.has(it) ? s : s + Math.max(0, it.qty) * it.l * it.w * it.h),
    0,
  );
  const usedEnvelopeVolume = totalLengthUsed * equipment.W * equipment.H;
  const voidVolume = Math.max(0, usedEnvelopeVolume - cargoVolume);

  return {
    equipment,
    blocks,
    unfitItems,
    totalLengthUsed,
    lengthOverflow,
    lengthUtil: effectiveL > 0 ? totalLengthUsed / effectiveL : 0,
    totalWeight,
    weightOverflow,
    weightUtil: effectivePayload > 0 ? totalWeight / effectivePayload : 0,
    boundBy,
    cargoVolume,
    usedEnvelopeVolume,
    voidVolume,
    voidRatio: usedEnvelopeVolume > 0 ? voidVolume / usedEnvelopeVolume : 0,
    allowance: safeAllowance,
  };
}
