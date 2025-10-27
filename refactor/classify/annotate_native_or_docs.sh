#!/usr/bin/env bash
set -euo pipefail

IN=refactor/classify/native_or_docs.txt
OUT=refactor/classify/native_or_docs_annotated.md

: > "$OUT"
echo "package | found-in | justification | suggested_action" >> "$OUT"
echo "---|---|---|---" >> "$OUT"

# escape a string for use in regex
regex_escape() {
  local s=$1
  printf '%s\n' "$s" | sed -e 's/[].[^$*+?|(){}\\]/\\&/g'
}

while read -r pkg; do
  [ -z "$pkg" ] && continue

  search_paths=()
  for path in android ios src packages docs package.json .github; do
    [ -e "$path" ] && search_paths+=("$path")
  done

  hits=""
  if [ "${#search_paths[@]}" -gt 0 ]; then
    hits=$(rg -n --hidden -S --no-ignore -g '!**/node_modules/**' -e "$pkg" "${search_paths[@]}" || true)
  fi

  esc_pkg=$(regex_escape "$pkg")

  pod_hits=$(echo "$hits" | rg -n "Podfile|pod ['\"]?.*$esc_pkg" || true)
  gradle_hits=$(echo "$hits" | rg -n "build.gradle|settings.gradle|implementation ['\"][^'\"]*$esc_pkg|api ['\"][^'\"]*$esc_pkg" || true)
  mainapp_hits=$(echo "$hits" | rg -n "MainApplication|MainActivity|ReactNativeHost" || true)
  js_hits=$(echo "$hits" | rg -n "import .*['\"]$esc_pkg['\"]|from ['\"]$esc_pkg['\"]|require\\(['\"]$esc_pkg['\"]\\)" || true)
  docs_hits=$(echo "$hits" | rg -n "docs/|README|\\.md" || true)
  web_hits=$(echo "$hits" | rg -n "index\\.web|react-native-web" || true)

  justification=""
  action="review"

  if [ -n "$pod_hits" ]; then
    justification="iOS Pod: $(echo \"$pod_hits\" | sed -n '1,3p' | tr '\\n' '; ')"
    action="keep-native"
  elif [ -n "$gradle_hits" ]; then
    justification="Android Gradle: $(echo \"$gradle_hits\" | sed -n '1,3p' | tr '\\n' '; ')"
    action="keep-native"
  elif [ -n "$mainapp_hits" ]; then
    justification="Native registration: $(echo \"$mainapp_hits\" | sed -n '1,3p' | tr '\\n' '; ')"
    action="keep-native"
  elif [ -n "$js_hits" ]; then
    justification="JS runtime import: $(echo \"$js_hits\" | sed -n '1,3p' | tr '\\n' '; ')"
    action="keep-runtime"
  elif [ -n "$docs_hits" ]; then
    justification="Docs mention only: $(echo \"$docs_hits\" | sed -n '1,3p' | tr '\\n' '; ')"
    action="docs-only"
  elif [ -n "$web_hits" ]; then
    justification="Web entry references: $(echo \"$web_hits\" | sed -n '1,3p' | tr '\\n' '; ')"
    action="keep-web"
  else
    justification="no hits"
    action="prune-candidate"
  fi

  pkg_esc=${pkg//|/\\|}
  just_esc=${justification//|/\\|}
  echo "$pkg_esc | $just_esc | $justification | $action" >> "$OUT"
done < "$IN"

echo "Wrote $OUT"
