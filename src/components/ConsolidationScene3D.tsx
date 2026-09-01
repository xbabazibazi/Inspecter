'use client';

import { useEffect, useRef, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Canvas } from '@react-three/fiber';
import { Billboard, Edges, Grid, OrbitControls, Text } from '@react-three/drei';
import { Plane, Vector3 } from 'three';
import { boxesOverlap, boxFromBlock, resolvePlacement, type Box3, type PlacedItemBlock } from '@/lib/consolidate';
import type { EquipmentSpec } from '@/lib/equipment';

/** mm -> sahne birimi (metre). three.js sahneleri metre ölçeğinde daha iyi davranır. */
const SCALE = 1 / 1000;

/** Uzunluk cetveli için "yuvarlak" aralık (cm) — toplam boyda ~16 işaretten fazla olmasın. */
function niceStepCm(totalCm: number): number {
  for (const step of [25, 50, 100, 200, 250, 500, 1000]) {
    if (totalCm / step <= 16) return step;
  }
  return 2000;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

export interface PlacedEntry {
  /** Bloğun oturumda kararlı kimliği: `${item.id}:${o kalemin bloklari icindeki sira}` */
  key: string;
  block: PlacedItemBlock;
  /** Görsel uzunluk konumu (mm) — elle taşınmışsa override, değilse block.x */
  x: number;
  /** Görsel yükseklik konumu (mm) — elle taşınmışsa override, değilse block.y */
  y: number;
  /** Görsel genişlik ofseti (mm) — elle taşınmışsa override, değilse 0 */
  z: number;
  overridden: boolean;
}

export default function ConsolidationScene3D({
  equipment,
  placed,
  colorFor,
  onMoveBlock,
  onResetBlock,
}: {
  equipment: EquipmentSpec;
  placed: PlacedEntry[];
  colorFor: (id: string) => string;
  onMoveBlock: (key: string, x: number, y: number, z: number) => void;
  onResetBlock: (key: string) => void;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = placed.find((p) => p.key === selectedKey) ?? null;

  // Blok taşıma modu iki yoldan açılır: görünür "Taşıma modu" anahtarı (dokunmatik dahil
  // herkese) veya CTRL basılı tutma (klavye kısayolu). Mod açıkken kamera döndürme
  // (OrbitControls) devre dışı kalır — ikisi aynı sürükleme hareketini paylaşamaz.
  const [moveMode, setMoveMode] = useState(false);
  const [ctrlHeld, setCtrlHeld] = useState(false);
  const moveActive = moveMode || ctrlHeld;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Control') setCtrlHeld(true); };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'Control') setCtrlHeld(false); };
    const onBlur = () => setCtrlHeld(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  /** Seçili bloğu uzunlukta (mm) ve yükseklikte (kat) kaydırır; çakışan hedef uygulanmaz. */
  const nudgeSelected = (dxMm: number, dyLayers: number) => {
    if (!selected) return;
    const occH = selected.block.nz * selected.block.bh;
    const nextX = clamp(selected.x + dxMm, 0, equipment.L - selected.block.length);
    const nextY = clamp(selected.y + dyLayers * selected.block.bh, 0, equipment.H - occH);
    if (nextX === selected.x && nextY === selected.y) return;

    const box = boxFromBlock(selected.block, nextX, selected.z, nextY);
    const others = placed
      .filter((p) => p.key !== selected.key)
      .map((p) => boxFromBlock(p.block, p.x, p.z, p.y));
    if (!others.some((ob) => boxesOverlap(box, ob))) {
      onMoveBlock(selected.key, nextX, nextY, selected.z);
    }
  };

  // CTRL+tekerlek tarayıcının kendi sayfa yakınlaştırma kısayoluyla çakışıyor — bunun yerine
  // seçili bloğu ok tuşlarıyla ince ayarla taşı: Yukarı/Aşağı = yükseklik (kat), Sol/Sağ = uzunluk.
  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // Form girdisinde yazan kullanıcının ok tuşlarını gaspetme — sayı kutusunun kendi
      // artır/azalt davranışı bloğa taşınmaktan önce gelir.
      if ((e.target as HTMLElement | null)?.closest('input, select, textarea')) return;
      const stepX = 50; // mm
      if (e.key === 'ArrowLeft') nudgeSelected(-stepX, 0);
      else if (e.key === 'ArrowRight') nudgeSelected(stepX, 0);
      else if (e.key === 'ArrowUp') nudgeSelected(0, 1);
      else if (e.key === 'ArrowDown') nudgeSelected(0, -1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, placed, equipment, onMoveBlock]);

  const Lm = Math.max(0.1, equipment.L * SCALE);
  const Wm = Math.max(0.1, equipment.W * SCALE);
  const Hm = Math.max(0.1, equipment.H * SCALE);
  const diag = Math.sqrt(Lm * Lm + Wm * Wm + Hm * Hm);

  return (
    <>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [Lm * 0.4, diag * 0.5, Wm * 1.6], fov: 45, near: 0.05, far: diag * 30 }}
        onPointerMissed={() => setSelectedKey(null)}
        style={{ cursor: moveActive ? 'move' : 'auto' }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[Lm * 0.5, Hm * 4, Wm * 2]} intensity={0.9} />
        <directionalLight position={[-Lm * 0.5, Hm * 2, -Wm * 1.5]} intensity={0.35} />

        <EquipmentFrame L={Lm} W={Wm} H={Hm} />

        <Grid
          args={[Lm * 1.6, Wm * 1.6]}
          cellSize={Math.max(0.5, Lm / 20)}
          sectionSize={(niceStepCm(equipment.L / 10) / 100)}
          cellColor="#8a938e"
          sectionColor="#5c655f"
          fadeDistance={diag * 3}
          infiniteGrid
        />

        <LengthRuler equipment={equipment} Lm={Lm} Wm={Wm} />

        {placed.map((p) => (
          <ItemBlockMesh
            key={p.key}
            entry={p}
            equipment={equipment}
            color={colorFor(p.block.item.id)}
            selected={p.key === selectedKey}
            onSelect={() => setSelectedKey((s) => (s === p.key ? null : p.key))}
            onMoveBlock={onMoveBlock}
            dragEnabled={moveActive}
            otherBoxes={placed
              .filter((o) => o.key !== p.key)
              .map((o) => boxFromBlock(o.block, o.x, o.z, o.y))}
          />
        ))}

        <OrbitControls
          makeDefault
          enabled={!moveActive}
          target={[0, Hm * 0.25, 0]}
          minDistance={diag * 0.15}
          maxDistance={diag * 5}
        />
      </Canvas>

      <label className={`chk scenemode${moveActive ? ' on' : ''}`}>
        <input
          type="checkbox"
          checked={moveMode}
          onChange={(e) => setMoveMode(e.target.checked)}
        />
        Taşıma modu
      </label>

      {selected ? (
        <div className="sceneitem">
          <span>
            <b>{selected.block.item.label}</b> · {selected.block.item.qty} adet ·{' '}
            {fmtKg(selected.block.item.grossKg * selected.block.item.qty)} kg ·{' '}
            {mmToCm(selected.block.item.l)}×{mmToCm(selected.block.item.w)}×{mmToCm(selected.block.item.h)} cm
          </span>
          <button type="button" className="rowbtn" aria-label="Bir kat yukarı" onClick={() => nudgeSelected(0, 1)}>▲ kat</button>
          <button type="button" className="rowbtn" aria-label="Bir kat aşağı" onClick={() => nudgeSelected(0, -1)}>▼ kat</button>
          {selected.overridden ? (
            <button type="button" className="rowbtn" onClick={() => onResetBlock(selected.key)}>
              Otomatiğe döndür
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function mmToCm(mm: number): string {
  return (mm / 10).toFixed(0);
}

function fmtKg(kg: number): string {
  return kg.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
}

/** Uzunluk ekseni boyunca ölçü işaretleri — nereye ne kadar geldiğine referans. */
function LengthRuler({ equipment, Lm, Wm }: { equipment: EquipmentSpec; Lm: number; Wm: number }) {
  const totalCm = equipment.L / 10;
  const stepCm = niceStepCm(totalCm);
  const count = Math.ceil(totalCm / stepCm);
  const ticks = Array.from({ length: count + 1 }, (_, i) => Math.min(i * stepCm, totalCm));
  const edgeZ = -Wm / 2 - 0.12;
  const fontSize = Math.max(0.09, Lm * 0.014);

  return (
    <group>
      {ticks.map((cm) => {
        const x = (cm * 10 - equipment.L / 2) * SCALE;
        return (
          <group key={cm} position={[x, 0.01, edgeZ]}>
            <mesh>
              <boxGeometry args={[0.02, 0.02, 0.16]} />
              <meshBasicMaterial color="#c0392b" />
            </mesh>
            <Billboard position={[0, 0, -0.15]}>
              <Text fontSize={fontSize} color="#c0392b" outlineWidth={fontSize * 0.06} outlineColor="#ffffff" anchorX="center" anchorY="middle">
                {Math.round(cm)}
              </Text>
            </Billboard>
          </group>
        );
      })}
    </group>
  );
}

/** Ekipmanın tel kafes gövdesi (taban ortada, zemin y=0). */
function EquipmentFrame({ L, W, H }: { L: number; W: number; H: number }) {
  return (
    <mesh position={[0, H / 2, 0]}>
      <boxGeometry args={[L, H, W]} />
      <meshBasicMaterial visible={false} />
      <Edges color="#828b87" />
    </mesh>
  );
}

/**
 * Bir kalemin blok gösterimi — koli koli değil, tek renkli tutarlı bir hacim
 * (screenshot'taki gibi). CTRL basılıyken fare ile zemin düzleminde (uzunluk × genişlik)
 * sürüklenir (pointer capture + bloğun kendi yüksekliğindeki sabit düzlemle ışın kesişimi).
 * Yükseklik ve ince ayar için: bloğu tıklayıp seç, ok tuşlarıyla taşı (bkz. üst bileşendeki
 * keydown dinleyicisi — CTRL+tekerlek yerine, tarayıcı sayfa yakınlaştırmasıyla çakışmasın diye).
 *
 * Sürüklerken diğer bloklardan serbestçe geçilebilir (çarpışma kontrolü yapılmaz) — bu
 * sadece yerel, geçici bir önizleme. Bırakınca (pointerup) son konum diğer bloklarla
 * çakışıyorsa, kalıcı hale getirilmez; blok son geçerli konumunda kalır.
 */
function ItemBlockMesh({
  entry, equipment, color, selected, onSelect, onMoveBlock, dragEnabled, otherBoxes,
}: {
  entry: PlacedEntry;
  equipment: EquipmentSpec;
  color: string;
  selected: boolean;
  onSelect: () => void;
  onMoveBlock: (key: string, x: number, y: number, z: number) => void;
  dragEnabled: boolean;
  otherBoxes: Box3[];
}) {
  const { block, x: baseX, y: baseY, z: baseZ, overridden } = entry;

  // Sürüklerken yalnız yerel (bu bileşene özel) bir önizleme konumu tutulur; ebeveynin
  // kalıcı override state'i ancak geçerli (çakışmayan) bir bırakışta güncellenir.
  const [live, setLive] = useState<{ x: number; z: number } | null>(null);
  const xMm = live?.x ?? baseX;
  const zMm = live?.z ?? baseZ;
  const yMm = baseY; // yükseklik yalnızca tekerlekle (anlık commit) değişir, sürüklemede sabit kalır

  const occW = block.ny * block.bw;
  const occH = block.nz * block.bh;

  const sizeL = Math.max(0.01, block.length * SCALE);
  const sizeH = Math.max(0.01, occH * SCALE);
  const sizeW = Math.max(0.01, occW * SCALE);

  // Bitişik (aralarında boşluk bırakılmadan dizilen) bloklar, saydam malzeme yüzünden
  // açılı kamerada iç içeymiş gibi görünebiliyor. Yalnızca çizimde, gerçek konum/veriyi
  // etkilemeden her yüzden ince bir pay bırakarak komşuluğu görsel olarak netleştiriyoruz.
  const GAP = 0.02; // ~2cm, dünya birimi
  const renderL = Math.max(sizeL * 0.7, sizeL - GAP);
  const renderH = Math.max(sizeH * 0.7, sizeH - GAP);
  const renderW = Math.max(sizeW * 0.7, sizeW - GAP);

  const worldX = (xMm + block.length / 2 - equipment.L / 2) * SCALE;
  const worldY = yMm * SCALE + sizeH / 2;
  const worldZ = (zMm + occW / 2 - equipment.W / 2) * SCALE;

  const labelFontSize = Math.max(0.08, Math.min(sizeL, sizeW) * 0.22);

  const dragPlane = useRef(new Plane(new Vector3(0, 1, 0), -worldY));
  const grabOffset = useRef({ dx: 0, dz: 0 });
  const hitPoint = useRef(new Vector3());
  const dragging = useRef(false);

  const rayToMm = (e: ThreeEvent<PointerEvent>): { x: number; z: number } | null => {
    dragPlane.current.constant = -worldY;
    if (!e.ray.intersectPlane(dragPlane.current, hitPoint.current)) return null;
    return {
      x: hitPoint.current.x / SCALE + equipment.L / 2,
      z: hitPoint.current.z / SCALE + equipment.W / 2,
    };
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    // Seçim burada, koşulsuz yapılır — tarayıcının native `click` olayına güvenmiyoruz:
    // OrbitControls aynı canvas'ı dinlediği için en ufak fare titremesi bile "click"i
    // sürüklemeye çevirip olayı yutabilir, seçim hiç tetiklenmez.
    onSelect();
    if (!dragEnabled) return; // CTRL basılı değil — olay dokunulmadan kameraya (OrbitControls) geçsin
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragging.current = true;
    const hit = rayToMm(e);
    grabOffset.current = hit ? { dx: hit.x - baseX, dz: hit.z - baseZ } : { dx: 0, dz: 0 };
    setLive({ x: baseX, z: baseZ });
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragEnabled || !dragging.current || e.buttons === 0) return;
    const hit = rayToMm(e);
    if (!hit) return;
    const nextX = clamp(hit.x - grabOffset.current.dx, 0, equipment.L - block.length);
    const nextZ = clamp(hit.z - grabOffset.current.dz, 0, equipment.W - occW);
    setLive({ x: nextX, z: nextZ });
  };

  // Bırakış: konum serbestse aynen, bir bloğa çakışıyorsa geri fırlatmak yerine
  // resolvePlacement ile o bloğun hemen yanına itilerek yerleştirilir. Yalnızca hiçbir
  // komşu kenar da uymuyorsa (çok sıkışık sahne) son geçerli konumda kalır.
  const commitDrop = () => {
    dragging.current = false;
    setLive((cur) => {
      if (!cur) return null;
      const spot = resolvePlacement(block, cur.x, cur.z, yMm, otherBoxes, equipment);
      if (spot) onMoveBlock(entry.key, spot.x, yMm, spot.z);
      return null;
    });
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!dragEnabled || !dragging.current) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    commitDrop();
  };

  // Fare hâlâ basılıyken CTRL (veya Taşıma modu) bırakılırsa sürükleme yarım kalmasın:
  // o anki konum aynı kurallarla yerleştirilir — blok "başa fırlamaz".
  useEffect(() => {
    if (!dragEnabled && dragging.current) commitDrop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragEnabled]);

  return (
    <group>
      <mesh
        position={[worldX, worldY, worldZ]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <boxGeometry args={[renderL, renderH, renderW]} />
        <meshStandardMaterial color={color} transparent opacity={selected ? 0.97 : 0.9} />
        <Edges color={overridden ? '#c0392b' : '#1a1f1d'} />
      </mesh>

      <Billboard position={[worldX, worldY + sizeH / 2 + 0.12, worldZ]}>
        <Text
          fontSize={labelFontSize}
          color="#ffffff"
          outlineWidth={labelFontSize * 0.08}
          outlineColor="#1a1f1d"
          anchorX="center"
          anchorY="bottom"
          maxWidth={Math.max(sizeL, sizeW) * 1.4}
          textAlign="center"
        >
          {block.item.label}
        </Text>
      </Billboard>
    </group>
  );
}
