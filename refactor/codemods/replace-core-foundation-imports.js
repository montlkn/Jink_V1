/**
 * replace-core-foundation-imports.js
 *
 * Rewrites imports/requires that target project-level constants/utils/shared paths
 * into @jink/core-foundation public package imports.
 *
 * Rules:
 *  - Matches paths containing "/constants/", "/utils/", "/helpers/", "/shared/", "/format/"
 *  - Maps:
 *      .../constants/colors      -> @jink/core-foundation/colors
 *      .../utils/normalize       -> @jink/core-foundation/normalize
 *      .../utils/questTimers     -> @jink/core-foundation/questTimers
 *      .../constants             -> @jink/core-foundation
 *  - Leaves internal relative imports inside packages untouched.
 *
 * Dry-run first (-d -p) and inspect results before applying.
 */

/**
 * replace-core-foundation-imports.js
 *
 * CommonJS version to avoid babel-register conflicts.
 */

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const mapSource = (src) => {
    if (typeof src !== 'string') return null;
    const normalized = src.replace(/\\/g, '/');
    const match = normalized.match(/(?:.*\/)?(?:src\/)?(constants|utils|helpers|shared|format)\/?(.*)$/);
    if (!match) return null;
    const tail = (match[2] || '').replace(/\.(js|ts|jsx|tsx)$/, '');
    const base = tail.split('/')[0];

    const map = {
      colors: '@jink/core-foundation/colors',
      normalize: '@jink/core-foundation/normalize',
      divergence: '@jink/core-foundation/divergence',
      questTimers: '@jink/core-foundation/questTimers',
    };

    if (map[base]) {
      return map[base];
    }

    return null;
  };

  root.find(j.ImportDeclaration).forEach((path) => {
    const src = path.node.source?.value;
    const mapped = mapSource(src);
    if (mapped) {
      path.node.source.value = mapped;
    }
  });

  root.find(j.CallExpression, { callee: { name: 'require' } }).forEach((path) => {
    const arg = path.node.arguments?.[0];
    if (arg && arg.type === 'Literal' && typeof arg.value === 'string') {
      const mapped = mapSource(arg.value);
      if (mapped) {
        arg.value = mapped;
      }
    }
  });

  return root.toSource({ quote: 'single' });
};
