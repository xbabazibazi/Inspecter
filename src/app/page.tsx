import Link from 'next/link';

const TOOLS = [
  {
    href: '/yukleme',
    name: 'Yükleme hesaplayıcı',
    desc: 'Koli ölçüsü ve ağırlığı gir; hangi konteynere kaç adet sığdığını, doluluğu ve hangi kısıtın bağladığını gör.',
    kicker: 'Katman sezgiseli · artık şerit doldurma',
  },
  {
    href: '/konsolidasyon',
    name: 'Konsolidasyon planlayıcı',
    desc: 'Farklı firmalara ait kalemleri tek treyler veya konteynere yerleştir, 3D\'de döndür; hangi kısıtın bağladığını gör.',
    kicker: '3D WebGL · çok kalemli groupage',
  },
  {
    href: '/konteynerler',
    name: 'Konteyner özellikleri',
    desc: 'İç ölçüler, kapı açıklığı, hacim, dara ve azami yük. Kapı yüksekliği çoğu zaman iç yükseklikten düşüktür.',
    kicker: '6 tip · nominal değerler',
  },
  {
    href: '/numara',
    name: 'Konteyner numarası',
    desc: 'ISO 6346 kontrol hanesi doğrulaması ve hesabı. Sahip kodundan hattı bulur.',
    kicker: 'Mod-11 · sahip kodu araması',
  },
  {
    href: '/navlun',
    name: 'Navlun ağırlığı',
    desc: 'LCL için W/M, hava kargo için hacim ağırlığı. Hangisinin faturalandığını söyler.',
    kicker: 'max(m³, ton) · max(kg, cm³/bölen)',
  },
];

export default function Home() {
  return (
    <>
      <div className="hero">
        <h1>Konteyner hesapları, tarayıcında</h1>
        <p>
          Dört araç, tek sayfa. Hesap açman gerekmez, hiçbir veri sunucuya gitmez — tüm hesaplar
          senin cihazında çalışır. Telefonda da, rampada da.
        </p>
      </div>

      <div className="toolgrid">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="tool">
            <div className="n">{t.name}</div>
            <div className="d">{t.desc}</div>
            <span className="k">{t.kicker}</span>
          </Link>
        ))}
      </div>

      <p className="note">
        <b>Bu bir başlangıç.</b> Araçlar ücretsiz kalacak. Asıl ürün bunların üzerine kurulacak olan
        belge zinciri: proforma → ticari fatura → çeki listesi, tek sevkiyat kaydından türeyen ve
        sürümlenen belgeler.
      </p>
    </>
  );
}
