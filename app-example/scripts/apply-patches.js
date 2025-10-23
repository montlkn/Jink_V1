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
  console.log('[patches] Applied react-native-maps patch (with onLongPress disabled)');
}

function fixThreeTypes() {
  const indexPath = path.join(process.cwd(), 'node_modules/@types/three/index.d.ts');

  if (!fs.existsSync(indexPath)) {
    console.warn('[patches] @types/three not installed, skipping fix.');
    return;
  }

  try {
    const content = fs.readFileSync(indexPath, 'utf8');
    if (content.includes('export * from "./src/Three.js";')) {
      const fixed = content.replace('export * from "./src/Three.js";', 'export * from "./src/Three";');
      fs.writeFileSync(indexPath, fixed, 'utf8');
      console.log('[patches] Fixed @types/three index.d.ts');
    } else {
      console.log('[patches] @types/three already patched');
    }
  } catch (error) {
    console.error('[patches] Failed to fix @types/three:', error.message);
  }
}

applyReactNativeMapsPatch();
fixThreeTypes();
