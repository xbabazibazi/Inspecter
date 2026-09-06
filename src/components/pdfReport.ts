/**
 * Konsolidasyon planı PDF'i — jsPDF ile doğrudan istemci tarafında üretilir.
 *
 * Neden `window.print()` değil: Capacitor'ın native Android/iOS sarmalayıcısında
 * sayfa çıplak bir WebView içinde çalışır ve `window.print()`in bağlı olduğu bir
 * yazdırma işleyicisi YOK — düğme tarayıcıda çalışıp uygulama içinde sessizce
 * hiçbir şey yapmazdı.
 *
 * Neden `navigator.share`/`<a download>` de TEK BAŞINA yetmiyor: aynı sebep —
 * çıplak WebView'da bunlar da bir indirme yöneticisine/paylaşım köprüsüne bağlı
 * değil, native uygulamada sessizce başarısız olabiliyor. Bu yüzden native
 * platformda (`Capacitor.isNativePlatform()`) @capacitor/filesystem + @capacitor/share
 * kullanılıyor — ikisi de gerçek native köprü, WebView'ın kendi API desteğine
 * bağımlı değil. Tarayıcıda ise Web Share API / blob indirme aynen çalışır.
 *
 * Font: jsPDF'in yerleşik fontları Türkçe ı/İ/ğ/Ğ/ş/Ş'yi RENDER EDEMEZ (Latin-1
 * dışı). Gömülü Archivo alt kümesi için bkz. `pdfFont.ts`.
 */
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { ConsolidationResult } from '@/lib/consolidate';
import type { EquipmentSpec } from '@/lib/equipment';
import { fmt, pct } from './ui';

const FONT = 'Archivo';

/** Marka renkleri (globals.css token'larının RGB karşılığı). */
const C_ACCENT: [number, number, number] = [9, 74, 65];
const C_ACCENT_SOFT: [number, number, number] = [220, 234, 230];
const C_INK: [number, number, number] = [19, 26, 24];
const C_INK_2: [number, number, number] = [90, 99, 96];
const C_RULE: [number, number, number] = [178, 186, 181];
const C_STAMP: [number, number, number] = [158, 59, 46];

interface ReportItem {
  label: string;
  l: number;
  w: number;
  h: number;
  kg: number;
  qty: number;
  cylinder: boolean;
}

/**
 * Marka amblemini çizer — uygulama ikonuyla (icon.svg, 32 birimlik tuval) aynı
 * geometri, `size` mm'ye ölçeklenmiş: yuvarlak kare + oluklu konteyner silueti.
 */
function drawLogoMark(doc: jsPDF, x: number, y: number, size: number) {
  const k = size / 32; // icon.svg 32x32 tuvalinden mm'ye
  doc.setFillColor(...C_ACCENT);
  doc.roundedRect(x, y, size, size, 5 * k, 5 * k, 'F');

  doc.setDrawColor(...C_ACCENT_SOFT);
  doc.setLineWidth(1.8 * k);
  doc.roundedRect(x + 6 * k, y + 9 * k, 20 * k, 14 * k, 1 * k, 1 * k, 'S');
  for (const gx of [10.5, 15, 19.5]) {
    doc.line(x + gx * k, y + 9 * k, x + gx * k, y + 23 * k);
  }
}

export async function buildConsolidationPdf(
  equipment: EquipmentSpec,
  result: ConsolidationResult,
  items: ReportItem[],
  snapshot: string | null,
): Promise<Blob> {
  // Font ~76 KB; yalnızca PDF üretilirken yüklensin diye dinamik import.
  const { ARCHIVO_REGULAR_B64, ARCHIVO_BOLD_B64 } = await import('./pdfFont');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.addFileToVFS('Archivo-Regular.ttf', ARCHIVO_REGULAR_B64);
  doc.addFont('Archivo-Regular.ttf', FONT, 'normal');
  doc.addFileToVFS('Archivo-Bold.ttf', ARCHIVO_BOLD_B64);
  doc.addFont('Archivo-Bold.ttf', FONT, 'bold');

  const marginX = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - marginX * 2;

  // ---- başlık (marka kilidi) ----
  const badge = 11;
  drawLogoMark(doc, marginX, 12, badge);

  doc.setFont(FONT, 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...C_INK);
  doc.text('INSPECTER', marginX + badge + 4, 18.5, { charSpace: 0.3 });

  doc.setFont(FONT, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C_INK_2);
  doc.text('Konsolidasyon planı', marginX + badge + 4, 22.8);
  doc.text(new Date().toLocaleDateString('tr-TR'), pageW - marginX, 18.5, { align: 'right' });

  doc.setDrawColor(...C_RULE);
  doc.setLineWidth(0.4);
  doc.line(marginX, 26.5, pageW - marginX, 26.5);

  let y = 35;

  // ---- ekipman + durum ----
  doc.setFont(FONT, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...C_INK);
  doc.text(equipment.name, marginX, y);

  const fits = result.boundBy === 'none';
  const status = fits ? 'SIĞIYOR' : result.boundBy === 'length' ? 'UZUNLUK AŞILDI' : 'AĞIRLIK AŞILDI';
  doc.setFont(FONT, 'bold');
  doc.setFontSize(8);
  const stW = doc.getTextWidth(status) + 6;
  doc.setFillColor(...(fits ? C_ACCENT_SOFT : [242, 225, 221] as [number, number, number]));
  doc.roundedRect(pageW - marginX - stW, y - 4.6, stW, 6.4, 1, 1, 'F');
  doc.setTextColor(...(fits ? C_ACCENT : C_STAMP));
  doc.text(status, pageW - marginX - stW / 2, y, { align: 'center' });

  y += 9;

  // ---- özet ----
  const rows: Array<[string, string]> = [
    [
      'Uzunluk kullanımı',
      `${fmt(result.totalLengthUsed / 10)} / ${fmt((equipment.L * (1 - result.allowance)) / 10)} cm · ${pct(result.lengthUtil)}`,
    ],
    [
      'Ağırlık kullanımı',
      `${fmt(result.totalWeight)} / ${fmt(equipment.payload * (1 - result.allowance))} kg · ${pct(result.weightUtil)}`,
    ],
  ];
  if (result.blocks.length > 0) {
    rows.push(['Net yük hacmi', `${fmt(result.cargoVolume / 1e9, 1)} m³`]);
    rows.push([
      'Fire (boşluk)',
      `${fmt(result.voidVolume / 1e9, 1)} m³ · dolu bölümde %${Math.round(result.voidRatio * 100)}`,
    ]);
  }
  if (result.allowance > 0) rows.push(['Fire payı', `%${Math.round(result.allowance * 100)}`]);

  doc.setFontSize(10);
  for (const [k, v] of rows) {
    doc.setFont(FONT, 'normal');
    doc.setTextColor(...C_INK_2);
    doc.text(k, marginX, y);
    doc.setFont(FONT, 'bold');
    doc.setTextColor(...C_INK);
    doc.text(v, marginX + 45, y);
    y += 6;
  }

  // ---- uyarılar ----
  const warn = (text: string) => {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...C_STAMP);
    const lines = doc.splitTextToSize(text, contentW) as string[];
    doc.text(lines, marginX, y);
    y += lines.length * 5 + 1;
    doc.setTextColor(...C_INK);
  };

  y += 1;
  if (result.unfitItems.length > 0) {
    warn(`Sığmayan kalemler: ${result.unfitItems.map((i) => i.label).join(', ')}`);
  }
  if (!fits) {
    warn(
      result.boundBy === 'length'
        ? `Kapasite aşıldı — gereken uzunluk ${fmt(result.lengthOverflow / 10)} cm fazla.`
        : `Kapasite aşıldı — toplam ağırlık ${fmt(result.weightOverflow)} kg fazla.`,
    );
  }

  // ---- kalem tablosu ----
  y += 4;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C_INK);
  doc.text('Kalemler', marginX, y);
  y += 6;

  const cols = [marginX, marginX + 9, marginX + 78, marginX + 118, marginX + 155];
  const headers = ['#', 'Etiket', 'Ölçü (cm)', 'Ağırlık (kg/ad.)', 'Adet'];

  const tableHead = () => {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C_INK_2);
    headers.forEach((h, i) => doc.text(h, cols[i], y));
    y += 1.8;
    doc.setDrawColor(...C_RULE);
    doc.setLineWidth(0.3);
    doc.line(marginX, y, pageW - marginX, y);
    y += 4.6;
  };
  tableHead();

  doc.setFontSize(9.5);
  items.forEach((it, i) => {
    if (y > pageH - 22) {
      doc.addPage();
      y = 20;
      tableHead();
      doc.setFontSize(9.5);
    }
    doc.setFont(FONT, 'normal');
    doc.setTextColor(...C_INK_2);
    doc.text(String(i + 1), cols[0], y);
    doc.setTextColor(...C_INK);
    const label = it.label + (it.cylinder ? ' (silindir)' : '');
    doc.text(doc.splitTextToSize(label, 64)[0] as string, cols[1], y);
    doc.text(`${fmt(it.l)}×${fmt(it.w)}×${fmt(it.h)}`, cols[2], y);
    doc.text(fmt(it.kg, 1), cols[3], y);
    doc.text(String(it.qty), cols[4], y);
    y += 5.6;
  });

  // ---- 3D görünüm ----
  y += 5;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C_INK);

  if (snapshot) {
    const props = doc.getImageProperties(snapshot);
    const w = contentW;
    const h = (props.height * w) / props.width;
    // Başlık ile görsel aynı sayfada kalsın diye ikisini birlikte ölçüyoruz.
    if (y + 6 + h > pageH - 16) {
      doc.addPage();
      y = 20;
    }
    doc.text('3D yerleşim görünümü', marginX, y);
    y += 5;
    doc.setDrawColor(...C_RULE);
    doc.setLineWidth(0.3);
    doc.addImage(snapshot, 'PNG', marginX, y, w, h);
    doc.rect(marginX, y, w, h, 'S');
  } else {
    if (y > pageH - 26) { doc.addPage(); y = 20; }
    doc.text('3D yerleşim görünümü', marginX, y);
    y += 5;
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C_INK_2);
    doc.text('Görünüm alınamadı — sahneyi bir kez döndürüp tekrar dene.', marginX, y);
  }

  // ---- altbilgi (her sayfaya) ----
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C_INK_2);
    doc.text(
      'Bu bir yerleşim tahminidir; ambalaj ve bağlama payı için fire payı girilebilir.',
      marginX,
      pageH - 10,
    );
    doc.text(`${p} / ${pages}`, pageW - marginX, pageH - 10, { align: 'right' });
  }

  return doc.output('blob');
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function shareOrDownloadPdf(blob: Blob, fileName: string): Promise<'shared' | 'downloaded'> {
  if (Capacitor.isNativePlatform()) {
    const base64 = await blobToBase64(blob);
    const written = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
    await Share.share({ title: 'Inspecter Konsolidasyon Planı', files: [written.uri] });
    return 'shared';
  }

  const file = new File([blob], fileName, { type: 'application/pdf' });
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };

  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Inspecter Konsolidasyon Planı' });
      return 'shared';
    } catch {
      // Kullanıcı paylaşım sayfasını iptal etti — indirmeye düş.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
