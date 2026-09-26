#!/usr/bin/env bash
# One-line install of ymusic_mod for Linux and macOS:
#   curl -fsSL https://raw.githubusercontent.com/nersuga/ymusic_mod/main/linux/get.sh | bash
# Downloads the latest release archive for this system, checks its SHA-256 and runs its install.sh (arguments are
# passed on, e.g. `| bash -s -- --uninstall`).
set -euo pipefail
repo="nersuga/ymusic_mod"
case "$(uname -s)" in
  Darwin) kind=macos ;;
  Linux) kind=linux ;;
  *) echo "Unsupported system: $(uname -s)" >&2; exit 1 ;;
esac
api="$(curl -fsSL "https://api.github.com/repos/$repo/releases/latest")"
url="$(printf '%s' "$api" | grep -o "\"browser_download_url\": *\"[^\"]*/YandexMusicMods-$kind-[^\"]*\.tar\.gz\"" | head -n1 | sed 's/.*"\(https[^"]*\)"$/\1/')"
if [ -z "$url" ]; then echo "No $kind package in the latest release of $repo" >&2; exit 1; fi
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "$url" -o "$tmp/mod.tar.gz"
expected="$(curl -fsSL "$url.sha256" | awk '{print tolower($1)}')"
if command -v sha256sum >/dev/null 2>&1; then actual="$(sha256sum "$tmp/mod.tar.gz" | awk '{print $1}')"
else actual="$(shasum -a 256 "$tmp/mod.tar.gz" | awk '{print $1}')"; fi
if [ "$expected" != "$actual" ]; then echo "SHA-256 mismatch: $actual, expected $expected" >&2; exit 1; fi
tar -xzf "$tmp/mod.tar.gz" -C "$tmp"
# stdin is the script itself when piped to bash: questions go to the terminal
if [ -r /dev/tty ] && { : < /dev/tty; } 2>/dev/null; then
  bash "$tmp/YandexMusicMods-$kind/install.sh" "$@" < /dev/tty
else
  bash "$tmp/YandexMusicMods-$kind/install.sh" "$@"
fi
