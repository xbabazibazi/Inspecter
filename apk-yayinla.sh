#!/usr/bin/env bash
# APK'yı LAN indirme klasörüne sürümlü adla yayınlar ve indirme sayfasını üretir.
#
# Neden sürümlü ad: dosya adı sabit kalınca telefon tarayıcısı "304 Not Modified"
# alıp ÖNBELLEKTEKİ ESKİ paketi kuruyor. Bu, oturum boyunca birkaç kez yanlış
# teşhise yol açtı ("düzeltme çalışmadı" sanıldı, aslında eski build kuruluydu).
#
# Kullanım:  bash apk-yayinla.sh        (APK'nın zaten derlenmiş olduğunu varsayar)
set -euo pipefail

cd "$(dirname "$0")"
SRC="android/app/build/outputs/apk/debug/app-debug.apk"
DST="apk-indir"

[ -f "$SRC" ] || { echo "HATA: $SRC yok — önce gradle assembleDebug çalıştır." >&2; exit 1; }

HASH="$(git rev-parse --short HEAD)"
STAMP="$(date +%m%d-%H%M)"
NAME="inspecter-${STAMP}-${HASH}.apk"

mkdir -p "$DST"
rm -f "$DST"/inspecter-*.apk
cp "$SRC" "$DST/$NAME"
cp "$SRC" "$DST/inspecter.apk"   # sabit ad da dursun (doğrudan link verenler için)

SIZE="$(du -h "$DST/$NAME" | cut -f1)"
TARIH="$(date '+%d.%m.%Y %H:%M')"

cat > "$DST/index.html" <<HTML
<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Inspecter — APK indir</title>
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#EFF1EE;color:#131A18;
       margin:0;padding:28px 20px;line-height:1.5}
  .card{max-width:520px;margin:0 auto;background:#FAFBF9;border:1px solid #D2D8D1;
        border-radius:10px;padding:22px}
  h1{font-size:20px;margin:0 0 2px;letter-spacing:-.02em}
  .sub{color:#5A6360;font-size:14px;margin:0 0 18px}
  a.dl{display:block;text-align:center;background:#094A41;color:#fff;text-decoration:none;
       font-weight:700;font-size:17px;padding:16px;border-radius:8px;margin:18px 0 10px}
  .meta{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#5A6360;
        border-top:1px solid #D2D8D1;padding-top:12px;margin-top:16px}
  .meta div{margin:3px 0}
  .warn{background:#F2E7CE;border-left:3px solid #8F6416;padding:10px 12px;
        border-radius:4px;font-size:13.5px;margin-top:14px}
</style></head><body>
<div class="card">
  <h1>Inspecter</h1>
  <p class="sub">Android test paketi</p>
  <a class="dl" href="${NAME}">APK indir (${SIZE})</a>
  <div class="warn">
    Dosya adı her derlemede değişir — böylece tarayıcı eski sürümü önbellekten
    vermez. Kurarken mevcut uygulamanın üstüne yazar.
  </div>
  <div class="meta">
    <div>dosya : ${NAME}</div>
    <div>commit: ${HASH}</div>
    <div>tarih : ${TARIH}</div>
  </div>
</div>
</body></html>
HTML

echo "yayinlandi: $NAME  ($SIZE, commit $HASH)"
