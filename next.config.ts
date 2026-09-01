import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Araçların tamamı istemci tarafında çalışır; sunucu durumu yok — tam statik export.
  // Cloudflare Pages / herhangi bir statik host `out/` klasörünü doğrudan servis edebilir.
  // İleride Faz 1'de (belge zinciri) sunucu tarafı gerekirse bu satır kaldırılacak.
  output: 'export',
  reactStrictMode: true,
};

export default nextConfig;
