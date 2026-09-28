#!/bin/sh
# Renders assets/icon/icon.svg to iOS/Android launcher icons (headless Chrome + sips).
set -e
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SVG="$PWD/assets/icon/icon.svg"
OUT=assets/icon
TMP=$(mktemp -d)

render() { # $1=html $2=out.png
  "$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --default-background-color=00000000 --window-size=1024,1024 \
    --screenshot="$PWD/$2" "file://$1" >/dev/null 2>&1
}

cat > "$TMP/sq.html" <<H
<html><body style="margin:0"><img src="file://$SVG" width="1024" height="1024" style="display:block"></body></html>
H
cat > "$TMP/round.html" <<H
<html><body style="margin:0;background:transparent"><img src="file://$SVG" width="1024" height="1024" style="display:block;border-radius:50%"></body></html>
H

render "$TMP/sq.html" "$OUT/icon-rgba.png"
render "$TMP/round.html" "$OUT/icon-round.png"

# Strip alpha: round-trip through JPEG at max quality.
sips -s format jpeg -s formatOptions 100 "$OUT/icon-rgba.png" --out "$TMP/icon.jpg" >/dev/null
sips -s format png "$TMP/icon.jpg" --out "$OUT/icon.png" >/dev/null
rm "$OUT/icon-rgba.png"

IOS=ios/FamilyTree/Images.xcassets/AppIcon.appiconset
cp "$OUT/icon.png" "$IOS/icon-1024.png"
cat > "$IOS/Contents.json" <<J
{
  "images" : [
    { "filename" : "icon-1024.png", "idiom" : "universal", "platform" : "ios", "size" : "1024x1024" }
  ],
  "info" : { "author" : "xcode", "version" : 1 }
}
J

RES=android/app/src/main/res
for d in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  n=${d%%:*}; px=${d##*:}
  sips -z "$px" "$px" "$OUT/icon.png" --out "$RES/mipmap-$n/ic_launcher.png" >/dev/null
  sips -z "$px" "$px" "$OUT/icon-round.png" --out "$RES/mipmap-$n/ic_launcher_round.png" >/dev/null
done

rm -r "$TMP"
sips -g hasAlpha "$IOS/icon-1024.png"
