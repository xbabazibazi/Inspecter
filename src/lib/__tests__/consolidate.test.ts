import { describe, expect, it } from 'vitest';
import type { EquipmentSpec } from '../equipment';
import { equipmentById } from '../equipment';
import { boxesOverlap, boxFromBlock, placeItems, resolvePlacement, type LineItem } from '../consolidate';

const EQ: EquipmentSpec = {
  id: 'test-eq', name: 'Test ekipmanı', kind: 'trailer',
  L: 10000, W: 2000, H: 2000,
  doorW: 2000, doorH: 2000,
  vol: 40, payload: 10000, tare: 1000, reefer: false,
};

const item = (over: Partial<LineItem>): LineItem => ({
  id: 'i1', label: 'test', l: 500, w: 500, h: 500, grossKg: 10, qty: 1, ...over,
});

describe('placeItems — tek kalem', () => {
  it('genişlik ve yüksekliğe tam bölünen adet tek sütunda tam dolar', () => {
    // W=2000/500=4 taban, H=2000/500=4 kat -> kapasite=16, qty=16 -> tek blok, tek sütun
    const r = placeItems(EQ, [item({ qty: 16 })]);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0].y).toBe(0);
    expect(r.totalLengthUsed).toBe(500);
  });

  it('kapasiteyi aşan adet ikinci sütuna taşar', () => {
    const r = placeItems(EQ, [item({ qty: 17 })]);
    expect(r.totalLengthUsed).toBe(1000); // iki 500mm sütun
    expect(r.blocks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('placeItems — üst üste yığma (öncelik sıralı)', () => {
  // A: 1000×1000×500, thisSideUp — tek yönelim, W=2000'e 2×, H=2000'e 4 kat sığar (kapasite 8)
  const a = (): LineItem => item({
    id: 'a', label: 'A', l: 1000, w: 1000, h: 500, grossKg: 5, qty: 4, thisSideUp: true,
  });
  // B: 1000×1000×1000, thisSideUp — W=2000'e 2×, H=2000'e 2 kat sığar (kapasite 4)
  const b = (): LineItem => item({
    id: 'b', label: 'B', l: 1000, w: 1000, h: 1000, grossKg: 8, qty: 2, thisSideUp: true,
  });

  it('düşük öncelikli kalem, yüksek öncelikli kalemin bıraktığı boşluğa üst üste yerleşir', () => {
    const r = placeItems(EQ, [a(), b()]);
    // A 4 adetle 2 kat (1000mm yükseklik) kullanır, kalan 1000mm B'ye tam yeter — yeni sütun açılmaz
    expect(r.totalLengthUsed).toBe(1000);
    expect(r.blocks).toHaveLength(2);

    const blockA = r.blocks.find((bl) => bl.item.id === 'a')!;
    const blockB = r.blocks.find((bl) => bl.item.id === 'b')!;
    expect(blockA.y).toBe(0);
    expect(blockB.y).toBe(1000); // A'nın üstüne
    expect(blockA.x).toBe(blockB.x); // aynı uzunluk dilimi
  });

  it('öncelik sırası değişince kim altta kim üstte olduğu da değişir', () => {
    const r = placeItems(EQ, [b(), a()]);
    expect(r.totalLengthUsed).toBe(1000); // verim aynı, sıra farklı
    const blockA = r.blocks.find((bl) => bl.item.id === 'a')!;
    const blockB = r.blocks.find((bl) => bl.item.id === 'b')!;
    expect(blockB.y).toBe(0);
    expect(blockA.y).toBe(1000);
  });

  it('azami kat sınırı üst üste yığmada da geçerli kalır', () => {
    // maxStack=1: 2000/500=4 kat sığardı ama her sütunda yalnız 1 kat kendi üstüne konabilir
    const r = placeItems(EQ, [item({ l: 1000, w: 1000, h: 500, thisSideUp: true, maxStack: 1, qty: 3 })]);
    const distinctColumns = new Set(r.blocks.map((bl) => bl.x)).size;
    expect(distinctColumns).toBe(2); // kapasite/sütun=2 (ny=2×kat=1), 3 adet için 2 sütun gerekir
    for (const bl of r.blocks) expect(bl.nz).toBe(1);
  });

  it('bloklar 3B olarak birbiriyle çakışmaz', () => {
    const r = placeItems(EQ, [
      item({ id: 'x', l: 700, w: 400, h: 300, qty: 12 }),
      item({ id: 'y', l: 300, w: 300, h: 500, qty: 8 }),
      item({ id: 'z', l: 500, w: 1000, h: 200, qty: 5 }),
    ]);
    for (let i = 0; i < r.blocks.length; i++) {
      for (let j = i + 1; j < r.blocks.length; j++) {
        expect(boxesOverlap(boxFromBlock(r.blocks[i]), boxFromBlock(r.blocks[j]))).toBe(false);
      }
    }
  });

  it('bir kalemin tüm bloklarındaki toplam adet qty ile eşleşir', () => {
    const target = item({ id: 'q', l: 400, w: 300, h: 250, qty: 37 });
    const r = placeItems(EQ, [target]);
    const totalPlaced = r.blocks
      .filter((bl) => bl.item.id === 'q')
      .reduce((s, bl) => s + bl.ny * bl.nz, 0);
    // kapasite tam qty'ye denk gelmeyebilir (son blok fazla kapasiteli olabilir), ama en az qty kadar yer olmalı
    expect(totalPlaced).toBeGreaterThanOrEqual(37);
  });
});

describe('placeItems — sığmayan kalem', () => {
  it('genişlik veya yüksekliğe hiçbir yönelimde sığmayan kalem unfitItems\'a düşer', () => {
    const r = placeItems(EQ, [item({ id: 'huge', l: 5000, w: 5000, h: 5000, qty: 1 })]);
    expect(r.blocks).toHaveLength(0);
    expect(r.unfitItems).toHaveLength(1);
    expect(r.unfitItems[0].id).toBe('huge');
  });

  it('qty=0 olan kalem hem bloğa hem unfitItems\'a düşmez', () => {
    const r = placeItems(EQ, [item({ qty: 0 })]);
    expect(r.blocks).toHaveLength(0);
    expect(r.unfitItems).toHaveLength(0);
  });
});

describe('placeItems — taşma tespiti', () => {
  it('toplam uzunluk ekipmanı aşarsa lengthOverflow > 0 ve boundBy length', () => {
    const r = placeItems(EQ, [item({ qty: 16 * 25 })]); // 25 sütun -> 12500mm > 10000mm
    expect(r.lengthOverflow).toBeGreaterThan(0);
    expect(r.boundBy).toBe('length');
  });

  it('toplam ağırlık payloadı aşarsa weightOverflow > 0 ve boundBy weight', () => {
    const r = placeItems(EQ, [item({ qty: 16, grossKg: 1000 })]); // 16*1000=16000 > 10000
    expect(r.weightOverflow).toBeGreaterThan(0);
    expect(r.boundBy).toBe('weight');
  });

  it('taşma yoksa boundBy none', () => {
    const r = placeItems(EQ, [item({ qty: 4, grossKg: 10 })]);
    expect(r.lengthOverflow).toBe(0);
    expect(r.weightOverflow).toBe(0);
    expect(r.boundBy).toBe('none');
  });
});

describe('placeItems — fire (boşluk) hesabı', () => {
  it('kesiti tam dolduran yük fire vermez', () => {
    // 16 adet 500³: 4 taban × 4 kat, tek 500mm sütun → zarf 500×2000×2000 = kargo hacmi
    const r = placeItems(EQ, [item({ qty: 16 })]);
    expect(r.usedEnvelopeVolume).toBe(500 * 2000 * 2000);
    expect(r.voidVolume).toBe(0);
    expect(r.voidRatio).toBe(0);
  });

  it('eksik son sıra fire olarak görünür', () => {
    // 13 adet: sütun yine 500mm ama 3 kolilik yer boş → fire = 3 × 0,125 m³
    const r = placeItems(EQ, [item({ qty: 13 })]);
    expect(r.cargoVolume).toBe(13 * 500 * 500 * 500);
    expect(r.voidVolume).toBe(3 * 500 * 500 * 500);
    expect(r.voidRatio).toBeCloseTo(3 / 16, 5);
  });

  it('sığmayan kalem kargo hacmine katılmaz', () => {
    const r = placeItems(EQ, [
      item({ id: 'ok', qty: 16 }),
      item({ id: 'huge', l: 5000, w: 5000, h: 5000, qty: 2 }),
    ]);
    expect(r.cargoVolume).toBe(16 * 500 * 500 * 500);
  });

  it('silindir kalemde gerçek hacim kutu zarfının π/4\'ü kadardır', () => {
    const r = placeItems(EQ, [item({ qty: 16, shape: 'cylinder' })]);
    expect(r.cargoVolume).toBeCloseTo(16 * 500 * 500 * 500 * (Math.PI / 4), 5);
    // Yerleşim zarfı (fire hesabının diğer ucu) hâlâ tam kutu gibi hesaplanır — konservatif.
    expect(r.usedEnvelopeVolume).toBe(500 * 2000 * 2000);
    expect(r.voidVolume).toBeGreaterThan(0);
  });
});

describe('placeItems — fire payı (allowance)', () => {
  it('fire payı limitleri kısar ama yerleşim geometrisini değiştirmez', () => {
    // 20 sütun × 500mm = 10000mm — paysız tam sığar, %10 payla 1000mm taşar
    const items = [item({ qty: 16 * 20 })];
    const r0 = placeItems(EQ, items);
    const r = placeItems(EQ, items, 0.1);
    expect(r0.lengthOverflow).toBe(0);
    expect(r.lengthOverflow).toBe(1000);
    expect(r.boundBy).toBe('length');
    expect(r.totalLengthUsed).toBe(r0.totalLengthUsed); // geometri aynı
    expect(r.blocks.length).toBe(r0.blocks.length);
  });

  it('fire payı ağırlık tavanını da kısar', () => {
    // 16 × 600kg = 9600 — paysız sığar (payload 10000), %10 payla (9000) 600kg taşar
    const r = placeItems(EQ, [item({ qty: 16, grossKg: 600 })], 0.1);
    expect(r.weightOverflow).toBe(600);
    expect(r.boundBy).toBe('weight');
  });

  it('pay 0–0,5 aralığına kenetlenir', () => {
    expect(placeItems(EQ, [item({ qty: 1 })], -1).allowance).toBe(0);
    expect(placeItems(EQ, [item({ qty: 1 })], 2).allowance).toBe(0.5);
  });
});

describe('boxFromBlock / boxesOverlap — elle taşıma önizlemesi', () => {
  it('varsayılan kutu bloğun otomatik x, z=0 konumunu kullanır', () => {
    const r = placeItems(EQ, [item({ qty: 1 })]);
    const box = boxFromBlock(r.blocks[0]);
    // ny = floor(2000/500) = 4 taban -> z ekseni 4×500=2000mm kaplar
    expect(box).toEqual({ x0: 0, x1: 500, y0: 0, y1: 500, z0: 0, z1: 2000 });
  });

  it('geçersiz kılınan x/z ile taşınmış konum kesişimi doğru hesaplanır', () => {
    // a neredeyse tüm yüksekliği kaplar (leftoverH=100mm) -> b (h=500) sığmaz, ayrı sütun açar
    const r = placeItems(EQ, [
      item({ id: 'a', l: 500, w: 500, h: 1900, thisSideUp: true, qty: 1 }),
      item({ id: 'b', l: 300, w: 300, h: 500, thisSideUp: true, qty: 1 }),
    ]);
    const a = r.blocks.find((bl) => bl.item.id === 'a')!;
    const b = r.blocks.find((bl) => bl.item.id === 'b')!;
    expect(a.x).not.toBe(b.x); // ayrı sütunlar
    // otomatik yerleşimde çakışmıyorlar
    expect(boxesOverlap(boxFromBlock(a), boxFromBlock(b))).toBe(false);
    // a'yı elle b'nin sütununa taşırsak artık çakışmalı
    const movedA = boxFromBlock(a, b.x, 0);
    expect(boxesOverlap(movedA, boxFromBlock(b))).toBe(true);
  });
});

describe('resolvePlacement — elle bırakışta yanına itme', () => {
  // Tek blok üret: 500×1100×500 koli ("bu taraf yukarı"), qty 1 → en kısa dilim
  // yönelimi bl=500 bw=1100 seçilir: blok zarfı 500 uzunluk × 1100 genişlik, ny=1
  const makeBlock = () =>
    placeItems(EQ, [item({ l: 500, w: 1100, h: 500, thisSideUp: true, qty: 1 })]).blocks[0];

  it('serbest konum aynen kabul edilir', () => {
    const b = makeBlock();
    expect(resolvePlacement(b, 3000, 700, 0, [], EQ)).toEqual({ x: 3000, z: 700 });
  });

  it('sınır dışı denenen konum içeri kenetlenir', () => {
    const b = makeBlock();
    // maxX = 10000-500 = 9500, maxZ = 2000-1100 = 900
    expect(resolvePlacement(b, 99999, 99999, 0, [], EQ)).toEqual({ x: 9500, z: 900 });
  });

  it('çakışan bırakış hedef bloğun hemen yanına itilir, başa dönmez', () => {
    const b = makeBlock();
    // Engel: x 2000–2500, z 0–500 arasında bir kutu; tam üstüne (x=2100) bırakılıyor
    const obstacle = { x0: 2000, x1: 2500, y0: 0, y1: 500, z0: 0, z1: 500 };
    const spot = resolvePlacement(b, 2100, 0, 0, [obstacle], EQ)!;
    expect(spot).not.toBeNull();
    // Yanına oturmalı: sol kenar (1500) veya sağ kenar (2500) ya da z kenarı (500)
    const touchesEdge =
      spot.x === 2500 || spot.x === 1500 || spot.z === 500;
    expect(touchesEdge).toBe(true);
    // Ve artık çakışmıyor olmalı
    expect(boxesOverlap(boxFromBlock(b, spot.x, spot.z, 0), obstacle)).toBe(false);
  });

  it('en yakın kenar tercih edilir', () => {
    const b = makeBlock();
    const obstacle = { x0: 2000, x1: 2500, y0: 0, y1: 500, z0: 0, z1: 2000 };
    // x=2450'ye bırakıldı (engelin sağ kenarına çok yakın) → sağa (2500) itilmeli, sola (1500) değil
    const spot = resolvePlacement(b, 2450, 0, 0, [obstacle], EQ)!;
    expect(spot.x).toBe(2500);
  });

  it('hiçbir kenar uymuyorsa null döner (çağıran eski konumu korur)', () => {
    const b = makeBlock();
    // Ekipmanla birebir aynı boyda tek engel: itilecek yer yok
    const wall = { x0: 0, x1: 10000, y0: 0, y1: 2000, z0: 0, z1: 2000 };
    expect(resolvePlacement(b, 5000, 500, 0, [wall], EQ)).toBeNull();
  });
});

describe('equipment veri seti', () => {
  it('treyler ve konteynerler birlikte listelenir', () => {
    expect(equipmentById('13m6-tenteli')?.kind).toBe('trailer');
    expect(equipmentById('40hc')?.kind).toBe('container');
  });

  it('gerçek ekipman verisiyle çok kalemli konsolidasyon çalışır', () => {
    const eq = equipmentById('13m6-tenteli')!;
    const items = [
      item({ id: 'a', l: 1200, w: 800, h: 1000, grossKg: 300, qty: 10 }),
      item({ id: 'b', l: 600, w: 400, h: 400, grossKg: 15, qty: 40 }),
    ];
    const r = placeItems(eq, items);
    const placedIds = new Set(r.blocks.map((bl) => bl.item.id));
    const unfitIds = new Set(r.unfitItems.map((it) => it.id));
    expect(placedIds.size + unfitIds.size).toBe(items.length);
    for (const bl of r.blocks) {
      expect(bl.bw).toBeLessThanOrEqual(eq.W);
      expect(bl.bh).toBeLessThanOrEqual(eq.H);
    }
  });
});
