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
 */
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { ConsolidationResult } from '@/lib/consolidate';
import type { EquipmentSpec } from '@/lib/equipment';
import { fmt, pct } from './ui';

interface ReportItem {
  label: string;
  l: number;
  w: number;
  h: number;
  kg: number;
  qty: number;
  cylinder: boolean;
}

export function buildConsolidationPdf(
  equipment: EquipmentSpec,
  result: ConsolidationResult,
  items: ReportItem[],
  snapshot: string | null,
): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const marginX = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Inspecter · Konsolidasyon Planı', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString('tr-TR'), pageW - marginX, y, { align: 'right' });

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(equipment.name, marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const status = result.boundBy === 'none' ? 'Sığıyor' : result.boundBy === 'length' ? 'Uzunluk aşıldı' : 'Ağırlık aşıldı';
  doc.text(status, pageW - marginX, y, { align: 'right' });

  y += 8;
  doc.setFontSize(10);
  const summaryLines = [
    `Uzunluk kullanımı: ${fmt(result.totalLengthUsed / 10)} / ${fmt((equipment.L * (1 - result.allowance)) / 10)} cm · ${pct(result.lengthUtil)}`,
    `Ağırlık kullanımı: ${fmt(result.totalWeight)} / ${fmt(equipment.payload * (1 - result.allowance))} kg · ${pct(result.weightUtil)}`,
  ];
  if (result.blocks.length > 0) {
    summaryLines.push(`Net yük hacmi: ${fmt(result.cargoVolume / 1e9, 1)} m³`);
    summaryLines.push(`Fire (boşluk): ${fmt(result.voidVolume / 1e9, 1)} m³ · dolu bölümde %${Math.round(result.voidRatio * 100)}`);
  }
  if (result.allowance > 0) summaryLines.push(`Fire payı: %${Math.round(result.allowance * 100)}`);
  for (const line of summaryLines) {
    doc.text(line, marginX, y);
    y += 5.5;
  }

  if (result.unfitItems.length > 0) {
    doc.setTextColor(150, 60, 46);
    doc.text(`Sığmayan kalemler: ${result.unfitItems.map((i) => i.label).join(', ')}`, marginX, y);
    doc.setTextColor(0, 0, 0);
    y += 5.5;
  }
  if (result.boundBy !== 'none') {
    const overflowText = result.boundBy === 'length'
      ? `Kapasite aşıldı: gereken uzunluk ${fmt(result.lengthOverflow / 10)} cm fazla.`
      : `Kapasite aşıldı: toplam ağırlık ${fmt(result.weightOverflow)} kg fazla.`;
    doc.setTextColor(150, 60, 46);
    doc.text(overflowText, marginX, y);
    doc.setTextColor(0, 0, 0);
    y += 5.5;
  }

  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Kalemler', marginX, y);
  y += 6;

  doc.setFontSize(9.5);
  const cols = [marginX, marginX + 8, marginX + 62, marginX + 100, marginX + 138, marginX + 160];
  doc.setFont('helvetica', 'bold');
  doc.text('#', cols[0], y);
  doc.text('Etiket', cols[1], y);
  doc.text('Ölçü (cm)', cols[2], y);
  doc.text('Ağırlık (kg/adet)', cols[3], y);
  doc.text('Adet', cols[4], y);
  doc.setFont('helvetica', 'normal');
  y += 2;
  doc.setLineWidth(0.2);
  doc.line(marginX, y, pageW - marginX, y);
  y += 5;

  items.forEach((it, i) => {
    if (y > pageH - 20) { doc.addPage(); y = 18; }
    doc.text(String(i + 1), cols[0], y);
    doc.text(it.label + (it.cylinder ? ' (silindir)' : ''), cols[1], y);
    doc.text(`${fmt(it.l)}×${fmt(it.w)}×${fmt(it.h)}`, cols[2], y);
    doc.text(fmt(it.kg, 1), cols[3], y);
    doc.text(String(it.qty), cols[4], y);
    y += 5.5;
  });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3D yerleşim görünümü', marginX, y);
  y += 4;

  if (snapshot) {
    const imgProps = doc.getImageProperties(snapshot);
    const w = pageW - marginX * 2;
    const h = (imgProps.height * w) / imgProps.width;
    if (y + h > pageH - 16) { doc.addPage(); y = 18; }
    doc.addImage(snapshot, 'PNG', marginX, y, w, h);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Görünüm alınamadı — sahneyi bir kez döndürüp tekrar dene.', marginX, y);
    doc.setTextColor(0, 0, 0);
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

/**
 * Native uygulamada (Capacitor) `navigator.share` ve `<a download>` blob linki
 * GÜVENİLMEZ — çıplak Android WebView'da bir indirme yöneticisine bağlı değiller,
 * sessizce hiçbir şey yapmayabilirler. Bunun yerine dosyayı @capacitor/filesystem
 * ile uygulama önbelleğine yazıp @capacitor/share ile native paylaşım sayfasını
 * (WhatsApp dahil) açıyoruz — ikisi de gerçek native köprüler, WebView'a bağımlı
 * değil. Tarayıcıda ise Web Share API / dosya indirme aynen çalışır.
 */
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
