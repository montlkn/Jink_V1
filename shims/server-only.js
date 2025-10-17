/**
 * Server-Only Module Shim
 *
 * This module is loaded by Metro when a server-only dependency (like BullMQ or Redis)
 * is accidentally imported from React Native code. It throws an error with clear
 * instructions on how to fix the issue.
 *
 * DO NOT import server modules in the mobile app. Instead, call HTTP APIs that
 * delegate to the backend.
 */

module.exports = new Proxy({}, {
  get() {
    throw new Error(
      `❌ ARCHITECTURE ERROR: Attempted to import a server-only module into React Native.\n\n` +
      `This typically happens when:\n` +
      `  1. Mobile code imports BullMQ, Redis, or backend worker code\n` +
      `  2. Backend code is accidentally re-exported from src/index.js\n` +
      `  3. A barrel export (*) pulls in server dependencies\n\n` +
      `FIX: Server-side code must NOT be imported from React Native.\n` +
      `  ✓ Move queue, workers, and middleware to a separate backend service\n` +
      `  ✓ Mobile app should only call HTTP APIs\n` +
      `  ✓ Use fetch() to call backend endpoints instead\n\n` +
      `Example mobile API call:\n` +
      `  const res = await fetch('/api/profile/summary?autogen=true', {\n` +
      `    headers: { 'Authorization': 'Bearer ' + token }\n` +
      `  });\n` +
      `  const data = await res.json();\n\n` +
      `See docs/PRODUCTION_GATE_CHECKLIST.md for architecture guidance.`
    );
  }
});
