'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { EQUIPMENT, equipmentById, type EquipmentSpec } from '@/lib/equipment';
import { placeItems, type LineItem } from '@/lib/consolidate';
import { csvTemplate, parseCsv, parseImportRows } from '@/lib/importItems';
import { palletById, PALLETS } from '@/lib/pallets';
import { buildConsolidationPdf, shareOrDownloadPdf } from './pdfReport';
import ConsolidationScene3D, { type ConsolidationScene3DHandle, type PlacedEntry } from './ConsolidationScene3D';
import { Bar, Chip, Field, KV, fmt, pct, toNum, useStored } from './ui';

/** Kategori paleti — tema bağımsız, 14 ayırt edilebilir renk. */
const PALETTE = [
  '#E8622C', '#2E5FA3', '#3F8F4F', '#8E44AD', '#C9A227', '#1F9E93',
  '#D1495B', '#5B6EE1', '#E07A5F', '#4C956C', '#9B5DE5', '#F4A259',
  '#277DA1', '#B5838D',
];

interface StoredItem {
  id: string;
  label: string;
  l: string;
  w: string;
  h: string;
  kg: string;
  qty: string;
  stack: string;
  sideUp: string;
  /** '1' = dik silindir/varil (çap = Uzunluk = Genişlik varsayılır) */
  cylinder: string;
}

const DEFAULT_ITEMS: StoredItem[] = [
  { id: 'seed-1', label: 'Firma A', l: '120', w: '80', h: '100', kg: '300', qty: '10', stack: '', sideUp: '0', cylinder: '0' },
  { id: 'seed-2', label: 'Firma B', l: '60', w: '40', h: '40', kg: '15', qty: '40', stack: '', sideUp: '0', cylinder: '0' },
];

let seq = 0;
const newId = () => `item-${Date.now()}-${seq++}`;

export default function ConsolidationPlanner() {
  const [equipmentId, setEquipmentId] = useStored('cons-eq', '13m6-tenteli');
  const [itemsRaw, setItemsRaw] = useStored('cons-items', JSON.stringify(DEFAULT_ITEMS));
  const [fireRaw, setFireRaw] = useStored('cons-fire', '');
  /** Fire payı 0–1 — girdi % olarak alınır, 0–50 aralığına kenetlenir. */
  const firePayi = Math.min(Math.max(toNum(fireRaw, 0), 0), 50) / 100;

  const items: StoredItem[] = useMemo(() => {
    try {
      const parsed = JSON.parse(itemsRaw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ITEMS;
    } catch {
      return DEFAULT_ITEMS;
    }
  }, [itemsRaw]);

  const setItems = (next: StoredItem[]) => setItemsRaw(JSON.stringify(next));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const overIdRef = useRef<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const equipment: EquipmentSpec = equipmentById(equipmentId) ?? EQUIPMENT[0];

  const lineItems: LineItem[] = useMemo(
    () => items.map((it) => ({
      id: it.id,
      label: it.label.trim() || 'Kalem',
      l: Math.max(1, toNum(it.l, 1) * 10),
      w: Math.max(1, toNum(it.w, 1) * 10),
      h: Math.max(1, toNum(it.h, 1) * 10),
      grossKg: Math.max(0, toNum(it.kg, 0)),
      qty: Math.max(0, Math.floor(toNum(it.qty, 0))),
      maxStack: Math.max(0, Math.floor(toNum(it.stack, 0))),
      // Silindir/varil her zaman dik durur — yönelim serbest bırakılırsa yükseklik ekseni
      // kayar ve 3B görselde eksen artık gerçek yüksekliği göstermez.
      thisSideUp: it.cylinder === '1' ? true : it.sideUp === '1',
      shape: it.cylinder === '1' ? 'cylinder' : 'box',
    })),
    [items],
  );

  const result = useMemo(
    () => placeItems(equipment, lineItems, firePayi),
    [equipment, lineItems, firePayi],
  );

  // Bloklar her hesapta yeniden üretildiği için nesne referansı yerine kararlı bir
  // anahtarla ("kalem id : o kalemin bloklari icindeki sira") elle taşıma geçersiz
  // kılmalarını (override) eşliyoruz. Kalem/ekipman değişince anahtarlar da değişeceği
  // için bayat override'lar kendiliğinden devre dışı kalır (kapsamlı temizlik gerekmez).
  const [overrides, setOverrides] = useState<Map<string, { x: number; y: number; z: number }>>(new Map());

  const placed: PlacedEntry[] = useMemo(() => {
    const seen = new Map<string, number>();
    return result.blocks.map((block) => {
      const n = seen.get(block.item.id) ?? 0;
      seen.set(block.item.id, n + 1);
      const key = `${block.item.id}:${n}`;
      const override = overrides.get(key);
      return {
        key, block,
        x: override?.x ?? block.x,
        y: override?.y ?? block.y,
        z: override?.z ?? 0,
        overridden: !!override,
      };
    });
  }, [result.blocks, overrides]);

  const onMoveBlock = (key: string, x: number, y: number, z: number) =>
    setOverrides((prev) => new Map(prev).set(key, { x, y, z }));

  const onResetBlock = (key: string) =>
    setOverrides((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });

  const colorFor = (id: string) => {
    const idx = items.findIndex((it) => it.id === id);
    return PALETTE[(idx < 0 ? 0 : idx) % PALETTE.length];
  };

  const update = (id: string, patch: Partial<StoredItem>) =>
    setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const remove = (id: string) => setItems(items.filter((it) => it.id !== id));

  const reorder = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const from = items.findIndex((it) => it.id === draggedId);
    const to = items.findIndex((it) => it.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
  };

  // Native HTML5 drag-and-drop tarayıcı arası güvenilir değil (ör. Firefox dataTransfer
  // gerektirir) — fare/dokunmatik ayrımı yapmadan Pointer Events + satır konumlarıyla elle
  // sürükleme (document.elementFromPoint yerine getBoundingClientRect: kaydırılmış/gizli
  // alanlarda da tutarlı çalışır).
  useEffect(() => {
    if (!draggingId) return;
    const onMove = (e: PointerEvent) => {
      let id: string | null = null;
      for (const [rowId, el] of rowRefs.current) {
        const r = el.getBoundingClientRect();
        if (e.clientY >= r.top && e.clientY <= r.bottom) { id = rowId; break; }
      }
      overIdRef.current = id;
      setOverId(id);
    };
    const onUp = () => {
      const target = overIdRef.current;
      if (target) reorder(draggingId, target);
      overIdRef.current = null;
      setOverId(null);
      setDraggingId(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingId]);

  const add = () =>
    setItems([
      ...items,
      { id: newId(), label: `Kalem ${items.length + 1}`, l: '60', w: '40', h: '40', kg: '10', qty: '10', stack: '', sideUp: '0', cylinder: '0' },
    ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inspecter-kalem-sablonu.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // aynı dosyayı tekrar seçebilmek için sıfırla
    if (!file) return;
    const text = await file.text();
    const { items: imported, warnings } = parseImportRows(parseCsv(text));
    setImportWarnings(warnings);
    setImportedCount(imported.length > 0 ? imported.length : null);
    if (imported.length === 0) return;
    const next: StoredItem[] = imported.map((it) => ({
      id: newId(),
      label: it.label,
      l: String(it.l),
      w: String(it.w),
      h: String(it.h),
      kg: String(it.kg),
      qty: String(it.qty),
      stack: it.maxStack !== null ? String(it.maxStack) : '',
      sideUp: it.thisSideUp ? '1' : '0',
      cylinder: '0',
    }));
    setItems([...items, ...next]);
  };

  const trailers = EQUIPMENT.filter((e) => e.kind === 'trailer');
  const containers = EQUIPMENT.filter((e) => e.kind === 'container');

  const sceneRef = useRef<ConsolidationScene3DHandle>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfNote, setPdfNote] = useState<string | null>(null);

  const handleExportPdf = async () => {
    setPdfBusy(true);
    setPdfNote(null);
    try {
      const snapshot = sceneRef.current?.captureImage() ?? null;
      const reportItems = items.map((it) => ({
        label: it.label.trim() || 'Kalem',
        l: toNum(it.l), w: toNum(it.w), h: toNum(it.h), kg: toNum(it.kg, 0),
        qty: Math.max(0, Math.floor(toNum(it.qty, 0))),
        cylinder: it.cylinder === '1',
      }));
      const blob = buildConsolidationPdf(equipment, result, reportItems, snapshot);
      const outcome = await shareOrDownloadPdf(blob, `inspecter-${equipment.id}.pdf`);
      setPdfNote(outcome === 'shared' ? 'Paylaşıldı.' : 'PDF indirildi.');
    } catch {
      setPdfNote('PDF oluşturulamadı — tekrar dene.');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <>
      <h2>Konsolidasyon planlayıcı</h2>
      <p className="sub">
        Farklı ölçü ve ağırlıktaki kalemleri tek ekipmana yerleştir; 3D&apos;de döndürüp incele,
        hangi kısıtın — uzunluk mu ağırlık mı — bağladığını gör. Kalemler <b>öncelik sırasına</b>{' '}
        (listedeki sıraya, ⠿ ile değiştir) göre otomatik yerleşir; beğenmezsen sahnedeki{' '}
        <b>Taşıma modunu</b> açıp blokları elle düzenleyebilirsin — bloklar asla iç içe girmez.
      </p>

      <div className="card">
        <div className="fields" style={{ gridTemplateColumns: '2fr 1fr', maxWidth: 560 }}>
          <div className="f">
            <label htmlFor="eq-select">Ekipman</label>
            <select id="eq-select" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
              <optgroup label="Treyler">
                {trailers.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </optgroup>
              <optgroup label="Konteyner">
                {containers.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <Field
            id="fire-payi"
            label="Fire payı"
            hint="% · ambalaj / bağlama payı, boş = 0"
            value={fireRaw}
            onChange={setFireRaw}
            placeholder="0"
            min={0}
            max={50}
            step={1}
            inputMode="numeric"
          />
        </div>

        <h3 style={{ marginTop: 20 }}>Kalemler</h3>
        <div className="itemlist">
          {items.map((it, i) => (
            <ItemRow
              key={it.id}
              it={it}
              priority={i + 1}
              color={colorFor(it.id)}
              onChange={(patch) => update(it.id, patch)}
              onRemove={() => remove(it.id)}
              removable={items.length > 1}
              dragging={draggingId === it.id}
              dragOver={overId === it.id && draggingId !== it.id}
              onDragHandleDown={() => setDraggingId(it.id)}
              rowRef={(el) => {
                if (el) rowRefs.current.set(it.id, el);
                else rowRefs.current.delete(it.id);
              }}
            />
          ))}
        </div>
        <div className="itemtoolbar" style={{ marginTop: 4 }}>
          <button type="button" className="addbtn" onClick={add}>
            + Kalem ekle
          </button>
          <button type="button" className="rowbtn" onClick={() => fileInputRef.current?.click()}>
            Excel/CSV içe aktar
          </button>
          <button type="button" className="rowbtn" onClick={downloadTemplate}>
            Şablonu indir
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />
        </div>

        {importWarnings.length > 0 ? (
          <p className="note warnbox">
            <b>İçe aktarma uyarıları:</b> {importWarnings.join(' ')}
          </p>
        ) : null}
        {importedCount !== null ? (
          <p className="note">
            <b>{importedCount} kalem</b> listeye eklendi — aşağıda kontrol edip gerekirse düzenle.
          </p>
        ) : null}
      </div>

      <div className="results" style={{ marginTop: 20, gridTemplateColumns: '1fr' }}>
        <div className={`res${result.boundBy === 'none' ? ' best' : ''}`}>
          <div className="hd">
            <div className="nm">{equipment.name}</div>
            {result.boundBy !== 'none' ? (
              <Chip tone="s">{result.boundBy === 'length' ? 'uzunluk aşıldı' : 'ağırlık aşıldı'}</Chip>
            ) : (
              <Chip tone="a">sığıyor</Chip>
            )}
          </div>

          <div className="bars" style={{ marginTop: 12 }}>
            <Bar
              label={`UZUNLUK ${fmt(result.totalLengthUsed / 10)} / ${fmt((equipment.L * (1 - result.allowance)) / 10)} cm${result.allowance > 0 ? ` · %${Math.round(result.allowance * 100)} PAY DÜŞÜLDÜ` : ''}`}
              value={result.lengthUtil}
              right={pct(result.lengthUtil)}
              hot={result.boundBy === 'length'}
            />
            <Bar
              label={`AĞIRLIK ${fmt(result.totalWeight)} / ${fmt(equipment.payload * (1 - result.allowance))} kg${result.allowance > 0 ? ` · %${Math.round(result.allowance * 100)} PAY DÜŞÜLDÜ` : ''}`}
              value={result.weightUtil}
              right={pct(result.weightUtil)}
              hot={result.boundBy === 'weight'}
            />
          </div>

          {result.blocks.length > 0 ? (
            <div className="planmeta" style={{ marginTop: 12 }}>
              <KV k="Net yük hacmi" v={`${fmt(result.cargoVolume / 1e9, 1)} m³`} />
              <KV
                k="Fire (boşluk)"
                v={`${fmt(result.voidVolume / 1e9, 1)} m³ · dolu bölümde %${Math.round(result.voidRatio * 100)}`}
              />
            </div>
          ) : null}

          {result.blocks.length > 0 ? (
            <>
              <button
                type="button"
                className="rowbtn"
                style={{ marginTop: 12 }}
                onClick={handleExportPdf}
                disabled={pdfBusy}
              >
                {pdfBusy ? 'PDF hazırlanıyor…' : 'PDF oluştur / Paylaş'}
              </button>
              {pdfNote ? <span className="hint" style={{ marginLeft: 10 }}>{pdfNote}</span> : null}
            </>
          ) : null}

          <div className="legend">
            {items.map((it, i) => (
              <span key={it.id} className="li">
                <span className="swatch" style={{ background: colorFor(it.id) }} />
                #{i + 1} {it.label.trim() || 'Kalem'} · {Math.max(0, Math.floor(toNum(it.qty, 0)))} adet
              </span>
            ))}
          </div>

          {result.unfitItems.length > 0 ? (
            <p className="note warnbox">
              <b>Sığmayan kalemler:</b> {result.unfitItems.map((i) => i.label).join(', ')} — hiçbir
              yönelimde ekipmanın genişlik × yüksekliğine sığmıyor. Ölçüleri kontrol et.
            </p>
          ) : null}

          {result.boundBy !== 'none' ? (
            <p className="note warnbox">
              <b>Kapasite aşıldı.</b>{' '}
              {result.boundBy === 'length'
                ? `Gereken uzunluk ${fmt(result.lengthOverflow / 10)} cm fazla.`
                : `Toplam ağırlık ${fmt(result.weightOverflow)} kg fazla.`}{' '}
              Kalem miktarını veya ekipmanı gözden geçir.
            </p>
          ) : null}

          <div className="scene3d">
            <ConsolidationScene3D
              ref={sceneRef}
              equipment={equipment}
              placed={placed}
              colorFor={colorFor}
              onMoveBlock={onMoveBlock}
              onResetBlock={onResetBlock}
            />
            <span className="scenehint">
              döndür: sürükle · taşı: Taşıma modu ya da CTRL · ince ayar: seç + ok tuşları
            </span>
          </div>
        </div>
      </div>

      <p className="note">
        Bu bir yerleşim <b>tahminidir</b>. Kalemler öncelik sırasıyla işlenir; bir kalem yüksekliği
        tam doldurmazsa sıradaki kalemler aynı dilimde üst üste yerleşir, ancak yeni bir uzunluk
        dilimi ancak mevcutlarda yer kalmayınca açılır — tam 3D bin-packing yapılmaz.{' '}
        <b>Fire (boşluk)</b> satırı, kasanın dolu bölümünde kalan gerçek hava hacmini gösterir
        (genişlik şeridi, sütun tepesi, eksik son sıra). Ambalaj şişmesi ve bağlama gibi
        hesaplanamayan kayıplar için <b>fire payı %</b> girerek kapasiteyi ihtiyatlı kısabilirsin.
      </p>
    </>
  );
}

function ItemRow({ it, priority, color, onChange, onRemove, removable, dragging, dragOver, onDragHandleDown, rowRef }: {
  it: StoredItem;
  priority: number;
  color: string;
  onChange: (patch: Partial<StoredItem>) => void;
  onRemove: () => void;
  removable: boolean;
  dragging: boolean;
  dragOver: boolean;
  onDragHandleDown: () => void;
  rowRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={rowRef}
      className={`itemrow${dragging ? ' dragging' : ''}${dragOver ? ' dragover' : ''}`}
      data-item-id={it.id}
    >
      <div className="ihd">
        <span
          className="draghandle"
          onPointerDown={(e) => {
            e.preventDefault();
            onDragHandleDown();
          }}
          title="Sürükleyerek sırala"
          aria-label={`Öncelik #${priority} — sürükleyerek sırala`}
        >⠿</span>
        <span className="swatch" style={{ background: color }} title={`Öncelik #${priority}`} />
        <div>
          <Field
            id={`${it.id}-label`}
            label={`Etiket · öncelik #${priority}`}
            type="text"
            value={it.label}
            onChange={(v) => onChange({ label: v })}
            placeholder="Firma / kalem adı"
          />
        </div>
        {removable ? (
          <button type="button" className="rowbtn" onClick={onRemove}>Sil</button>
        ) : null}
      </div>

      <div className="ifields">
        <Field id={`${it.id}-l`} label="Uzunluk" hint="cm" value={it.l} onChange={(v) => onChange({ l: v })} step={0.1} />
        <Field id={`${it.id}-w`} label="Genişlik" hint="cm" value={it.w} onChange={(v) => onChange({ w: v })} step={0.1} />
        <Field id={`${it.id}-h`} label="Yükseklik" hint="cm" value={it.h} onChange={(v) => onChange({ h: v })} step={0.1} />
        <Field id={`${it.id}-kg`} label="Brüt ağırlık" hint="kg/adet" value={it.kg} onChange={(v) => onChange({ kg: v })} step={0.1} />
        <Field id={`${it.id}-qty`} label="Adet" value={it.qty} onChange={(v) => onChange({ qty: v })} min={0} step={1} inputMode="numeric" />
        <Field id={`${it.id}-stack`} label="Azami kat" hint="boş=sınırsız" value={it.stack} onChange={(v) => onChange({ stack: v })} placeholder="sınırsız" step={1} inputMode="numeric" />
      </div>

      <div className="iopts">
        <label className={`chk${it.sideUp === '1' ? ' on' : ''}`}>
          <input
            type="checkbox"
            checked={it.sideUp === '1'}
            onChange={(e) => onChange({ sideUp: e.target.checked ? '1' : '0' })}
          />
          Bu taraf yukarı
        </label>

        <label className={`chk${it.cylinder === '1' ? ' on' : ''}`} title="Çap için Uzunluk = Genişlik gir">
          <input
            type="checkbox"
            checked={it.cylinder === '1'}
            onChange={(e) => onChange({ cylinder: e.target.checked ? '1' : '0' })}
          />
          Silindir (çap = Uzunluk = Genişlik)
        </label>

        <select
          className="palletselect"
          value=""
          aria-label="Palet ekle"
          onChange={(e) => {
            const pallet = palletById(e.target.value);
            if (!pallet) return;
            // Sayı girdisine yazılan değer HTML sayı biçiminde olmalı (nokta ondalık) —
            // fmt() gösterim içindir, tr-TR virgülü number input'ta sessizce reddedilir.
            onChange({
              l: String(pallet.l),
              w: String(pallet.w),
              h: String(Math.round((toNum(it.h, 0) + pallet.h) * 10) / 10),
              kg: String(Math.round((toNum(it.kg, 0) + pallet.kg) * 10) / 10),
            });
          }}
        >
          <option value="">+ Palet ekle…</option>
          {PALLETS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="hint" style={{ marginTop: 4 }}>
        Palet seçilince taban ölçüsü palete ayarlanır, yüksekliğe ve ağırlığa palet eklenir —
        sonra normal kalem gibi düzenleyebilirsin.
      </div>
    </div>
  );
}
