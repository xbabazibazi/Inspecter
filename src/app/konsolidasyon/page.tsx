import type { Metadata } from 'next';
import ConsolidationPlanner from '@/components/ConsolidationPlanner';

export const metadata: Metadata = {
  title: 'Konsolidasyon planlayıcı',
  description:
    'Farklı ölçü ve ağırlıktaki kalemleri tek treyler veya konteynere yerleştir, 3D\'de incele; hangi kısıtın — uzunluk mu ağırlık mı — bağladığını gör.',
};

export default function Page() {
  return <ConsolidationPlanner />;
}
