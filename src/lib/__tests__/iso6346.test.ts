import { describe, expect, it } from 'vitest';
import { checkDigit, formatContainerNo, parseContainerNo } from '../iso6346';

describe('ISO 6346 kontrol hanesi', () => {
  it('bilinen numaraların hanesini doğru hesaplar', () => {
    expect(checkDigit('MSCU739428')).toBe(4);
    expect(checkDigit('CSQU305438')).toBe(3);
  });

  it('geçerli numarayı kabul eder', () => {
    expect(parseContainerNo('CSQU3054383').ok).toBe(true);
    expect(parseContainerNo('MSCU7394284').ok).toBe(true);
  });

  it('boşluk ve tireyi yok sayar', () => {
    expect(parseContainerNo('MSCU 739428-4').ok).toBe(true);
    expect(parseContainerNo('mscu7394284').ok).toBe(true);
  });

  it('yanlış kontrol hanesini yakalar ve doğrusunu söyler', () => {
    const r = parseContainerNo('MSCU7394281');
    expect(r.ok).toBe(false);
    expect(r.computedCheck).toBe(4);
    expect(r.givenCheck).toBe(1);
  });

  it('biçim hatasını yakalar', () => {
    expect(parseContainerNo('MSC1739428X').ok).toBe(false);
    expect(parseContainerNo('MSCU73942AB').ok).toBe(false);
  });

  it('eksik girdide hane hesaplamaz', () => {
    const r = parseContainerNo('MSCU73');
    expect(r.ok).toBe(false);
    expect(r.computedCheck).toBeUndefined();
  });

  it('10 hane verilirse kontrol hanesini üretir', () => {
    const r = parseContainerNo('TGHU203105');
    expect(r.ok).toBe(true);
    expect(r.givenCheck).toBeUndefined();
    expect(r.computedCheck).toBeGreaterThanOrEqual(0);
    expect(r.computedCheck).toBeLessThanOrEqual(9);
  });

  it('hane her zaman 0–9 aralığındadır', () => {
    // mod 11 == 10 durumu 0'a düşmeli
    for (const body of ['MSCU739428', 'CSQU305438', 'TGHU203105', 'AAAU000000', 'ZZZU999999']) {
      const d = checkDigit(body);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(9);
    }
  });

  it('gövde biçimi bozuksa fırlatır', () => {
    expect(() => checkDigit('ABC123')).toThrow();
  });

  it('görüntüleme biçimi', () => {
    expect(formatContainerNo('MSCU7394284')).toBe('MSCU 739428-4');
    expect(formatContainerNo('MSCU739428')).toBe('MSCU 739428');
  });
});
