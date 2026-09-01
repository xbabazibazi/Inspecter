'use client';

import { useMemo } from 'react';
import { air, seaLcl, type Dims } from '@/lib/units';
import { Field, KV, fmt, toNum, useStored } from './ui';

export default function FreightWeight() {
  const [l, setL] = useStored('c-l', '60');
  const [w, setW] = useStored('c-w', '40');
  const [h, setH] = useStored('c-h', '40');
  const [kg, setKg] = useStored('c-kg', '15');
  const [qty, setQty] = useStored('c-qty', '100');
  const [div, setDiv] = useStored('c-div', '6000');

  const d: Dims = useMemo(
    () => ({
      l: toNum(l), w: toNum(w), h: toNum(h),
      qty: Math.max(1, Math.floor(toNum(qty, 1))),
      grossKg: toNum(kg),
    }),
    [l, w, h, qty, kg],
  );

  const divisor = parseInt(div, 10) || 6000;
  const s = seaLcl(d);
  const a = air(d, divisor);
  const perCbm = (d.l * d.w * d.h) / 1e6;
  const basisLabel = (b: string) => (b === 'volume' ? 'HACİM' : b === 'weight' ? 'AĞIRLIK' : 'EŞİT');

  return (
    <>
      <h2>Navlun ağırlığı</h2>
      <p className="sub">
        Parsiyel denizde (LCL) ücret <span className="mono">max(m³, ton)</span>, hava kargoda{' '}
        <span className="mono">max(brüt kg, hacim ağırlığı)</span> üzerinden alınır. Hangisinin
        bağladığını görmek, FCL&apos;e geçme kararını verdiren sayıdır.
      </p>

      <div className="card">
        <div className="fields">
          <Field id="c-l" label="Uzunluk" hint="cm" value={l} onChange={setL} step={0.1} />
          <Field id="c-w" label="Genişlik" hint="cm" value={w} onChange={setW} step={0.1} />
          <Field id="c-h" label="Yükseklik" hint="cm" value={h} onChange={setH} step={0.1} />
          <Field id="c-kg" label="Brüt ağırlık" hint="kg / koli" value={kg} onChange={setKg} step={0.1} />
        </div>
        <div className="fields" style={{ marginTop: 12 }}>
          <Field id="c-qty" label="Koli adedi" value={qty} onChange={setQty} min={1} step={1} inputMode="numeric" />
          <div className="f">
            <label htmlFor="c-div">Hava böleni</label>
            <select id="c-div" value={div} onChange={(e) => setDiv(e.target.value)}>
              <option value="6000">6000 — IATA</option>
              <option value="5000">5000 — ekspres</option>
            </select>
            <div className="hint">sözleşmene bak</div>
          </div>
        </div>
      </div>

      <div className="convout">
        <div className="stat">
          <div className="t">Deniz LCL · W/M</div>
          <div className="v">{s.chargeable.toFixed(2)}</div>
          <div className="d">faturalanacak W/M birimi</div>
          <div className="planmeta" style={{ marginTop: 12 }}>
            <KV k="Hacim" v={`${s.cbm.toFixed(3)} m³`} />
            <KV k="Ağırlık" v={`${s.tons.toFixed(3)} ton`} />
            <KV k="Bağlayan" v={<span style={{ color: 'var(--accent)' }}>{basisLabel(s.basis)}</span>} />
            <KV k="Koli başına" v={`${perCbm.toFixed(4)} m³`} />
          </div>
        </div>

        <div className="stat">
          <div className="t">Hava kargo · bölen {divisor}</div>
          <div className="v">{fmt(a.chargeableKg, 1)}</div>
          <div className="d">faturalanacak kg</div>
          <div className="planmeta" style={{ marginTop: 12 }}>
            <KV k="Brüt ağırlık" v={`${fmt(a.grossKg, 1)} kg`} />
            <KV k="Hacim ağırlığı" v={`${fmt(a.volumetricKg, 1)} kg`} />
            <KV k="Bağlayan" v={<span style={{ color: 'var(--accent)' }}>{basisLabel(a.basis)}</span>} />
            <KV k="Yoğunluk" v={s.cbm > 0 ? `${((s.tons * 1000) / s.cbm).toFixed(0)} kg/m³` : '—'} />
          </div>
        </div>
      </div>

      <p className="note">
        Hava kargoda bölen taşıyıcıya göre değişir: IATA standardı <b>6000</b>, birçok kurye/ekspres
        taşıyıcı <b>5000</b> kullanır. Deniz LCL&apos;de asgari faturalama birimi genelde <b>1 W/M</b>
        &apos;dir; bazı hatlar 2 W/M asgari uygular.
      </p>
    </>
  );
}
