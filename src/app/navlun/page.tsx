import type { Metadata } from 'next';
import FreightWeight from '@/components/FreightWeight';

export const metadata: Metadata = {
  title: 'Navlun ağırlığı',
  description: 'LCL için W/M — max(m³, ton) — ve hava kargo hacim ağırlığı hesabı.',
};

export default function Page() {
  return <FreightWeight />;
}
