/**
 * Inspecter marka kilidi (amblem + kelime markası).
 *
 * Amblem, uygulama ikonuyla (src/app/icon.svg) BİLEREK aynı: koyu teal yuvarlak
 * kare içinde oluklu konteyner silueti. İkon zaten onaylanmış bir marka öğesi;
 * logo onu yeniden tasarlamak yerine bir kelime markasıyla eşler ki ikon, PWA
 * kısayolu, native uygulama ve sayfa başlığı aynı işareti göstersin.
 *
 * `width`/`height` öznitelikleri ŞART: yalnızca `viewBox` varken tarayıcı
 * CSS'teki `width:auto`u en-boy oranından çözemeyip genişliği 0 hesaplıyor.
 * Kelime markası `currentColor` kullanır — bulunduğu yerin metin rengini alır.
 */
export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="200"
      height="48"
      viewBox="0 0 200 48"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Inspecter"
    >
      {/* amblem — src/app/icon.svg ile aynı geometri, 44px rozete ölçeklenmiş */}
      <rect x="2" y="2" width="44" height="44" rx="6.9" fill="#094A41" />
      <g strokeLinejoin="round">
        <path d="M8.79 17.37 24 9.77 39.22 17.37 24 24.98Z" fill="#F4F8F6" />
        <path d="M8.79 17.37 24 24.98 24 38.18 8.79 30.56Z" fill="#BFD9D3" />
        <path d="M24 24.98 39.22 17.37 39.22 30.56 24 38.18Z" fill="#E8622C" />
      </g>
      <g strokeWidth="0.81" strokeLinecap="round" opacity="0.45" fill="none">
        <g stroke="#094A41">
          <path d="M12.60 19.27V32.47M16.40 21.18V34.38M20.21 23.08V36.28" />
        </g>
        <g stroke="#7A2E10">
          <path d="M27.81 23.08V36.28M31.62 21.18V34.38M35.41 19.27V32.47" />
        </g>
      </g>

      {/* kelime markası */}
      <text
        x="58"
        y="32"
        fill="currentColor"
        fontFamily="Archivo, system-ui, sans-serif"
        fontSize="23"
        fontWeight="800"
        letterSpacing="0.6"
      >
        INSPECTER
      </text>
    </svg>
  );
}
