# Google Play yayın dosyası — Inspecter

Play Console'a girilecek her şey burada. Alanlar Console'daki adlarıyla,
karakter sınırları parantez içinde.

---

## 1. Uygulama kimliği

| Alan | Değer |
|---|---|
| Paket adı | `com.quon.inspecter` — **yayından sonra asla değişmez** |
| Varsayılan dil | Türkçe (tr-TR) |
| Uygulama/Oyun | Uygulama |
| Ücretli/Ücretsiz | Ücretsiz — **yayından sonra ücretliye çevrilemez** |

## 2. Mağaza girişi

**Uygulama adı** (30):
```
Inspecter — Konteyner Yükleme
```
*(29 karakter)*

**Kısa açıklama** (80):
```
Konteyner ve tır yükleme planı, 3D konsolidasyon, fire hesabı ve PDF rapor.
```
*(74 karakter)*

**Tam açıklama** (4000):
```
Inspecter, ihracatçılar ve nakliyeciler için hazırlanmış bir konteyner
yükleme ve konsolidasyon aracıdır. Hesap açmanıza gerek yoktur, hiçbir
veriniz sunucuya gönderilmez — tüm hesaplar telefonunuzda çalışır ve
internet bağlantısı olmadan da kullanabilirsiniz.

KONSOLİDASYON PLANLAYICI (3D)
Farklı firmalara ait, farklı ölçü ve ağırlıktaki yükleri tek bir tıra veya
konteynere yerleştirin. Yerleşimi 3D olarak döndürerek inceleyin; beğenmezseniz
blokları parmağınızla tutup elle düzenleyin. Bloklar asla iç içe geçmez.
Yandan, önden ve üstten görünümlere tek dokunuşla geçebilirsiniz.

FİRE (BOŞLUK) HESABI
Kasanın dolu bölümünde kalan gerçek hava hacmini m³ ve yüzde olarak görün.
Ambalaj şişmesi ve bağlama gibi sahada oluşan kayıplar için fire payı yüzdesi
girerek kapasiteyi ihtiyatlı şekilde kısabilirsiniz.

PDF RAPOR VE PAYLAŞIM
Planı tek dokunuşla PDF'e çevirin: doluluk özeti, fire, kalem tablosu, 3D
görünüm ve ölçekli yandan/önden çizimler. Raporu WhatsApp, e-posta veya
istediğiniz uygulamayla doğrudan yükleme ekibine gönderin.

EXCEL / CSV İÇE AKTARMA
Kalem listenizi tek tek girmek yerine Excel'den CSV olarak kaydedip toplu
yükleyin. Şablon uygulamanın içinde hazır.

PALET VE SİLİNDİR DESTEĞİ
EUR ve US palet ölçüleri hazır gelir. Varil ve rulo gibi silindirik yükleri
de tanımlayabilirsiniz.

DİĞER ARAÇLAR
• Yükleme hesaplayıcı — tek tip koliden konteyner doluluğu, hangi kısıtın
  (uzunluk mu ağırlık mı) bağladığını söyler
• Konteyner özellikleri — 6 konteyner tipinin iç ölçü, hacim, dara ve
  taşıma kapasitesi tablosu
• ISO 6346 numara doğrulama — konteyner numarasının kontrol hanesini
  hesaplar ve sahip kodunu arar
• Navlun ağırlığı — LCL için W/M ve hava kargo hacim ağırlığı

GİZLİLİK
Hesap yok, kayıt yok, takip yok. Reklam veya analitik içermez. Girdiğiniz
yük bilgileri cihazınızdan çıkmaz.

NOT
Konteyner ölçüleri ve taşıma kapasiteleri nominaldir; gerçek azami yük
konteynerin CSC plakasında yazar. Yerleşim sonucu bir tahmindir, sahadaki
ambalaj ve bağlama payını hesaba katmaz.
```

**Uygulama simgesi**: `public/icon-512.png` (512×512, 32-bit PNG)
**Öne çıkan görsel**: `store/feature-graphic-1024x500.png` (1024×500)

**Ekran görüntüleri**: en az 2 telefon görüntüsü gerekiyor (2–8 adet).
**→ Bunları cihazdan sen çekeceksin**, önerilen sıra:
1. Konsolidasyon sayfası, 3D sahne dolu (en güçlü ekran)
2. Aynı sahne "Yandan" kamera görünümünde
3. Kalem listesi (firma/ölçü girişi)
4. Üretilmiş PDF raporu
5. Konteyner özellikleri tablosu

## 3. Kategori ve iletişim

| Alan | Değer |
|---|---|
| Uygulama kategorisi | İş (Business) |
| Etiketler | Lojistik, üretkenlik, hesaplama |
| E-posta | mstfadur891@gmail.com |
| Web sitesi | https://inspecter.mstfadur891.workers.dev |
| Gizlilik politikası | https://inspecter.mstfadur891.workers.dev/gizlilik |

## 4. Veri güvenliği formu (Data safety)

Bu form Play'de zorunlu ve yanlış doldurulması kaldırma sebebi. Inspecter
için doğru cevaplar:

| Soru | Cevap |
|---|---|
| Uygulamanız kullanıcı verisi topluyor mu veya paylaşıyor mu? | **Hayır** |
| Veriler aktarım sırasında şifreleniyor mu? | Uygulanamaz (veri toplanmıyor) |
| Kullanıcılar verilerinin silinmesini isteyebilir mi? | Uygulanamaz |

> Gerekçe: uygulama hiçbir ağ isteği yapmaz. Ayarlar yalnızca cihazın yerel
> deposunda tutulur ve hiçbir yere gönderilmez. PDF paylaşımı işletim
> sisteminin paylaşım ekranı üzerinden, kullanıcının seçtiği uygulamaya gider.

## 5. İçerik derecelendirme anketi

Kategori: **Yardımcı Program / Üretkenlik**. Tüm hassas içerik sorularına
(şiddet, cinsellik, kumar, madde, kullanıcı etkileşimi, konum paylaşımı)
cevap **Hayır**. Beklenen sonuç: 3+ / Herkes.

## 6. Reklam ve hedef kitle

| Alan | Değer |
|---|---|
| Uygulama reklam içeriyor mu? | Hayır |
| Hedef yaş aralığı | 18+ (mesleki araç) |
| Çocuklara yönelik mi? | Hayır |

## 7. Yayın öncesi teknik kontrol listesi

- [ ] `android/keystore.properties` ve `android/inspecter-upload.keystore` yerinde
- [ ] Keystore parolası Vaultwarden'a kaydedildi
- [ ] Keystore dosyası ayrıca yedeklendi (kaybolursa güncelleme yapılamaz)
- [ ] `versionCode` bir önceki yüklemeden büyük
- [ ] `bash apk-yayinla.sh` yerine **release** üretimi: `bundleRelease`
- [ ] Üretilen `.aab` imzalı mı doğrulandı
- [ ] Gizlilik politikası sayfası canlıda açılıyor

## 8. Bilinen risk — WebView politikası

Inspecter bir Capacitor (WebView) uygulamasıdır. Play'in "yalnızca bir web
sitesini paketleyen, minimum işlevsellikli uygulama" politikası bu tür
uygulamaları reddedebiliyor.

Lehimize olan ve **mağaza açıklamasında öne çıkarılması gereken** noktalar:
- Uygulama internet olmadan tam çalışır (offline hesaplama)
- 3D etkileşimli planlama, PDF üretimi ve dosya paylaşımı cihazda yapılır
- Sadece bir web sayfası göstermiyor; kendi hesap motoru ve çıktısı var

Reddedilirse itirazda bu üç maddeyi gerekçe göster.
