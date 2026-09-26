#!/usr/bin/env bash
# ymusic_mod installer for the official Yandex Music for Linux (https://music.yandex.ru/download/).
#
#   ./install.sh                     install or update the mod (asks for the sudo password once, for the boot file)
#   ./install.sh --uninstall         remove the mod; --remove-settings also deletes its settings
#   ./install.sh --update            copy the mod files only (used by the in-app updater, never asks for a password)
#   options: --app-dir <dir>         the app folder if it is not /opt/Яндекс Музыка
#            --yes                   do not ask anything
#
# The app itself is not modified. The mod lives in ~/.config/YandexMusic/{modloader,mods}; a small boot file goes to
# <app>/resources/app/, which Electron loads instead of resources/app.asar. Package updates of the app leave that
# folder alone, so the mod survives them.
set -euo pipefail

MOD_VERSION="__MOD_VERSION__"
BOOT_VERSION=1
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

action=install
app_dir=""
assume_yes=0
remove_settings=0
while [ $# -gt 0 ]; do
  case "$1" in
    --uninstall) action=uninstall ;;
    --update) action=update ;;
    --app-dir) app_dir="${2:-}"; shift ;;
    --yes|-y) assume_yes=1 ;;
    --remove-settings) remove_settings=1 ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

case "${LC_ALL:-${LC_MESSAGES:-${LANG:-}}}" in ru*|kk*|uk*|be*) ru=1 ;; *) ru=0 ;; esac
t() { if [ "$ru" = 1 ]; then printf '%s\n' "$1"; else printf '%s\n' "$2"; fi; }
step() { printf '\033[1;33m•\033[0m %s\n' "$(t "$1" "$2")"; }
fail() { printf '\033[1;31m✗\033[0m %s\n' "$(t "$1" "$2")" >&2; exit 1; }
done_() { printf '\033[1;32m✓\033[0m %s\n' "$(t "$1" "$2")"; }

# The mod belongs to the user who runs the app: its files go to that user's home, not root's
if [ "$(id -u)" = 0 ] && [ -n "${SUDO_USER:-}" ]; then
  fail "Запустите без sudo: пароль спросят, только когда он понадобится." \
       "Run it without sudo: the password is asked only when it is needed."
fi

config_dir="${XDG_CONFIG_HOME:-$HOME/.config}/YandexMusic"
mod_home="$config_dir/modloader"
mods_dir="$config_dir/mods"

find_app() {
  local candidates=() bin
  [ -n "$app_dir" ] && candidates+=("$app_dir")
  candidates+=("/opt/Яндекс Музыка")
  bin="$(command -v yandexmusic 2>/dev/null || true)"
  [ -n "$bin" ] && candidates+=("$(dirname "$(readlink -f "$bin")")")
  for d in "${candidates[@]}"; do
    if [ -f "$d/resources/app.asar" ]; then printf '%s' "$d"; return 0; fi
  done
  return 1
}

# Runs a command as root when the target is not writable by the user
as_root() {
  if [ -w "$1" ]; then shift; "$@"; return; fi
  shift
  if command -v sudo >/dev/null 2>&1; then sudo "$@"
  elif command -v pkexec >/dev/null 2>&1; then pkexec "$@"
  else fail "Нужны права администратора, но нет ни sudo, ни pkexec." "Root rights are needed, but there is neither sudo nor pkexec."
  fi
}

app_running() { pgrep -f "/yandexmusic( |$)" >/dev/null 2>&1 || pgrep -x yandexmusic >/dev/null 2>&1; }

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

boot_installed() { [ -f "$1/resources/app/ymmods-boot.js" ] && grep -q "boot v$BOOT_VERSION" "$1/resources/app/ymmods-boot.js"; }

install_boot() {
  local app="$1" target="$1/resources/app" tmp version
  if boot_installed "$app"; then return 0; fi
  if [ -e "$target" ] && [ ! -f "$target/ymmods-boot.js" ]; then
    fail "В $target уже что-то лежит, и это не мод. Установка остановлена." "$target exists and is not the mod. Stopping."
  fi
  tmp="$(mktemp -d)"
  # The app binary runs as plain Node (ELECTRON_RUN_AS_NODE) and reads its own package.json from app.asar;
  # the boot keeps the same name (the settings folder depends on it) and points "main" to itself
  version="$(ELECTRON_RUN_AS_NODE=1 "$app/yandexmusic" -e 'try{process.stdout.write(require(process.argv[1]+"/package.json").version||"")}catch(e){}' "$app/resources/app.asar" 2>/dev/null || true)"
  printf '{\n  "name": "YandexMusic",\n  "version": "%s",\n  "main": "ymmods-boot.js",\n  "ymmodsBoot": %s\n}\n' "${version:-0.0.0}" "$BOOT_VERSION" > "$tmp/package.json"
  cp "$here/ymmods-boot.js" "$tmp/ymmods-boot.js"
  step "Кладу загрузчик мода в $target (нужен пароль администратора)" "Putting the mod boot into $target (needs the admin password)"
  as_root "$app/resources" mkdir -p "$target"
  as_root "$app/resources" install -m 644 "$tmp/package.json" "$tmp/ymmods-boot.js" "$target/"
  rm -rf "$tmp"
}

remove_boot() {
  local target="$1/resources/app"
  [ -f "$target/ymmods-boot.js" ] || return 0
  step "Убираю загрузчик мода из $target (нужен пароль администратора)" "Removing the mod boot from $target (needs the admin password)"
  as_root "$1/resources" rm -rf "$target"
}

case "$action" in
  update)
    copy_payload
    exit 0
    ;;

  install)
    app="$(find_app)" || fail "Не нашёл Яндекс Музыку. Установите её с music.yandex.ru/download или укажите папку: --app-dir <папка>" \
                              "Yandex Music is not found. Install it from music.yandex.ru/download or pass its folder: --app-dir <dir>"
    step "Яндекс Музыка: $app" "Yandex Music: $app"
    step "Копирую мод $MOD_VERSION в $config_dir" "Copying mod $MOD_VERSION to $config_dir"
    copy_payload
    install_boot "$app"
    done_ "Мод установлен. Настройки: Яндекс Музыка → Настройки → Моды." "The mod is installed. Settings: Yandex Music → Settings → Mods."
    if app_running; then
      t "Перезапустите Яндекс Музыку, чтобы мод загрузился." "Restart Yandex Music to load the mod."
    fi
    ;;

  uninstall)
    if [ "$assume_yes" != 1 ] && [ -t 0 ]; then
      read -r -p "$(t "Удалить мод? [y/N] " "Remove the mod? [y/N] ")" answer
      case "$answer" in y|Y|д|Д) ;; *) exit 0 ;; esac
    fi
    if app="$(find_app)"; then remove_boot "$app"; fi
    rm -rf "$mod_home"
    if [ "$remove_settings" = 1 ]; then rm -rf "$mods_dir"; fi
    done_ "Мод удалён." "The mod is removed."
    if [ "$remove_settings" != 1 ]; then
      t "Настройки и ваши моды остались в $mods_dir (--remove-settings удалит и их)." \
        "Settings and your mods stay in $mods_dir (--remove-settings deletes them too)."
    fi
    if app_running; then t "Перезапустите Яндекс Музыку." "Restart Yandex Music."; fi
    ;;
esac
