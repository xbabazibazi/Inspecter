/**
 * 3D sahnenin kamera ön ayarları — saf matematik, React/three'den bağımsız.
 *
 * `lib/` altında duruyor çünkü test edilebilir olması gerekiyor: bileşenin
 * içinde kalsaydı test dosyası react-three-fiber/drei zincirini de çekmek
 * zorunda kalırdı.
 *
 * Sahne ekseni: uzunluk X, genişlik Z, yükseklik Y.
 */

export type ViewName = '3d' | 'side' | 'front' | 'top';

/** Kullanıcıya gösterilen görünüm düğmeleri — PDF'teki 2D görünümlerle aynı bakışlar. */
export const VIEWS: Array<{ name: ViewName; label: string }> = [
  { name: '3d', label: '3D' },
  { name: 'side', label: 'Yandan' },
  { name: 'front', label: 'Önden' },
  { name: 'top', label: 'Üstten' },
];

export function presetCamera(
  view: ViewName,
  L: number,
  W: number,
  H: number,
  diag: number,
): { pos: [number, number, number]; target: [number, number, number] } {
  const target: [number, number, number] = [0, H * 0.35, 0];
  switch (view) {
    case 'side':
      // +Z'den bak -> X–Y düzlemi görünür (uzunluk × yükseklik)
      return { pos: [0, H * 0.35, diag * 1.15], target };
    case 'front':
      // +X'ten bak -> Z–Y düzlemi görünür (genişlik × yükseklik)
      return { pos: [diag * 1.15, H * 0.35, 0], target };
    case 'top':
      // Tam tepeden bakınca "yukarı" vektörü belirsizleşir; ihmal edilebilir
      // bir Z kaydırması kamera yönünü tanımlı tutar.
      return { pos: [0, diag * 1.25, 0.001], target };
    default:
      return { pos: [L * 0.4, diag * 0.5, W * 1.6], target };
  }
}
