import type { Metadata } from 'next';
import LoadCalculator from '@/components/LoadCalculator';

export const metadata: Metadata = {
  title: 'Yükleme hesaplayıcı',
  description:
    'Koli ölçüsü ve ağırlığından konteyner doluluğu: 20 DV, 40 DV, 40 HC, 45 HC ve reefer için kaç koli sığar, hangi kısıt bağlar.',
};

export default function Page() {
  return <LoadCalculator />;
}
