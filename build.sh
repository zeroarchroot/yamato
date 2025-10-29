#!/usr/bin/env bash

SOURCE_FILES=(
  "background.html"
  "background.js"
  "popup.html"
  "popup.js"
  "run.js"
  "vergil.jpeg"
  "public/background.jpg"
  "public/block.txt"
  "public/click.mp3"
  "public/schum.mp3"
  "public/vergil.mp3"
  "public/vergil.webm"
)

build() {
  local platform="$1"
  local manifest_file=""

  case "$platform" in
    chrome)
      manifest_file="manifest.chrome.json"
      ;;
    firefox)
      manifest_file="manifest.firefox.json"
      ;;
    *)
      echo "Unknown platform: $platform. Use 'chrome' or 'firefox'."
      exit 1
      ;;
  esac

  local dist_dir="dist-$platform"

  if [ -d "$dist_dir" ]; then
    rm -rf "$dist_dir"
  fi
  mkdir -p "$dist_dir"

  cp "$manifest_file" "$dist_dir/manifest.json"

  for file in "${SOURCE_FILES[@]}"; do
    if [ -f "$file" ]; then
      mkdir -p "$dist_dir/$(dirname "$file")"
      cp "$file" "$dist_dir/$file"
    fi
  done
  
  (cd "$dist_dir" && zip -r "../yamato-${platform}.zip" .)
  rm -rf "$dist_dir"
  echo "Build complete for $platform. Zip created: dist-${platform}.zip"
}

build "chrome"
build "firefox"