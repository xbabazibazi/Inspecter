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
      {/* amblem */}
      <rect x="2" y="2" width="44" height="44" rx="6.9" fill="#094A41" />
      <g fill="none" stroke="#DCEAE6" strokeWidth="2.48">
        <rect x="10.25" y="14.4" width="27.5" height="19.25" rx="1.4" />
        <path d="M16.44 14.4v19.25M22.63 14.4v19.25M28.81 14.4v19.25" />
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
