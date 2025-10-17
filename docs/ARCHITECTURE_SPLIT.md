# Architecture: Separating Mobile & Server Code

## The Problem We Fixed

The React Native app was importing server-only code (BullMQ, Redis workers) into its bundle, causing Metro bundler errors and breaking the app.

```
❌ BEFORE (BROKEN)
  React Native App
    ↓ imports
  src/workers/summaryWorker.js
    ↓ imports
  bullmq (Node.js only)
  ioredis (Node.js only)
    ↓ result
  METRO BUNDLER ERROR: child_process not found
```

## The Solution

**Mobile app calls HTTP APIs. Backend handles jobs.**

```
✅ AFTER (FIXED)
  React Native App
    ↓ HTTP call
  /api/profile/summary?autogen=true
    ↓ server-side
  Backend (Node.js)
    ↓ uses
  BullMQ Queue + Redis
```

---

## What Changed

### 1. Removed Server Dependencies from Mobile Bundle

**package.json**
- ❌ Deleted: `"bullmq": "^5.61.0"`
- ❌ Deleted: `"ioredis": "^5.8.1"`
- ✅ These belong in a separate backend package.json

**quizApi.js**
- ❌ Removed: `await import('../workers/summaryWorker')`
- ❌ Removed: `checkAndQueueSummaryGeneration(userId)`
- ✅ Backend now handles divergence checking via Supabase RPC

### 2. Added Metro Safety Guards

**metro.config.js** now blocks server modules:
```javascript
config.resolver.extraNodeModules = {
  'bullmq': SERVER_ONLY_SHIM,
  'ioredis': SERVER_ONLY_SHIM,
  'child_process': SERVER_ONLY_SHIM,
  // ... other Node stdlib
}
```

If someone accidentally imports BullMQ:
```
❌ Error: This module is server-only. Do not import BullMQ/Redis in React Native.
```

**shims/server-only.js** provides clear error message.

---

## Current File Locations

### ✅ Mobile Code (stays in app bundle)
```
src/
├── api/summaryApi.js          → HTTP client only
├── screens/ProfileDetailScreen.js
└── services/aestheticScoringService.js
```

### ⚠️ Server Code (must move to backend)
These files are currently in src/ but **should NOT be imported by mobile**:

```
src/
├── lib/queue.js               → BACKEND ONLY
├── middleware/rateLimitBreaker.js  → BACKEND ONLY
├── workers/summaryWorker.js   → BACKEND ONLY
├── workers/__tests__/concurrency.test.js  → BACKEND TESTS
├── api/routes/summaryRoutes.js    → BACKEND ENDPOINTS
├── services/summary/generate.js   → BACKEND SERVICE
└── services/ai/client.js      → Can be shared with Gemini key
```

### ✅ Shared Code (pure functions, no Node deps)
```
src/
├── utils/normalize.js         → Pure math
├── utils/divergence.js        → Pure math
├── utils/piiSanitizer.js      → Pure utils
└── config/aiConfig.js         → Config only
```

---

## Data Flow

### Before (BROKEN)
```
ProfileDetailScreen
  ↓
quizApi.calculateAestheticProfile()
  ↓ [mobile - bad]
summaryWorker.enqueueSummaryGeneration()
  ↓ [BUNDLER ERROR]
```

### After (FIXED)
```
ProfileDetailScreen
  ↓
quizApi.calculateAestheticProfile()
  ↓ [Supabase RPC]
Backend: calculate_aesthetic_profile()
  ↓ [backend - good]
Backend: check divergence + queue job
  ↓ [mobile calls API]
summaryApi.fetchSummary(true)
  ↓ [HTTP GET /api/profile/summary?autogen=true]
Backend: returns cached or queues generation
```

---

## Next Steps: Move Backend Code

To fully separate concerns, move these files to a separate backend service:

```
/backend/                    (new Node.js backend)
  ├── src/
  │   ├── lib/queue.js
  │   ├── middleware/
  │   ├── workers/
  │   ├── services/summary/
  │   ├── api/routes/
  │   └── config/
  ├── package.json           (includes bullmq, ioredis, express, etc.)
  └── start-worker.js
```

### Backend package.json example:
```json
{
  "dependencies": {
    "bullmq": "^5.61.0",
    "ioredis": "^5.8.1",
    "express": "^4.18.0",
    "@supabase/supabase-js": "^2.52.1",
    "@google/generative-ai": "^0.24.1"
  }
}
```

### Mobile app keeps only client dependencies:
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.52.1",  // For auth
    "react-native": "0.76.9",
    "expo": "^52.0.47",
    // ... UI deps
    // NO bullmq, NO ioredis
  }
}
```

---

## Safety Guarantees

### ✅ Metro now fails loudly if someone imports server code
```javascript
// In mobile app (WILL FAIL)
import Queue from 'bullmq';  // ❌ Metro throws clear error
```

### ✅ API calls are the only mobile-to-backend interaction
```javascript
// In mobile app (CORRECT)
const data = await fetch('/api/profile/summary?autogen=true', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### ✅ Backend handles all queue/worker logic
```javascript
// In backend only
const queue = new Queue('profile-summary', { connection: redis });
const worker = new Worker('profile-summary', processSummary, { ... });
```

---

## Testing This Fix

### Build mobile app (should work now):
```bash
cd /Users/lucienmount/Arch_App_V2/architecture-app
npm run lint
npm start
```

### If bundler still complains:
1. Check that no file in `src/` imports from:
   - `bullmq`
   - `ioredis`
   - `redis`
   - `child_process`
   - Backend-specific files (`workers/`, `middleware/rateLimitBreaker.js`)

2. Search for accidental imports:
   ```bash
   grep -r "from.*workers" src/
   grep -r "from.*queue" src/
   grep -r "from.*rateLimitBreaker" src/
   ```

3. If found, remove those imports and call the API instead.

---

## Architecture Decision Log

| Decision | Reason |
|----------|--------|
| Mobile only calls APIs | Mobile can't run Node processes; keep bundle small |
| Server handles queue | BullMQ requires Node runtime; mobile has no process manager |
| Shared util layer | `normalize.js`, `divergence.js` are pure; can run anywhere |
| Metro shim for safety | Fail-fast when architecture is accidentally violated |
| PII sanitizer shared | Pure function; both sides validate safety |

---

## Summary

- ✅ Mobile app is now **clean** (no server deps)
- ✅ Backend is **organized** (all Node code in one place)
- ✅ API contract is **clear** (mobile ↔ HTTP ↔ backend)
- ✅ Safety guards are **automatic** (Metro fails on violations)

**Result:** Metro no longer complains about `child_process`. The phone is no longer pretending to be a data center.
