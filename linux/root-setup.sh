#!/usr/bin/env bash
# ymusic_mod: the part that needs root. install.sh runs it once through sudo/pkexec.
#   root-setup.sh install <app dir> <dir with package.json, ymmods-boot.js, dpkg-hook.sh>
#   root-setup.sh remove <app dir>
set -eu
action="$1"
app="$2"
src="${3:-}"
r="$app/resources"
lib=/usr/local/lib/ymusic-mod
cfg=/etc/dpkg/dpkg.cfg.d/ymusic-mod

case "$action" in
  install)
    # 1. the boot, which Electron loads from resources/app once there is no resources/app.asar
    mkdir -p "$r/app"
    install -m 644 "$src/package.json" "$src/ymmods-boot.js" "$r/app/"
    # 2. the app's own archive steps aside; the boot loads it from app-orig.asar
    if [ -f "$r/app.asar" ]; then mv -f "$r/app.asar" "$r/app-orig.asar"; fi
    # 3. package updates bring app.asar back: a dpkg hook moves it aside again after every dpkg run
    if [ -d /etc/dpkg/dpkg.cfg.d ]; then
      mkdir -p "$lib"
      install -m 755 "$src/dpkg-hook.sh" "$lib/dpkg-hook"
      grep -qxF "$app" "$lib/apps" 2>/dev/null || printf '%s\n' "$app" >> "$lib/apps"
      printf '%s\n' "# ymusic_mod: keeps the mod of Yandex Music active after package updates" \
        "post-invoke=[ ! -x $lib/dpkg-hook ] || $lib/dpkg-hook" > "$cfg"
    fi
    ;;
  remove)
    if [ -f "$r/app-orig.asar" ]; then
      if [ -f "$r/app.asar" ]; then rm -f "$r/app-orig.asar"; else mv -f "$r/app-orig.asar" "$r/app.asar"; fi
    fi
    rm -rf "$r/app"
    if [ -f "$lib/apps" ]; then
      grep -vxF "$app" "$lib/apps" > "$lib/apps.new" || true
      mv -f "$lib/apps.new" "$lib/apps"
      if [ ! -s "$lib/apps" ]; then rm -rf "$lib" "$cfg"; fi
    fi
    ;;
  *) echo "usage: root-setup.sh install|remove <app dir> [<source dir>]" >&2; exit 2 ;;
esac
