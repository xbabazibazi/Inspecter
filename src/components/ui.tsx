'use client';

import React from 'react';

/** Etiketli sayı girişi. Mobilde doğru klavyeyi açar. */
export function Field({
  id, label, hint, value, onChange, type = 'number', placeholder, min = 0, max, step = 'any', inputMode = 'decimal',
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number | 'any';
  inputMode?: 'decimal' | 'numeric' | 'text';
}) {
  return (
    <div className="f">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

/** İki seçenekli anahtar. */
export function Segmented<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Doluluk çubuğu. `hot` kısıtın bağladığı çubuğu işaretler. */
export function Bar({ label, value, right, hot }: { label: React.ReactNode; value: number; right: string; hot?: boolean }) {
  return (
    <div className="bar">
      <div className="lb">
        <span>{label}</span>
        <b>{right}</b>
      </div>
      <div className="track">
        <i className={hot ? 'hot' : ''} style={{ width: `${Math.min(100, value * 100).toFixed(1)}%` }} />
      </div>
    </div>
  );
}

export function KV({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="kv">
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}

export function Chip({ tone = 'n', children }: { tone?: 'a' | 'w' | 's' | 'n'; children: React.ReactNode }) {
  return <span className={`chip ${tone}`}>{children}</span>;
}

/** Sayı biçimleyiciler — tüm uygulamada aynı görünüm. */
export const fmt = (n: number, d = 0) =>
  Number(n).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
export const pct = (x: number) => `${Math.round(x * 100)}%`;
export const toNum = (s: string, def = 0) => {
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : def;
};

/** localStorage — her erişim try/catch, çünkü gizli sekmede fırlatabilir. */
export function useStored(key: string, initial: string): [string, (v: string) => void] {
  const [v, setV] = React.useState(initial);
  React.useEffect(() => {
    try {
      const s = localStorage.getItem(`mfst.${key}`);
      if (s !== null) setV(s);
    } catch { /* yok sayılır */ }
  }, [key]);
  const set = React.useCallback((next: string) => {
    setV(next);
    try { localStorage.setItem(`mfst.${key}`, next); } catch { /* yok sayılır */ }
  }, [key]);
  return [v, set];
}
