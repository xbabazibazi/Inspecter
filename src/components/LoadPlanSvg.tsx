'use client';

import type { Block, LoadResult } from '@/lib/loadcalc';
import { KV } from './ui';

/** Tek karo olarak çizilecek azami dikdörtgen sayısı. Aşılırsa blok konturuna düşülür. */
const MAX_RECTS = 2400;

/**
 * Konteyner tabanının üstten görünümü.
 * Ana blok koyu, artık şeritler açık tonda çizilir — algoritmanın ne yaptığı
 * doğrudan görünür olsun diye.
 */
export default function LoadPlanSvg({ result }: { result: LoadResult }) {
  const { container: c, blocks } = result;
  if (!blocks.length) return null;

  const W = 640;
  const pad = 10;
  const sc = (W - pad * 2) / c.L;
  const H = Math.round(c.W * sc) + pad * 2;
  const totalRects = blocks.reduce((s, b) => s + b.nx * b.ny, 0);
  const detailed = totalRects <= MAX_RECTS;

  return (
    <div className="plan">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${c.name} üstten yerleşim görünümü`}>
        <rect
          x={pad} y={pad} width={c.L * sc} height={c.W * sc}
          fill="none" stroke="var(--rule-strong)" strokeWidth={1.5}
        />
        {blocks.map((b, bi) =>
          detailed ? renderTiles(b, bi, pad, sc) : renderOutline(b, bi, pad, sc),
        )}
      </svg>

      <div className="planmeta">
        {blocks.map((b, i) => (
          <KV
            key={i}
            k={b.main ? 'Ana blok' : `Artık şerit ${i}`}
            v={`${b.nx} × ${b.ny} × ${b.nz} kat · ${b.bl / 10}×${b.bw / 10}×${b.bh / 10} cm`}
          />
        ))}
        {!detailed ? <KV k="Görünüm" v="çok fazla koli — bloklar kontur olarak çizildi" /> : null}
      </div>
    </div>
  );
}

function renderTiles(b: Block, bi: number, pad: number, sc: number) {
  const fill = b.main ? 'var(--accent)' : 'var(--accent-2)';
  const op = b.main ? 0.78 : 0.5;
  const out: React.ReactElement[] = [];
  for (let i = 0; i < b.nx; i++) {
    for (let j = 0; j < b.ny; j++) {
      out.push(
        <rect
          key={`${bi}-${i}-${j}`}
          x={pad + (b.x + i * b.bl) * sc}
          y={pad + (b.y + j * b.bw) * sc}
          width={Math.max(1, b.bl * sc - 0.8)}
          height={Math.max(1, b.bw * sc - 0.8)}
          fill={fill}
          fillOpacity={op}
          rx={0.8}
        />,
      );
    }
  }
  return <g key={bi}>{out}</g>;
}

function renderOutline(b: Block, bi: number, pad: number, sc: number) {
  const fill = b.main ? 'var(--accent)' : 'var(--accent-2)';
  return (
    <rect
      key={bi}
      x={pad + b.x * sc}
      y={pad + b.y * sc}
      width={b.nx * b.bl * sc}
      height={b.ny * b.bw * sc}
      fill={fill}
      fillOpacity={0.35}
      stroke={fill}
      strokeWidth={1}
    />
  );
}
