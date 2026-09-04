import type { MetadataRoute } from 'next';

// `output: 'export'` statik üretimde bu route'un derleme zamanında sabitlenmesini gerektirir.
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Inspecter',
    short_name: 'Inspecter',
    description:
      'Konteyner yükleme hesaplayıcı, ISO 6346 doğrulama, konteyner özellikleri, navlun ağırlığı ve 3D konsolidasyon planlayıcı.',
    start_url: '/',
    display: 'standalone',
    background_color: '#EFF1EE',
    theme_color: '#EFF1EE',
    lang: 'tr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
