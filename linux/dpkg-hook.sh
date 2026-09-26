#!/bin/sh
# ymusic_mod dpkg hook, installed as /usr/local/lib/ymusic-mod/dpkg-hook and run by dpkg after every invocation
# (/etc/dpkg/dpkg.cfg.d/ymusic-mod). A Yandex Music package update brings back resources/app.asar, which Electron
# would load instead of the mod boot in resources/app: the new file is moved to app-orig.asar, where the boot finds it.
# If the app itself was removed, the mod leftovers go too.
list=/usr/local/lib/ymusic-mod/apps
[ -f "$list" ] || exit 0
while IFS= read -r app; do
  [ -n "$app" ] || continue
  r="$app/resources"
  if [ ! -e "$app/yandexmusic" ]; then
    rm -rf "$r/app" "$r/app-orig.asar"
    rmdir "$r" "$app" 2>/dev/null
    continue
  fi
  [ -f "$r/app/ymmods-boot.js" ] || continue
  if [ -f "$r/app.asar" ]; then mv -f "$r/app.asar" "$r/app-orig.asar"; fi
done < "$list"
exit 0
