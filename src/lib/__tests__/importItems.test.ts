import { describe, expect, it } from 'vitest';
import { csvTemplate, parseCsv, parseImportRows } from '../importItems';

describe('parseCsv', () => {
  it('virgülle ayrılmış basit satırları ayrıştırır', () => {
    const rows = parseCsv('a,b,c\n1,2,3');
    expect(rows).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('noktalı virgülü otomatik algılar (TR Excel varsayılanı)', () => {
    const rows = parseCsv('Etiket;Uzunluk\nFirma A;120');
    expect(rows).toEqual([['Etiket', 'Uzunluk'], ['Firma A', '120']]);
  });

  it('tırnaklı alan içindeki ayracı korur', () => {
    const rows = parseCsv('etiket,not\n"Acme, Inc.","kırılgan, dikkat"');
    expect(rows[1]).toEqual(['Acme, Inc.', 'kırılgan, dikkat']);
  });

  it('kaçışlı çift tırnağı tek tırnağa çevirir', () => {
    const rows = parseCsv('etiket\n"5"" boru"');
    expect(rows[1]).toEqual(['5" boru']);
  });

  it('CRLF satır sonlarını işler', () => {
    const rows = parseCsv('a,b\r\n1,2\r\n');
    expect(rows).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('boş satırları atlar', () => {
    const rows = parseCsv('a,b\n1,2\n\n3,4');
    expect(rows).toEqual([['a', 'b'], ['1', '2'], ['3', '4']]);
  });

  it('baştaki BOM karakterini yok sayar', () => {
    const rows = parseCsv('﻿a,b\n1,2');
    expect(rows[0]).toEqual(['a', 'b']);
  });
});

describe('parseImportRows — başlık eşleme', () => {
  it('Türkçe başlıkları büyük/küçük harf ve boşluk farkı gözetmeden eşler', () => {
    const rows = parseCsv(csvTemplate());
    const { items, warnings } = parseImportRows(rows);
    expect(warnings).toEqual([]);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      label: 'Firma A', l: 120, w: 80, h: 100, kg: 300, qty: 10, maxStack: null, thisSideUp: false,
    });
    expect(items[1]).toEqual({
      label: 'Firma B', l: 60, w: 40, h: 40, kg: 15, qty: 40, maxStack: 5, thisSideUp: true,
    });
  });

  it('İngilizce başlıkları da eşler', () => {
    const rows = parseCsv('Name,Length,Width,Height,Weight,Qty\nBox,50,50,50,10,3');
    const { items, warnings } = parseImportRows(rows);
    expect(warnings).toEqual([]);
    expect(items).toEqual([{ label: 'Box', l: 50, w: 50, h: 50, kg: 10, qty: 3, maxStack: null, thisSideUp: false }]);
  });

  it('gerekli sütun eksikse boş sonuç ve uyarı döner', () => {
    const rows = parseCsv('Etiket,Uzunluk\nA,10');
    const { items, warnings } = parseImportRows(rows);
    expect(items).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('etiket sütunu yoksa otomatik "Kalem N" üretir', () => {
    const rows = parseCsv('Uzunluk,Genişlik,Yükseklik,Ağırlık,Adet\n50,50,50,10,3');
    const { items } = parseImportRows(rows);
    expect(items[0].label).toBe('Kalem 1');
  });

  it('ondalık virgülü noktaya çevirir', () => {
    const rows = parseCsv('Uzunluk;Genişlik;Yükseklik;Ağırlık;Adet\n12,5;8;10,2;300;10');
    const { items } = parseImportRows(rows);
    expect(items[0]).toMatchObject({ l: 12.5, h: 10.2 });
  });

  it('geçersiz/eksik satırı atlar ve uyarı ekler, geçerli satırları yine de döner', () => {
    const rows = parseCsv('Uzunluk,Genişlik,Yükseklik,Ağırlık,Adet\n50,50,50,10,3\nabc,50,50,10,3\n60,60,60,20,5');
    const { items, warnings } = parseImportRows(rows);
    expect(items).toHaveLength(2);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/3\. satır/);
  });

  it('sıfır veya negatif ölçüyü/adedi reddeder', () => {
    const rows = parseCsv('Uzunluk,Genişlik,Yükseklik,Ağırlık,Adet\n0,50,50,10,3\n50,50,50,10,0');
    const { items, warnings } = parseImportRows(rows);
    expect(items).toEqual([]);
    expect(warnings).toHaveLength(2);
  });

  it('"Bu taraf yukarı" sütununu evet/1/x gibi değerlerle true olarak okur', () => {
    const rows = parseCsv('Uzunluk,Genişlik,Yükseklik,Ağırlık,Adet,Bu taraf yukarı\n50,50,50,10,3,X\n50,50,50,10,3,hayır');
    const { items } = parseImportRows(rows);
    expect(items[0].thisSideUp).toBe(true);
    expect(items[1].thisSideUp).toBe(false);
  });

  it('tamamen boş dosya için uyarı döner', () => {
    const { items, warnings } = parseImportRows([]);
    expect(items).toEqual([]);
    expect(warnings[0]).toMatch(/boş/);
  });
});
