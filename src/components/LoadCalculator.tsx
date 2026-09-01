'use client';

import { useMemo, useState } from 'react';
import { CONTAINERS, geometricVolume } from '@/lib/containers';
import { fitAll, planOrder, type Carton, type LoadResult, type OrderPlan } from '@/lib/loadcalc';
import LoadPlanSvg from './LoadPlanSvg';
import { Bar, Chip, Field, KV, Segmented, fmt, pct, toNum, useStored } from './ui';

type Mode = 'fit' | 'order';

export default function LoadCalculator() {
  const [l, setL] = useStored('i-l', '64');
  const [w, setW] = useStored('i-w', '42');
  const [h, setH] = useStored('i-h', '38');
  const [kg, setKg] = useStored('i-kg', '18.4');
  const [stack, setStack] = useStored('i-stack', '');
  const [sideUpRaw, setSideUp] = useStored('i-side', '0');
  const [qty, setQty] = useStored('i-qty', '3000');
  const [mode, setMode] = useState<Mode>('fit');
  const [rates, setRates] = useState<Record<string, string>>({});

  const sideUp = sideUpRaw === '1';

  const carton: Carton = useMemo(
    () => ({
      l: Math.max(1, toNum(l, 1) * 10),
      w: Math.max(1, toNum(w, 1) * 10),
      h: Math.max(1, toNum(h, 1) * 10),
      grossKg: Math.max(0, toNum(kg, 0)),
      maxStack: Math.max(0, Math.floor(toNum(stack, 0))),
      thisSideUp: sideUp,
    }),
    [l, w, h, kg, stack, sideUp],
  );

  const activeRates = useMemo(() => {
    const r: Record<string, number> = {};
    let any = false;
    for (const [k, v] of Object.entries(rates)) {
      const n = parseFloat(v);
      if (Number.isFinite(n) && n > 0) { r[k] = n; any = true; }
    }
    return any ? r : undefined;
  }, [rates]);

  const fitResults = useMemo(
    () => [...fitAll(carton)].sort((a, b) => b.cartons - a.cartons),
    [carton],
  );

  const orderResults = useMemo(() => {
    const n = Math.max(1, Math.floor(toNum(qty, 1)));
    return [...planOrder(carton, n, undefined, activeRates)].sort((a, b) => {
      if (activeRates) {
        const af = a.totalFreight ?? Infinity;
        const bf = b.totalFreight ?? Infinity;
        if (af !== bf) return af - bf;
      }
      if (a.containersNeeded !== b.containersNeeded) return a.containersNeeded - b.containersNeeded;
      return b.volUtil - a.volUtil;
    });
  }, [carton, qty, activeRates]);

  const nothingFits = mode === 'fit' ? !fitResults.some((r) => r.fits) : orderResults.length === 0;

  return (
    <>
      <h2>Yükleme hesaplayıcı</h2>
      <p className="sub">
        Koli ölçüsünü ve ağırlığını gir; her konteyner tipine kaç adet sığdığını, doluluğu ve{' '}
        <em>hangi kısıtın bağladığını</em> gör.
      </p>

      <div className="card">
        <div className="fields">
          <Field id="i-l" label="Uzunluk" hint="cm" value={l} onChange={setL} min={1} step={0.1} />
          <Field id="i-w" label="Genişlik" hint="cm" value={w} onChange={setW} min={1} step={0.1} />
          <Field id="i-h" label="Yükseklik" hint="cm" value={h} onChange={setH} min={1} step={0.1} />
          <Field id="i-kg" label="Brüt ağırlık" hint="kg / koli" value={kg} onChange={setKg} step={0.1} />
        </div>

        <div className="opts">
          <label className={`chk${sideUp ? ' on' : ''}`}>
            <input type="checkbox" checked={sideUp} onChange={(e) => setSideUp(e.target.checked ? '1' : '0')} />
            Bu taraf yukarı
          </label>
          <div style={{ minWidth: 150 }}>
            <Field id="i-stack" label="Azami kat" hint="boş = sınırsız" value={stack}
              onChange={setStack} placeholder="sınırsız" step={1} inputMode="numeric" />
          </div>
        </div>

        <h3 style={{ marginTop: 22 }}>Soru</h3>
        <Segmented<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'fit', label: 'Kaç koli sığar' },
            { value: 'order', label: 'Sipariş için kaç konteyner' },
          ]}
        />
        {mode === 'order' ? (
          <div style={{ marginTop: 12, maxWidth: 220 }}>
            <Field id="i-qty" label="Toplam koli adedi" value={qty} onChange={setQty} min={1} step={1} inputMode="numeric" />
          </div>
        ) : null}

        <details className="rates">
          <summary>Navlun oranları — maliyete göre sırala (opsiyonel)</summary>
          <div className="rategrid">
            {CONTAINERS.map((c) => (
              <Field
                key={c.id}
                id={`r-${c.id}`}
                label={c.name}
                value={rates[c.id] ?? ''}
                onChange={(v) => setRates((p) => ({ ...p, [c.id]: v }))}
                placeholder="—"
                step={10}
              />
            ))}
          </div>
        </details>
      </div>

      {nothingFits ? (
        <div className="results">
          <div className="res dead">
            <div className="nm">Sığmıyor</div>
            <p className="sub" style={{ margin: '8px 0 0' }}>
              Bu koli hiçbir konteyner tipine yerleşmiyor. Ölçüleri kontrol et — değerler santimetre
              cinsinden.
            </p>
          </div>
        </div>
      ) : (
        <div className="results">
          {mode === 'fit'
            ? fitResults.map((r) => (
                <FitCard key={r.container.id} r={r} best={r.cartons === fitResults[0].cartons} />
              ))
            : orderResults.map((p, i) => (
                <OrderCard key={p.container.id} p={p} best={i === 0} qty={Math.max(1, Math.floor(toNum(qty, 1)))}
                  grossPer={carton.grossKg} priced={!!activeRates} />
              ))}
        </div>
      )}

      <p className="note warnbox">
        <b>Bu rakamlar geometrik üst sınırdır.</b> Sahada ambalaj şişmesi, istifleme payı, ayırıcı ve
        bağlama malzemesi yüzünden tipik olarak %5–10 daha az koli girer. Kritik yüklemede
        taşıyıcının konteyner spesifikasyonuyla doğrula.
      </p>
    </>
  );
}

function FitCard({ r, best }: { r: LoadResult; best: boolean }) {
  const spare = r.boundBy === 'weight' ? r.cartonsByVolume - r.cartons : 0;
  return (
    <div className={`res${best ? ' best' : ''}${r.cartons === 0 ? ' dead' : ''}`}>
      <div className="hd">
        <div className="nm">{r.container.name}</div>
        {r.cartons === 0 ? <Chip tone="s">sığmıyor</Chip>
          : r.boundBy === 'weight' ? <Chip tone="s">ağırlık sınırlı</Chip>
          : <Chip tone="n">hacim sınırlı</Chip>}
      </div>

      <div className="big">{fmt(r.cartons)}</div>
      <div className="unit">KOLİ</div>

      {spare > 0 ? (
        <div className="unit" style={{ color: 'var(--stamp)', marginTop: 6 }}>
          hacimce {fmt(spare)} koli daha yer var
        </div>
      ) : null}
      {r.doorWarning ? (
        <div className="unit" style={{ color: 'var(--warn)', marginTop: 6 }}>
          ⚠ koli kapı açıklığından geçmiyor
        </div>
      ) : null}

      <div className="bars">
        <Bar label="HACİM" value={r.volUtil} right={pct(r.volUtil)} />
        <Bar
          label={`AĞIRLIK ${fmt(r.grossKg)} / ${fmt(r.container.payload)} kg`}
          value={r.wtUtil}
          right={pct(r.wtUtil)}
          hot={r.boundBy === 'weight'}
        />
      </div>

      <div className="planmeta" style={{ marginTop: 12 }}>
        <KV k="Yüklenen hacim" v={`${r.cbm.toFixed(1)} m³ / ${geometricVolume(r.container).toFixed(1)} m³`} />
        <KV k="Ağırlıkça tavan" v={r.cartonsByWeight ? `${fmt(r.cartonsByWeight)} koli` : '—'} />
      </div>

      {r.cartons ? (
        <details>
          <summary>Konteyner içi yerleşim</summary>
          <LoadPlanSvg result={r} />
        </details>
      ) : null}
    </div>
  );
}

function OrderCard({ p, best, qty, grossPer, priced }: {
  p: OrderPlan; best: boolean; qty: number; grossPer: number; priced: boolean;
}) {
  return (
    <div className={`res${best ? ' best' : ''}`}>
      <div className="hd">
        <div>
          <div className="nm">{p.container.name}</div>
          <div className="unit" style={{ marginTop: 3 }}>{fmt(p.cartons)} koli / konteyner</div>
        </div>
        {best ? <Chip tone="a">{priced ? 'en ucuz' : 'en az konteyner'}</Chip> : null}
      </div>

      <div className="big">{p.containersNeeded}</div>
      <div className="unit">KONTEYNER GEREKLİ</div>

      <div className="planmeta" style={{ marginTop: 12 }}>
        <KV k="Son konteyner" v={`${fmt(p.lastContainerCartons)} koli · ${pct(p.lastVolUtil)} dolu`} />
        <KV k="Toplam brüt" v={`${fmt(qty * grossPer)} kg`} />
        {p.totalFreight !== undefined ? <KV k="Toplam navlun" v={fmt(p.totalFreight)} /> : null}
      </div>

      <details>
        <summary>Konteyner içi yerleşim</summary>
        <LoadPlanSvg result={p} />
      </details>
    </div>
  );
}
