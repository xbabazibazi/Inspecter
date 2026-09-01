import { describe, expect, it } from 'vitest';
import { CONTAINERS, byId, geometricVolume } from '../containers';
import { fitAll, fitContainer, orientations, packRegion, planOrder, type Carton } from '../loadcalc';

const CUBE: Carton = { l: 500, w: 500, h: 500, grossKg: 1 };

describe('yönelimler', () => {
  it('serbest koli 6, sabit koli 2, küp 1 yönelim verir', () => {
    expect(orientations({ l: 600, w: 400, h: 300, grossKg: 1 })).toHaveLength(6);
    expect(orientations({ l: 600, w: 400, h: 300, grossKg: 1, thisSideUp: true })).toHaveLength(2);
    expect(orientations({ l: 400, w: 400, h: 400, grossKg: 1 })).toHaveLength(1);
  });
});

describe('packRegion — elle doğrulanabilir vakalar', () => {
  it('1m küpe 8 adet yarım-metre küp sığar', () => {
    expect(packRegion(1000, 1000, 1000, CUBE).count).toBe(8);
  });

  it('birebir sığan koli 1 adet verir', () => {
    expect(packRegion(1000, 1000, 1000, { l: 1000, w: 1000, h: 1000, grossKg: 1 }).count).toBe(1);
  });

  it('sığmayan koli 0 verir', () => {
    expect(packRegion(1000, 1000, 1000, { l: 1200, w: 100, h: 100, grossKg: 1 }).count).toBe(0);
  });

  it('istif sınırı "bu taraf yukarı" ile birlikte bağlar', () => {
    const c: Carton = { l: 500, w: 500, h: 200, grossKg: 1, maxStack: 2, thisSideUp: true };
    expect(packRegion(1000, 1000, 1000, c).count).toBe(8); // 2×2 taban × 2 kat
    expect(packRegion(1000, 1000, 1000, { ...c, maxStack: 0 }).count).toBe(20); // 5 kat
  });

  it('koli devrilebiliyorsa daha iyi yönelim bulunabilir', () => {
    // 500×500×200 yatırılırsa 500×200 taban → 2×5 = 10 taban, 2 kat = 20
    const c: Carton = { l: 500, w: 500, h: 200, grossKg: 1, maxStack: 2 };
    expect(packRegion(1000, 1000, 1000, c).count).toBe(20);
  });

  it('artık şerit doldurma ana bloktan fazlasını yerleştirir', () => {
    // 1000×1000 alan, 400×200 koli: ana blok 2×5=10, artık şerit +2 = 12
    const r = packRegion(1000, 1000, 100, { l: 400, w: 200, h: 100, grossKg: 1 });
    expect(r.count).toBeGreaterThanOrEqual(12);
    expect(r.blocks.length).toBeGreaterThan(1);
  });

  it('bloklar birbiriyle çakışmaz', () => {
    const r = packRegion(1000, 1000, 100, { l: 400, w: 200, h: 100, grossKg: 1 });
    for (let i = 0; i < r.blocks.length; i++) {
      for (let j = i + 1; j < r.blocks.length; j++) {
        const a = r.blocks[i], b = r.blocks[j];
        const ax2 = a.x + a.nx * a.bl, ay2 = a.y + a.ny * a.bw;
        const bx2 = b.x + b.nx * b.bl, by2 = b.y + b.ny * b.bw;
        const overlaps = a.x < bx2 && b.x < ax2 && a.y < by2 && b.y < ay2;
        expect(overlaps).toBe(false);
      }
    }
  });

  it('blokların koli toplamı count ile aynıdır', () => {
    const r = packRegion(1000, 1000, 100, { l: 400, w: 200, h: 100, grossKg: 1 });
    const sum = r.blocks.reduce((s, b) => s + b.nx * b.ny * b.nz, 0);
    expect(sum).toBe(r.count);
  });

  it('hiçbir blok konteyner sınırlarını aşmaz', () => {
    const c = byId('40hc')!;
    const r = packRegion(c.L, c.W, c.H, { l: 640, w: 420, h: 380, grossKg: 18.4 });
    for (const b of r.blocks) {
      expect(b.x + b.nx * b.bl).toBeLessThanOrEqual(c.L);
      expect(b.y + b.ny * b.bw).toBeLessThanOrEqual(c.W);
      expect(b.nz * b.bh).toBeLessThanOrEqual(c.H);
    }
  });
});

describe('fitContainer — ağırlık tavanı', () => {
  const c = byId('40hc')!; // payload 26 500 kg
  const box = { l: 640, w: 420, h: 380 };

  it('hafif koli hacimle bağlanır', () => {
    const r = fitContainer(c, { ...box, grossKg: 2 });
    expect(r.boundBy).toBe('volume');
    expect(r.volUtil).toBeLessThanOrEqual(1);
  });

  it('ağır koli ağırlıkla bağlanır ve tavan doğrudur', () => {
    const r = fitContainer(c, { ...box, grossKg: 60 });
    expect(r.boundBy).toBe('weight');
    expect(r.cartons).toBe(Math.floor(26500 / 60));
    expect(r.wtUtil).toBeLessThanOrEqual(1);
  });

  it('artık şerit doldurma naif hesaptan iyidir', () => {
    // Naif (yalnız ana blok) en iyi ihtimalle 672; artık şeritle 714
    const r = fitContainer(c, { ...box, grossKg: 1 });
    expect(r.cartonsByVolume).toBeGreaterThan(672);
  });
});

describe('fitAll — sağlamlık', () => {
  const cases: Carton[] = [
    { l: 1200, w: 800, h: 1000, grossKg: 300 },
    { l: 600, w: 400, h: 400, grossKg: 15 },
    { l: 350, w: 250, h: 200, grossKg: 5 },
    { l: 2000, w: 1000, h: 900, grossKg: 400 },
    { l: 100, w: 100, h: 100, grossKg: 0.5 },
  ];

  it('hiçbir sonuçta doluluk %100u aşmaz', () => {
    for (const c of cases) {
      for (const r of fitAll(c)) {
        expect(r.volUtil).toBeLessThanOrEqual(1.0001);
        expect(r.wtUtil).toBeLessThanOrEqual(1.0001);
      }
    }
  });

  it('devasa koli hiçbir konteynere sığmaz', () => {
    expect(fitAll({ l: 20000, w: 5000, h: 5000, grossKg: 100 }).some((r) => r.fits)).toBe(false);
  });

  it('id süzgeci çalışır', () => {
    const r = fitAll({ l: 600, w: 400, h: 400, grossKg: 10 }, ['20dv', '40hc']);
    expect(r).toHaveLength(2);
  });
});

describe('planOrder', () => {
  const carton: Carton = { l: 640, w: 420, h: 380, grossKg: 18.4 };

  it('konteyner adedi siparişin tamamını karşılar', () => {
    for (const p of planOrder(carton, 3000)) {
      const total = (p.containersNeeded - 1) * p.cartons + p.lastContainerCartons;
      expect(total).toBe(3000);
      expect(p.lastContainerCartons).toBeGreaterThan(0);
      expect(p.lastContainerCartons).toBeLessThanOrEqual(p.cartons);
    }
  });

  it('tek konteynere sığan siparişte 1 konteyner çıkar', () => {
    const p = planOrder(carton, 10).find((x) => x.container.id === '40hc')!;
    expect(p.containersNeeded).toBe(1);
    expect(p.lastContainerCartons).toBe(10);
  });

  it('navlun oranı verilirse toplam maliyet hesaplanır', () => {
    const p = planOrder(carton, 3000, ['40hc'], { '40hc': 2400 })[0];
    expect(p.totalFreight).toBe(2400 * p.containersNeeded);
  });

  it('oran verilmeyen konteynerde maliyet tanımsız kalır', () => {
    const p = planOrder(carton, 3000, ['20dv'], { '40hc': 2400 })[0];
    expect(p.totalFreight).toBeUndefined();
  });
});

describe('konteyner verisi', () => {
  it('geometrik hacim kataloglanan hacme yakındır', () => {
    for (const c of CONTAINERS) {
      const geo = geometricVolume(c);
      expect(geo).toBeGreaterThan(c.vol * 0.95);
      expect(geo).toBeLessThan(c.vol * 1.15);
    }
  });

  it('kapı yüksekliği iç yüksekliği aşmaz', () => {
    for (const c of CONTAINERS) {
      expect(c.doorH).toBeLessThanOrEqual(c.H);
      expect(c.doorW).toBeLessThanOrEqual(c.W);
    }
  });

  it('id benzersizdir', () => {
    expect(new Set(CONTAINERS.map((c) => c.id)).size).toBe(CONTAINERS.length);
  });
});
