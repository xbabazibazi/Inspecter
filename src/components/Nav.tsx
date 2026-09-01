'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/yukleme', label: 'Yükleme' },
  { href: '/konsolidasyon', label: 'Konsolidasyon 3D' },
  { href: '/konteynerler', label: 'Konteynerler' },
  { href: '/numara', label: 'Numara' },
  { href: '/navlun', label: 'Navlun ağırlığı' },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="tabs" aria-label="Araçlar">
      <div>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} data-active={path === l.href ? 'true' : 'false'}>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
