import type { Metadata, Viewport } from 'next';
import Nav from '@/components/Nav';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Inspecter',
    template: '%s · Inspecter',
  },
  description:
    'Konteyner yükleme hesaplayıcı, ISO 6346 numara doğrulama, konteyner özellikleri ve navlun ağırlığı. Hesap yok, kayıt yok — hepsi tarayıcında çalışır.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Tek, kilitli açık tema — koyu mod kasıtlı olarak yok.
  themeColor: '#EFF1EE',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap"
        />
      </head>
      <body>
        <div className="app">
          <header className="top">
            <div className="brand">
              <b>Inspecter</b>
              <span className="rev mono">v0.1</span>
            </div>
            <p className="tagline">
              Konteyner yükleme, numara doğrulama ve navlun ağırlığı — hesap yok, kayıt yok,
              hepsi tarayıcında çalışır.
            </p>
          </header>

          <Nav />

          <main className="panel">{children}</main>

          <footer>
            Inspecter v0.1 · Tüm hesaplar tarayıcında çalışır, hiçbir veri gönderilmez.
            <br />
            Konteyner ölçüleri ve payload değerleri nominaldir; taşıyıcı spesifikasyonuyla
            doğrulanmalıdır.
            <br />
            Sahip kodları için tam kayıt:{' '}
            <a href="https://www.bic-code.org/" target="_blank" rel="noreferrer">
              bic-code.org
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}
