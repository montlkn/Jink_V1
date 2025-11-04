#!/usr/bin/env node

/**
 * Reset Expo/Metro caches and common build artifacts.
 * Intended to fix drift without manually deleting files.
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const pathsToDelete = [
  ".expo",
  ".expo-shared",
  "node_modules/.cache",
  "node_modules/.expo",
  "android/app/build",
  "android/build",
  "ios/build",
  ".turbo",
];

function run(command) {
  return new Promise((resolve) => {
    const child = spawn("bash", ["-lc", command], {
      cwd: root,
      stdio: "inherit",
    });

    child.on("close", () => resolve());
  });
}

function deletePath(target) {
  const fullPath = path.join(root, target);
  if (!fs.existsSync(fullPath)) {
    return;
  }

  try {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`[reset-project] removed ${target}`);
  } catch (error) {
    console.warn(
      `[reset-project] failed to remove ${target}: ${(error && error.message) || error}`
    );
  }
}

async function main() {
  console.log("[reset-project] clearing watchman (if available)...");
  await run(
    'if command -v watchman >/dev/null 2>&1; then watchman watch-del-all || true; else echo "[reset-project] watchman not installed; skipping"; fi'
  );

  const tmpDir = process.env.TMPDIR || "/tmp";
  console.log("[reset-project] clearing Metro temp files...");
  await run(
    `rm -rf "${tmpDir}metro-"* "${tmpDir}metro-cache-"* "${tmpDir}haste-map-"* 2>/dev/null || true`
  );

  console.log("[reset-project] removing cached directories...");
  pathsToDelete.forEach(deletePath);

  console.log("[reset-project] done. Reinstall pods/dependencies if you removed them separately and restart Metro.");
}

main().catch((error) => {
  console.error("[reset-project] unexpected error:", error);
  process.exit(1);
});
