const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }

  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const item of fs.readdirSync(src)) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      copyRecursive(srcPath, destPath);
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function applyReactNativeMapsPatch() {
  const repoRoot = process.cwd();
  const patchSource = path.join(repoRoot, 'patches', 'react-native-maps');
  const moduleTarget = path.join(repoRoot, 'node_modules', 'react-native-maps');

  if (!fs.existsSync(moduleTarget)) {
    console.warn('[patches] react-native-maps not installed, skipping patch.');
    return;
  }

  copyRecursive(patchSource, moduleTarget);
  console.log('[patches] Applied react-native-maps patch');
}

applyReactNativeMapsPatch();
