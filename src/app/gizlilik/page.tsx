import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gizlilik politikası',
  description:
    'Inspecter hiçbir kişisel veri toplamaz, saklamaz veya aktarmaz. Tüm hesaplar cihazında çalışır.',
};

/**
 * Google Play ve App Store başvuruları gizlilik politikası URL'si zorunlu kılıyor.
 * Ayrı bir yerde barındırmak yerine uygulamanın kendi sitesinde duruyor:
 * tek dağıtım, tek sürüm, kırık link riski yok.
 */
export default function Page() {
  return (
    <>
      <h2>Gizlilik politikası</h2>
      <p className="sub">
        Son güncelleme: 7 Eylül 2026 · Geçerli olduğu uygulama: Inspecter (
        <span className="mono">com.quon.inspecter</span>) ve inspecter web sitesi.
      </p>

      <div className="card">
        <h3>Kısaca</h3>
        <p className="note">
          <b>Inspecter hiçbir kişisel veri toplamaz, saklamaz veya üçüncü taraflara
          aktarmaz.</b> Hesap açmanız gerekmez. Girdiğiniz yük bilgileri cihazınızdan
          çıkmaz; tüm hesaplar uygulamanın içinde yapılır.
        </p>

        <h3>Topladığımız veriler</h3>
        <p className="note">
          Hiçbiri. Uygulamada analitik, reklam kimliği, çökme raporlama veya izleme
          aracı bulunmaz. Sunucumuza gönderilen hiçbir istek yoktur — uygulama
          internet bağlantısı olmadan da çalışır.
        </p>

        <h3>Cihazınızda saklananlar</h3>
        <p className="note">
          Girdiğiniz kalem ölçüleri, ekipman seçimi ve fire payı gibi ayarlar
          yalnızca cihazınızın yerel tarayıcı deposunda (<span className="mono">localStorage</span>)
          tutulur. Bu veriler bize veya başka bir yere <b>gönderilmez</b>. Uygulamayı
          kaldırdığınızda veya tarayıcı verilerini temizlediğinizde silinirler.
        </p>

        <h3>Oluşturduğunuz PDF dosyaları</h3>
        <p className="note">
          Rapor PDF&apos;i tamamen cihazınızda üretilir ve cihazınızın geçici klasörüne
          yazılır. &quot;Paylaş&quot; dediğinizde dosya, işletim sisteminin kendi paylaşım
          ekranı üzerinden <b>sizin seçtiğiniz</b> uygulamaya (WhatsApp, e-posta vb.)
          iletilir. Bu aktarımda bizim hiçbir rolümüz ve erişimimiz yoktur.
        </p>

        <h3>İzinler</h3>
        <p className="note">
          Uygulama kamera, konum, kişiler, mikrofon veya dosya erişimi gibi hassas
          izinler istemez.
        </p>

        <h3>Çocuklar</h3>
        <p className="note">
          Inspecter mesleki bir lojistik aracıdır, çocuklara yönelik değildir ve
          hiçbir yaş grubundan veri toplamaz.
        </p>

        <h3>Değişiklikler ve iletişim</h3>
        <p className="note">
          Bu politika değişirse bu sayfadaki tarih güncellenir. Soru ve talepleriniz
          için: <a href="mailto:mstfadur891@gmail.com">mstfadur891@gmail.com</a>
        </p>
      </div>
    </>
  );
}
