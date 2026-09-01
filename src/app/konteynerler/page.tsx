import type { Metadata } from 'next';
import { CONTAINERS } from '@/lib/containers';

export const metadata: Metadata = {
  title: 'Konteyner özellikleri',
  description:
    'Standart deniz konteynerlerinin iç ölçüleri, kapı açıklığı, hacmi, darası ve azami yükü.',
};

const fmt = (n: number) => n.toLocaleString('tr-TR');

export default function Page() {
  return (
    <>
      <h2>Konteyner özellikleri</h2>
      <p className="sub">
        İç ölçüler, kapı açıklığı, hacim ve azami yük. Kapı yüksekliği çoğu zaman iç yükseklikten
        düşüktür — paletli yüklemede bağlayıcı olan odur.
      </p>

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Tip</th>
              <th className="n">İç uzunluk</th>
              <th className="n">İç genişlik</th>
              <th className="n">İç yükseklik</th>
              <th className="n">Hacim</th>
              <th className="n">Azami yük</th>
              <th className="n">Dara</th>
              <th className="n">Kapı G × Y</th>
            </tr>
          </thead>
          <tbody>
            {CONTAINERS.map((c) => (
              <tr key={c.id}>
                <td>
                  <b>{c.name}</b>
                  {c.reefer ? <span className="chip n" style={{ marginLeft: 6 }}>reefer</span> : null}
                </td>
                <td className="n">{fmt(c.L)}</td>
                <td className="n">{fmt(c.W)}</td>
                <td className="n">{fmt(c.H)}</td>
                <td className="n">{c.vol.toFixed(1)} m³</td>
                <td className="n">{fmt(c.payload)} kg</td>
                <td className="n">{fmt(c.tare)} kg</td>
                <td className="n">{fmt(c.doorW)} × {fmt(c.doorH)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="note">
        Değerler <b>nominaldir</b>. Gerçek iç ölçü imalatçıya, konteynerin yaşına ve hatta göre
        yaklaşık ±%2 oynar. Azami yük (payload) ise konteynerin kendi plakasında yazar ve aynı tipte
        bile farklılık gösterir — yükleme öncesi <b>CSC plakasını</b> okuyun.
      </p>
    </>
  );
}
