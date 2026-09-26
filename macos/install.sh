#!/usr/bin/env bash
# ymusic_mod installer for Yandex Music on macOS — EXPERIMENTAL, not tested on a real Mac yet.
#
#   ./install.sh                     install or update the mod
#   ./install.sh --uninstall         remove the mod; --remove-settings also deletes its settings
#   ./install.sh --update            copy the mod files only (used by the in-app updater)
#   options: --app <path>            the app if it is not /Applications/Яндекс Музыка.app
#            --force                 rebuild the patched app.asar even if it is already patched
#
# Like on Windows, the app's app.asar gets a small entry point that loads the mod from
# ~/Library/Application Support/YandexMusic/modloader. macOS checks the archive against a hash in Info.plist
# (ElectronAsarIntegrity), so the hash is updated and the app is re-signed locally ("ad hoc", keeping its
# entitlements) — the Yandex signature is replaced by that. Terminal needs the "App Management" permission for it.
# An app update replaces the whole app: run this script again afterwards.
set -euo pipefail

MOD_VERSION="__MOD_VERSION__"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

action=install
app=""
force=""
remove_settings=0
while [ $# -gt 0 ]; do
  case "$1" in
    --uninstall) action=uninstall ;;
    --update) action=update ;;
    --app) app="${2:-}"; shift ;;
    --force) force="--force" ;;
    --remove-settings) remove_settings=1 ;;
    --yes|-y) ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

case "${LC_ALL:-${LC_MESSAGES:-${LANG:-}}}" in ru*|kk*|uk*|be*) ru=1 ;; *) ru=0 ;; esac
if [ "$ru" = 0 ] && defaults read -g AppleLanguages 2>/dev/null | grep -q '"*ru'; then ru=1; fi
t() { if [ "$ru" = 1 ]; then printf '%s\n' "$1"; else printf '%s\n' "$2"; fi; }
step() { printf '\033[1;33m•\033[0m %s\n' "$(t "$1" "$2")"; }
fail() { printf '\033[1;31m✗\033[0m %s\n' "$(t "$1" "$2")" >&2; exit 1; }
done_() { printf '\033[1;32m✓\033[0m %s\n' "$(t "$1" "$2")"; }

[ "$(uname -s)" = Darwin ] || fail "Этот установщик — для macOS." "This installer is for macOS."
[ "$(id -u)" != 0 ] || fail "Запустите без sudo." "Run it without sudo."

support="$HOME/Library/Application Support/YandexMusic"
mod_home="$support/modloader"
mods_dir="$support/mods"

if [ -z "$app" ]; then
  for d in "/Applications/Яндекс Музыка.app" "$HOME/Applications/Яндекс Музыка.app"; do
    if [ -d "$d" ]; then app="$d"; break; fi
  done
fi
exe="$app/Contents/MacOS/Яндекс Музыка"
plist="$app/Contents/Info.plist"
asar="$app/Contents/Resources/app.asar"

need_app() {
  [ -n "$app" ] && [ -f "$asar" ] && [ -x "$exe" ] || fail \
    "Не нашёл Яндекс Музыку в /Applications. Установите её с music.yandex.ru/download или укажите путь: --app <путь к .app>" \
    "Yandex Music is not found in /Applications. Install it from music.yandex.ru/download or pass it: --app <path to .app>"
}

# macOS 13+ protects other apps' bundles: the Terminal app needs "App Management" (or Full Disk Access)
need_write_access() {
  if ! ( touch "$app/Contents/Resources/.ymmods-write-test" && rm -f "$app/Contents/Resources/.ymmods-write-test" ) 2>/dev/null; then
    fail "Нет доступа к приложению. Откройте Системные настройки → Конфиденциальность и безопасность → Управление приложениями, включите там свой Терминал, перезапустите Терминал и запустите установщик снова." \
         "No access to the app. Open System Settings → Privacy & Security → App Management, turn on your Terminal app, restart Terminal and run the installer again."
  fi
}

node_run() { ELECTRON_RUN_AS_NODE=1 "$exe" "$@"; }

was_running=0
quit_app() {
  if pgrep -f "$exe" >/dev/null 2>&1; then
    was_running=1
    step "Закрываю Яндекс Музыку" "Closing Yandex Music"
    osascript -e 'quit app id "ru.yandex.desktop.music"' >/dev/null 2>&1 || true
    for _ in $(seq 1 30); do pgrep -f "$exe" >/dev/null 2>&1 || break; sleep 0.5; done
    pkill -f "$exe" 2>/dev/null || true
    sleep 1
  fi
}

copy_payload() {
  mkdir -p "$mod_home" "$mods_dir"
  cp -f "$here"/modloader/* "$mod_home"/
  # a mod the user switched off (_name) stays off; new mods come as shipped
  local f name
  for f in "$here"/mods/*; do
    [ -f "$f" ] || continue
    name="$(basename "$f")"; name="${name#_}"
    if [ -e "$mods_dir/_$name" ]; then cp -f "$f" "$mods_dir/_$name"
    elif [ -e "$mods_dir/$name" ]; then cp -f "$f" "$mods_dir/$name"
    else cp -f "$f" "$mods_dir/$(basename "$f")"
    fi
  done
  printf '%s\n' "$MOD_VERSION" > "$mod_home/version.txt"
}

# Writes the archive hash into Info.plist and re-signs the app ad hoc with its own entitlements
seal_app() {
  local hash="$1" ent
  /usr/libexec/PlistBuddy -c "Set :ElectronAsarIntegrity:Resources/app.asar:hash $hash" "$plist" 2>/dev/null || true
  ent="$(mktemp "${TMPDIR:-/tmp}/ymmods-entitlements.XXXXXX")"
  codesign -d --entitlements - --xml "$app" > "$ent" 2>/dev/null || codesign -d --entitlements :- "$app" > "$ent" 2>/dev/null || true
  step "Переподписываю приложение (локальная подпись)" "Re-signing the app (local signature)"
  if [ -s "$ent" ]; then codesign --force --sign - --entitlements "$ent" "$app"
  else codesign --force --sign - "$app"
  fi
  rm -f "$ent"
  # a downloaded app still carries the quarantine flag: with a new signature Gatekeeper would check it again
  xattr -dr com.apple.quarantine "$app" 2>/dev/null || true
  codesign --verify "$app" 2>/dev/null || t "Предупреждение: проверка подписи не прошла." "Warning: the signature check failed."
}

# Runs the patcher with the app itself as Node; prints "<status> <newHash> <newAsar>"
run_patcher() {
  local out
  out="$(mktemp "${TMPDIR:-/tmp}/ymmods-patch.XXXXXX")"
  node_run "$mod_home/patcher.js" --app-dir "$app" --out "$out" "$@" >/dev/null 2>&1 || true
  node_run -e 'try{const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log([r.status,r.newHash||"-",r.newAsar||"-",(r.notes||[]).join("; ")].join("\t"))}catch(e){console.log("error\t-\t-\t"+e.message)}' "$out"
  rm -f "$out"
}

case "$action" in
  update)
    copy_payload
    exit 0
    ;;

  install)
    need_app
    need_write_access
    step "Яндекс Музыка: $app" "Yandex Music: $app"
    quit_app
    step "Копирую мод $MOD_VERSION в $support" "Copying mod $MOD_VERSION to $support"
    copy_payload
    IFS=$'\t' read -r status hash new_asar notes <<< "$(run_patcher $force)"
    case "$status" in
      patched)
        mv -f "$new_asar" "$asar"
        seal_app "$hash"
        ;;
      already-patched) t "Приложение уже пропатчено." "The app is already patched." ;;
      *) fail "Патчер не справился: $notes" "The patcher failed: $notes" ;;
    esac
    done_ "Мод установлен (экспериментальная версия для macOS). Настройки: Яндекс Музыка → Настройки → Моды." \
          "The mod is installed (experimental macOS version). Settings: Yandex Music → Settings → Mods."
    t "После обновления Яндекс Музыки запустите установщик снова." "Run the installer again after Yandex Music updates."
    if [ "$was_running" = 1 ]; then open "$app"; fi
    ;;

  uninstall)
    need_app
    need_write_access
    quit_app
    if [ -f "$mod_home/patcher.js" ]; then
      IFS=$'\t' read -r status hash new_asar notes <<< "$(run_patcher --restore)"
      case "$status" in
        restored) mv -f "$new_asar" "$asar"; seal_app "$hash" ;;
        not-patched) ;;
        *) t "Не удалось вернуть оригинальный app.asar ($notes). Переустановите Яндекс Музыку с music.yandex.ru/download." \
             "Could not restore the original app.asar ($notes). Reinstall Yandex Music from music.yandex.ru/download." ;;
      esac
    fi
    rm -rf "$mod_home"
    if [ "$remove_settings" = 1 ]; then rm -rf "$mods_dir"; fi
    done_ "Мод удалён. Чтобы вернуть и подпись Яндекса, переустановите приложение с music.yandex.ru/download." \
          "The mod is removed. To get the Yandex signature back too, reinstall the app from music.yandex.ru/download."
    if [ "$was_running" = 1 ]; then open "$app"; fi
    ;;
esac
