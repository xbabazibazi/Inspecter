'use client';

import { useEffect } from 'react';

/** Service worker kaydı — sayfa render'ını bloklamasın diye ayrı, görünmez bir bileşen. */
export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* PWA olmadan da araçlar çalışır */ });
    }
  }, []);
  return null;
}
