'use client';

import { useMemo, useRef } from 'react';
import { CATEGORIES, formatContainerNo, parseContainerNo } from '@/lib/iso6346';
import { lookupPrefix } from '@/lib/prefixes';
import { KV, useStored } from './ui';

const SAMPLES = [
  { v: 'MSCU7394284', label: 'MSCU7394284' },
  { v: 'CSQU3054383', label: 'CSQU3054383' },
  { v: 'MSCU7394281', label: 'hatalı örnek' },
  { v: 'TGHU203105', label: 'hanesiz' },
];

export default function NumberChecker() {
  const [raw, setRaw] = useStored('cn', 'MSCU7394284');
  const inputRef = useRef<HTMLInputElement>(null);
  const r = useMemo(() => parseContainerNo(raw), [raw]);

  const owner = r.ownerCode ? lookupPrefix(r.ownerCode) : undefined;
  const cat = r.category ? CATEGORIES[r.category] ?? 'tanımsız kategori' : '—';

  let tone: 'ok' | 'bad' | 'idle' = 'idle';
  let mark = '·';
  let title = 'Numara bekleniyor';
  let detail = '4 harf + 6 rakam + kontrol hanesi';

  if (!r.normalized) {
    // varsayılan durumda kal
  } else if (r.computedCheck === undefined) {
    tone = 'bad'; mark = '✕'; title = 'Okunamadı'; detail = r.error ?? '';
  } else if (r.givenCheck === undefined) {
    tone = 'ok'; mark = '→';
    title = `Kontrol hanesi: ${r.computedCheck}`;
    detail = formatContainerNo(r.normalized + r.computedCheck);
  } else if (r.ok) {
    tone = 'ok'; mark = '✓'; title = 'Geçerli numara';
    detail = formatContainerNo(r.normalized);
  } else {
    tone = 'bad'; mark = '✕'; title = 'Kontrol hanesi hatalı';
    detail = `${r.givenCheck} girildi · ${r.computedCheck} olmalı → ${formatContainerNo(
      r.normalized.slice(0, 10) + r.computedCheck,
    )}`;
  }

  return (
    <>
      <h2>Konteyner numarası</h2>
      <p className="sub">
        ISO 6346 kontrol hanesi doğrulaması. 4 harf + 6 rakam gir, 11. haneyi hesaplasın; 11 hane
        gir, doğru olup olmadığını söylesin.
      </p>

      <div className="checker">
        <div>
          <div className="card">
            <label
              htmlFor="cnInput"
              style={{
                display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8,
              }}
            >
              Konteyner numarası
            </label>
            <input
              id="cnInput"
              ref={inputRef}
              maxLength={15}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="MSCU 739428 4"
              value={raw}
              onChange={(e) => setRaw(e.target.value.toUpperCase())}
            />

            <div className={`verdict ${tone}`}>
              <span className="mark">{mark}</span>
              <span className="txt">
                {title}
                <small>{detail}</small>
              </span>
            </div>

            <div className="samples">
              {SAMPLES.map((s) => (
                <button key={s.v} type="button" onClick={() => { setRaw(s.v); inputRef.current?.focus(); }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Çözümleme</h3>
            <div className="breakdown">
              {r.ownerCode ? (
                <>
                  <KV
                    k="Sahip kodu"
                    v={`${r.ownerCode}${owner ? ` — ${owner.owner}${owner.note ? ` (${owner.note})` : ''}` : ' — kayıtta yok'}`}
                  />
                  <KV k="Kategori" v={`${r.category} — ${cat}`} />
                  <KV k="Seri no" v={r.serial ?? '—'} />
                  <KV
                    k="Kontrol hanesi"
                    v={`${r.computedCheck}${r.givenCheck !== undefined && !r.ok ? ` (girilen: ${r.givenCheck})` : ''}`}
                  />
                </>
              ) : (
                <KV k="—" v={r.normalized ? 'çözümlenemedi' : 'giriş yok'} />
              )}
            </div>
          </div>
          <p className="note">
            Sahip kodu listesi <b>eksiktir</b> — yalnız en yaygın hatlar ve kiralama şirketleri var.
            Tam ve güncel kayıt BIC&apos;tedir. Sahiplik el değiştirebilir; devralınan numaralar eski
            hat adıyla dolaşımda kalır.
          </p>
        </div>
      </div>
    </>
  );
}
