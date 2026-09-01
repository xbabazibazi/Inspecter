import type { Metadata } from 'next';
import NumberChecker from '@/components/NumberChecker';

export const metadata: Metadata = {
  title: 'Konteyner numarası doğrulama',
  description: 'ISO 6346 kontrol hanesi hesabı ve doğrulaması, sahip kodu (BIC prefix) araması.',
};

export default function Page() {
  return <NumberChecker />;
}
