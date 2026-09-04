import { describe, expect, it } from 'vitest';
import { palletById, PALLETS } from '../pallets';

describe('palletById', () => {
  it('bilinen id için palet döner', () => {
    expect(palletById('eur-wood')?.name).toMatch(/EUR/);
  });

  it('bilinmeyen id için undefined döner', () => {
    expect(palletById('yok')).toBeUndefined();
  });

  it('tüm paletlerin pozitif ölçü/ağırlığı vardır', () => {
    for (const p of PALLETS) {
      expect(p.l).toBeGreaterThan(0);
      expect(p.w).toBeGreaterThan(0);
      expect(p.h).toBeGreaterThan(0);
      expect(p.kg).toBeGreaterThan(0);
    }
  });
});
