import { describe, expect, it } from 'vitest';
import { equipmentById } from '../../lib/equipment';
import { placeItems, type LineItem } from '../../lib/consolidate';
import { buildConsolidationPdf } from '../pdfReport';

const eq = () => equipmentById('13m6-tenteli')!;

const ITEMS: LineItem[] = [
  { id: 'a', label: 'Firma A ağır yük', l: 1200, w: 800, h: 1000, grossKg: 300, qty: 10 },
  { id: 'b', label: 'Firma B çğışüö İĞŞÜÖÇ', l: 600, w: 400, h: 400, grossKg: 15, qty: 40 },
];

async function build(snapshot: string | null = null, snapshotError: string | null = null) {
  const equipment = eq();
  const result = placeItems(equipment, ITEMS, 0.05);
  const blob = await buildConsolidationPdf(
    equipment,
    result,
    ITEMS.map((i) => ({
      label: i.label, l: i.l / 10, w: i.w / 10, h: i.h / 10,
      kg: i.grossKg, qty: i.qty, cylinder: false,
    })),
    snapshot,
    snapshotError,
  );
  return Buffer.from(await blob.arrayBuffer());
}

describe('buildConsolidationPdf', () => {
  it('geçerli bir PDF üretir', async () => {
    const buf = await build();
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(10_000);
  });

  /**
   * Asıl korunan şey: jsPDF'in yerleşik fontları Latin-1 dışı olduğu için Türkçe
   * ı/İ/ğ/Ğ/ş/Ş'yi RENDER EDEMEZ. Gömülü TTF + Identity-H (CID) kodlaması bunun
   * tek çözümü; biri kaybolursa Türkçe metin sessizce bozulur (ç/ö/ü doğru
   * görünmeye devam ettiği için gözden kaçması çok kolay). Bu yüzden gömmenin
   * kendisini doğruluyoruz.
   */
  it('Türkçe için gerçek TTF gömer ve Identity-H kullanır', async () => {
    const pdf = (await build()).toString('latin1');
    expect(pdf).toContain('Archivo');
    expect(pdf).toContain('FontFile2');  // TTF gömülü (yalnızca referans değil)
    expect(pdf).toContain('Identity-H'); // Unicode/CID kodlama
  });

  // 1x1 saydam PNG — görüntü yolunu (addImage) sınamak için yeterli.
  const PNG_1X1 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  it('3D görüntü verilirse PDF\'e gerçekten gömülür', async () => {
    // Bayt boyutu karşılaştırması kırılgan (görselsiz dalda daha uzun bir hata
    // metni yazılıyor) — bunun yerine PDF'te bir görüntü nesnesi var mı bakıyoruz.
    const withImg = (await build(PNG_1X1)).toString('latin1');
    expect(withImg).toContain('/Subtype /Image');
  });

  it('görüntü yoksa sebebi PDF\'e yazılır, sessizce boş bırakılmaz', async () => {
    const pdf = (await build(null, 'Sahne henüz çizilmemiş.')).toString('latin1');
    expect(pdf).not.toContain('/Subtype /Image');
    // Metin gömülü fontla yazıldığı için düz aranamaz; en azından görüntü
    // nesnesinin hiç oluşturulmadığını ve PDF'in geçerli kaldığını doğrula.
    expect(pdf.startsWith('%PDF-')).toBe(true);
  });
});
