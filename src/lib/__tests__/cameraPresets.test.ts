import { describe, expect, it } from 'vitest';
import { presetCamera, VIEWS } from '../cameraPresets';

// 13,6m tenteli ölçüsünde tipik bir sahne (sahne birimi = metre)
const L = 13.6, W = 2.48, H = 2.7;
const diag = Math.sqrt(L * L + W * W + H * H);

describe('presetCamera', () => {
  it('yandan görünüm uzunluk eksenine dik bakar (X=0, +Z\'den)', () => {
    const { pos, target } = presetCamera('side', L, W, H, diag);
    expect(pos[0]).toBe(0);
    expect(pos[2]).toBeGreaterThan(0);
    expect(pos[1]).toBeCloseTo(target[1], 5); // düz bakış, yukarıdan değil
  });

  it('önden görünüm genişlik eksenine dik bakar (Z=0, +X\'ten)', () => {
    const { pos, target } = presetCamera('front', L, W, H, diag);
    expect(pos[2]).toBe(0);
    expect(pos[0]).toBeGreaterThan(0);
    expect(pos[1]).toBeCloseTo(target[1], 5);
  });

  it('üstten görünümde yükseklik baskın bileşendir', () => {
    const { pos } = presetCamera('top', L, W, H, diag);
    expect(pos[1]).toBeGreaterThan(Math.abs(pos[0]));
    expect(pos[1]).toBeGreaterThan(Math.abs(pos[2]));
    // Tam tepe (0,y,0) bakış yönünü belirsizleştirir; küçük kaçıklık şart.
    expect(pos[2]).not.toBe(0);
  });

  it('3D görünüm üç eksende de açılı durur', () => {
    const { pos } = presetCamera('3d', L, W, H, diag);
    expect(pos[0]).toBeGreaterThan(0);
    expect(pos[1]).toBeGreaterThan(0);
    expect(pos[2]).toBeGreaterThan(0);
  });

  it('hiçbir ön ayar kasanın içinde kalmaz', () => {
    for (const v of VIEWS) {
      const { pos } = presetCamera(v.name, L, W, H, diag);
      expect(Math.hypot(pos[0], pos[1], pos[2])).toBeGreaterThan(H);
    }
  });

  it('hepsi aynı hedefe bakar — düğmeler arası geçişte sıçrama olmaz', () => {
    const t0 = presetCamera('3d', L, W, H, diag).target;
    for (const v of VIEWS) {
      expect(presetCamera(v.name, L, W, H, diag).target).toEqual(t0);
    }
  });

  it('dört görünüm de birbirinden farklı konum verir', () => {
    const keys = VIEWS.map((v) => presetCamera(v.name, L, W, H, diag).pos.join(','));
    expect(new Set(keys).size).toBe(VIEWS.length);
  });
});
