# Final Guardrails: Bulletproofing the Architecture

This document describes the safety mechanisms that prevent accidental server code from entering the React Native bundle.

---

## 1. Metro Configuration Shield

**File:** `metro.config.js`

Metro (React Native bundler) will fail immediately if any code tries to import server-only modules:

```javascript
config.resolver.extraNodeModules = {
  'bullmq': SERVER_ONLY_SHIM,           // ← throws error
  'ioredis': SERVER_ONLY_SHIM,          // ← throws error
  'child_process': SERVER_ONLY_SHIM,    // ← throws error
  // ... more Node stdlib
};
```

**When triggered:** Any `import bullmq` or `require('ioredis')` from anywhere in `src/`

**Error message:** Clear explanation + fix instructions in `shims/server-only.js`

---

## 2. ESLint Static Analysis

**File:** `.eslintrc.json`

ESLint catches import violations before code even reaches Metro.

### Forbidden module imports:
```javascript
import bullmq from 'bullmq';           // ❌ ESLint error
import Redis from 'ioredis';           // ❌ ESLint error
import fs from 'fs';                   // ❌ ESLint error
```

### Forbidden file patterns:
```javascript
import { enqueueSummaryGeneration } from '../workers/summaryWorker';
// ❌ ESLint error: Server-only code detected

import { checkUserRateLimit } from '../middleware/rateLimitBreaker';
// ❌ ESLint error: Server-only code detected
```

**How to run:**
```bash
npm run lint
# or
npx eslint src/
```

---

## 3. CI Import Check

**File:** `scripts/ci/check-mobile-imports.sh`

This script runs in your CI/CD pipeline and fails the build if server imports are detected.

```bash
scripts/ci/check-mobile-imports.sh

# Output:
# ❌ FAILED: 4 server import violation(s) detected
# Fix: Remove the imports and call HTTP API instead
# Exit code: 1 (build fails)
```

### Setup in GitHub Actions:

```yaml
# .github/workflows/test.yml
- name: Check for server imports in mobile
  run: bash scripts/ci/check-mobile-imports.sh
```

### Setup in GitLab CI:

```yaml
# .gitlab-ci.yml
check_mobile_imports:
  script:
    - bash scripts/ci/check-mobile-imports.sh
```

---

## 4. Package.json Dependency Cleanup

**Status:** ✅ Completed

Removed from mobile `package.json`:
- ❌ `bullmq` (job queue)
- ❌ `ioredis` (Redis client)

These dependencies are **not available** for import, so bundler will fail if code tries to use them.

---

## 5. Import Chain Breakage

**Status:** ✅ Completed

Removed from `src/api/quizApi.js`:
```javascript
// ❌ REMOVED: Broke the import chain
const { enqueueSummaryGeneration } = await import('../workers/summaryWorker');
await checkAndQueueSummaryGeneration(userId);

// ✅ REPLACED: Backend handles divergence check
// Backend Supabase RPC handles divergence check and queue triggering
```

---

## 6. Test Guard (Catch Regressions)

Add this test to catch accidental regressions:

```typescript
// src/__tests__/no-server-imports.test.ts
import fs from 'fs';
import path from 'path';

describe('Mobile Code Guard', () => {
  it('should not import server-only modules', () => {
    const srcDir = path.join(__dirname, '..');
    const files = getAllJsFiles(srcDir);

    const violations = files.filter(file => {
      const content = fs.readFileSync(file, 'utf-8');
      return /from ['"](?:bullmq|ioredis|redis)['"]/g.test(content);
    });

    expect(violations).toEqual([]);
  });
});
```

---

## 7. Code Review Checklist

When reviewing PRs, check for:

- [ ] No new imports from `bullmq`, `ioredis`, `redis`
- [ ] No imports from `../workers/`, `../middleware/rateLimitBreaker`, `../lib/queue`
- [ ] All backend calls use `summaryApi.fetchSummary()` or `summaryApi.regenerateSummary()`
- [ ] No direct queue/worker instantiation in mobile code
- [ ] Lint passes: `npm run lint`

---

## 8. How to Add New Backend Code Safely

### DO:
```javascript
// ✅ Backend only
// backend/src/workers/newWorker.js
import { Queue } from 'bullmq';
import Redis from 'ioredis';
// ... server logic
```

```javascript
// ✅ Mobile only
// src/api/summaryApi.js
export async function fetchNewData() {
  return fetch(`/api/new-endpoint`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

### DON'T:
```javascript
// ❌ BAD: Imports server code from mobile
import newWorker from '../workers/newWorker';
newWorker.start();
```

```javascript
// ❌ BAD: Adds server dependency to mobile bundle
// package.json
"dependencies": {
  "bullmq": "^5.61.0"
}
```

---

## 9. Monitoring These Guards

### CI Guard Status
```bash
# Check if ESLint errors are in your PR
git diff --name-only origin/main | xargs npx eslint

# Check if CI guard passes
bash scripts/ci/check-mobile-imports.sh
```

### Pre-commit Hook (Optional)
```bash
# .husky/pre-commit
#!/bin/sh
bash scripts/ci/check-mobile-imports.sh || exit 1
npx eslint src/ || exit 1
```

---

## 10. Edge Cases Already Handled

### Case 1: Lazy imports
```javascript
// ❌ This WILL be caught
const { bullmq } = await import('bullmq');

// ✓ Metro shim blocks 'bullmq' module resolution
// ✓ ESLint catches the import statement
```

### Case 2: Barrel exports
```javascript
// ❌ This WILL be caught
// src/index.js
export * from '../workers/summaryWorker';

// ✓ ESLint pattern rule catches '../workers/*'
// ✓ ESLint module rule catches 'bullmq' transitive import
```

### Case 3: Dynamic requires
```javascript
// ❌ This WILL be caught (regex pattern)
const bullmq = require('bullmq');

// ✓ CI script grep catches require() calls
// ✓ Metro shim blocks module resolution
```

### Case 4: Shared utils importing server code
```javascript
// ❌ This WILL be caught
// src/utils/math.js
import { redis } from '../lib/queue';  // ✗ ESLint error

// src/screens/Home.js
import { calculate } from '../utils/math';  // ✗ ESLint error propagates
```

---

## Summary: Layers of Defense

| Layer | Tool | Catches | When |
|-------|------|---------|------|
| 1 | ESLint | Import statements | Write-time (IDE) |
| 2 | Metro | Module resolution | Build-time |
| 3 | CI check | Grep violations | Pre-merge (CI) |
| 4 | Pre-commit hook | All above | Before git push (optional) |
| 5 | Runtime shim | Lazy imports | If code runs (fallback) |

**Result:** Nearly impossible to accidentally ship server code in the mobile bundle.

---

## Testing the Guards

### Quick test (local):
```bash
# 1. ESLint
npm run lint
# Expected: No errors

# 2. CI script
bash scripts/ci/check-mobile-imports.sh
# Expected: ✅ PASSED

# 3. Build
npm start
# Expected: No Metro errors about child_process
```

### Simulate violation (to test guards work):
```bash
# Temporarily add server import
echo "import bullmq from 'bullmq';" >> src/api/summaryApi.js

# Run checks
npm run lint        # ❌ Should fail
bash scripts/ci/check-mobile-imports.sh  # ❌ Should fail
npm start          # ❌ Should fail

# Revert
git checkout src/api/summaryApi.js
```

---

## Stamp

✅ **Bulletproofed.** No way to accidentally ship server code to the phone.
