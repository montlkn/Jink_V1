const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../node_modules/@types/three/index.d.ts');

try {
  const content = fs.readFileSync(indexPath, 'utf8');
  const fixed = content.replace('export * from "./src/Three.js";', 'export * from "./src/Three";');
  fs.writeFileSync(indexPath, fixed, 'utf8');
  console.log('✓ Fixed @types/three index.d.ts');
} catch (error) {
  console.error('Failed to fix @types/three:', error.message);
  process.exit(1);
}
