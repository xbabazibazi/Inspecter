# Manifest Araç Kutusu

İhracatçılar için dört ücretsiz konteyner aracı. Hesap yok, sunucu yok, veri gönderimi yok —
tüm hesaplar tarayıcıda çalışır ve sayfaların hepsi statik olarak üretilir.

Bu, daha büyük bir ürünün **Faz 0**'ı: araçlar arama trafiği ve geri bildirim getirir, asıl
ürün (proforma → ticari fatura → çeki listesi belge zinciri) bunun üzerine kurulur.

## Araçlar

| Yol | Ne yapar |
|---|---|
| `/yukleme` | Koli ölçü + ağırlığından konteyner doluluğu; hangi kısıtın bağladığını söyler, yerleşimi çizer |
| `/konteynerler` | 6 konteyner tipinin iç ölçü, kapı açıklığı, hacim, dara ve payload tablosu |
| `/numara` | ISO 6346 kontrol hanesi doğrulama/hesaplama + sahip kodu (BIC prefix) araması |
| `/navlun` | LCL W/M — `max(m³, ton)` — ve hava kargo hacim ağırlığı |

## Kurulum

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm test           # vitest — 39 test
npm run typecheck  # tsc --noEmit
npm run build      # statik üretim
```

## Yapı

```
src/
  lib/                  # saf hesap katmanı — React'e bağımlı değil, tamamı test edilir
    containers.ts        konteyner referans verisi (nominal ölçüler)
    loadcalc.ts          yükleme algoritması
    iso6346.ts           kontrol hanesi
    prefixes.ts          BIC sahip kodları (kısmi liste)
    units.ts             W/M ve hacim ağırlığı
    __tests__/           vitest
  components/           # 'use client' — etkileşimli araçlar
  app/                  # App Router sayfaları, her biri statik
```

`lib/` kasıtlı olarak React'ten bağımsız tutuldu. Faz 1'de aynı fonksiyonlar sunucu tarafında
belge üretiminde de kullanılacak; bir yerde hesaplanan doluluk başka yerde farklı çıkmasın diye.

## Yükleme algoritması

Tam 3B bin-packing NP-zordur ve iyi bir çözücü aylar alır. Bu modül daha dar bir problemi
kesin olarak çözer: **tek tip koli, eksen hizalı yerleşim, dikey istif sınırı, ağırlık tavanı.**

1. Kolinin izinli yönelimleri üretilir — serbestse 6, "bu taraf yukarı" ise 2.
2. Her yönelim için ana blok: `nx·ny·nz`.
3. Uzunluk ve genişlik yönündeki **artık şeritler** ikinci bir yönelimle doldurulur
   (bir seviye derinlik; köşe bloğu iki kez sayılmaz).
4. Ağırlık tavanı uygulanır: `min(hacimce, ⌊payload / koli_brüt⌋)`.
5. Hangi kısıtın bağladığı raporlanır.

3. adım naif hesabın kaçırdığı yerdir. 40'HC'ye 64×42×38 cm koli örneğinde:
**yalnız ana blok 672, artık şeritle 714** — %6,3 fark, konteyner başına 42 koli.

### Sınırları

- **Tek SKU.** Çok kalemli yükleme Faz 2'de: hacme göre azalan sıralama + duvar-örme + giyotin artık.
- **Geometrik üst sınır.** Sahada ambalaj şişmesi, ayırıcı ve bağlama payı yüzünden tipik olarak
  %5–10 daha az koli girer. Arayüz bunu açıkça yazar.
- **Ağırlık dağılımı hesaplanmaz.** Aks yükü ve ağırlık merkezi kontrolü yok — karayolu
  aşamasında bu bağlayıcı olabilir.
- **Kapı kontrolü kaba.** Kolinin en az bir yönelimde kapıdan geçip geçmediğine bakar;
  forklift manevra payını hesaba katmaz.

## Veri hakkında

Konteyner ölçüleri ve payload değerleri **nominaldir** ve imalatçıya, konteynerin yaşına ve
hatta göre yaklaşık ±%2 oynar. Gerçek azami yük konteynerin **CSC plakasında** yazar.
Sahip kodu listesi eksiktir; tam ve güncel kayıt [BIC](https://www.bic-code.org/)'tedir.

## Teknik kararlar

- **Next.js App Router + statik üretim.** Sunucu durumu yok; her sayfa `○ Static`.
- **Tailwind yok.** Tasarım tek bir `globals.css` içinde token'lar ve semantik sınıflarla
  yazıldı. Bağımlılık sayısı düşük, stil dosyası tek yerde, PostCSS zinciri yok.
  Faz 1'de bileşen sayısı artınca CSS Modules'a bölünebilir.
- **`localStorage` sarmalı her erişimde try/catch.** Gizli sekmede ve site verisi kapalı
  tarayıcılarda erişim fırlatabilir; araçlar o durumda da çalışmalı.
- **Hesaplar `useMemo` ile türetilir**, ayrı state tutulmaz — girdi ile çıktı asla ayrışmaz.

## Sırada ne var

Faz 1'e geçerken bu repo'ya eklenecekler: Postgres + RLS ile çok kiracılık, taraf/ürün kataloğu,
sevkiyat kaydı, PI → CI → PL belge üretimi, `@react-pdf/renderer` ile PDF, belge sürümleme.

Araçlar ücretsiz kalır.
