import { describe, expect, it } from 'vitest';
import { air, cbm, convert, seaLcl, totalGrossKg } from '../units';

const d = { l: 60, w: 40, h: 40, qty: 100, grossKg: 15 };

describe('navlun ağırlığı', () => {
  it('hacmi doğru hesaplar', () => {
    expect(cbm(d)).toBeCloseTo(9.6, 5);
    expect(totalGrossKg(d)).toBe(1500);
  });

  it('LCL W/M büyük olanı seçer', () => {
    const s = seaLcl(d);
    expect(s.chargeable).toBeCloseTo(9.6, 5);
    expect(s.basis).toBe('volume');
  });

  it('ağır yükte W/M ağırlıkla bağlanır', () => {
    const heavy = { l: 20, w: 20, h: 20, qty: 10, grossKg: 100 };
    const s = seaLcl(heavy);
    expect(s.basis).toBe('weight');
    expect(s.chargeable).toBeCloseTo(1, 5);
  });

  it('hava hacim ağırlığı böleni uygular', () => {
    expect(air(d, 6000).volumetricKg).toBeCloseTo((60 * 40 * 40 * 100) / 6000, 5);
    expect(air(d, 5000).volumetricKg).toBeCloseTo((60 * 40 * 40 * 100) / 5000, 5);
  });

  it('hava ücreti büyük olanı seçer', () => {
    expect(air(d).basis).toBe('volume');
    expect(air({ l: 20, w: 20, h: 20, qty: 10, grossKg: 30 }).basis).toBe('weight');
  });

  it('birim çevrimleri tersine döner', () => {
    expect(convert.inToCm(convert.cmToIn(100))).toBeCloseTo(100, 9);
    expect(convert.lbToKg(convert.kgToLb(50))).toBeCloseTo(50, 9);
    expect(convert.cftToCbm(convert.cbmToCft(3))).toBeCloseTo(3, 9);
  });
});
