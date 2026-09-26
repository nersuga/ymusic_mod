#!/usr/bin/env bash
# One-line install of ymusic_mod for Linux:
#   curl -fsSL https://raw.githubusercontent.com/nersuga/ymusic_mod/main/linux/get.sh | bash
# Downloads the latest release archive, checks its SHA-256 and runs its install.sh (arguments are passed on,
# e.g. `| bash -s -- --uninstall`).
set -euo pipefail
repo="nersuga/ymusic_mod"
api="$(curl -fsSL "https://api.github.com/repos/$repo/releases/latest")"
url="$(printf '%s' "$api" | grep -o '"browser_download_url": *"[^"]*/YandexMusicMods-linux-[^"]*\.tar\.gz"' | head -n1 | sed 's/.*"\(https[^"]*\)"$/\1/')"
if [ -z "$url" ]; then echo "No Linux package in the latest release of $repo" >&2; exit 1; fi
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "$url" -o "$tmp/mod.tar.gz"
expected="$(curl -fsSL "$url.sha256" | awk '{print tolower($1)}')"
actual="$(sha256sum "$tmp/mod.tar.gz" | awk '{print $1}')"
if [ "$expected" != "$actual" ]; then echo "SHA-256 mismatch: $actual, expected $expected" >&2; exit 1; fi
tar -xzf "$tmp/mod.tar.gz" -C "$tmp"
# stdin is the script itself when piped to bash: questions go to the terminal
if [ -r /dev/tty ] && { : < /dev/tty; } 2>/dev/null; then
  bash "$tmp/YandexMusicMods-linux/install.sh" "$@" < /dev/tty
else
  bash "$tmp/YandexMusicMods-linux/install.sh" "$@"
fi
