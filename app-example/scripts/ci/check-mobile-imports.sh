#!/bin/bash
##
# CI Check: Prevent server imports in mobile code
#
# This script fails the build if any React Native code accidentally imports
# server-only modules like BullMQ, Redis, or backend services.
#
# Usage: scripts/ci/check-mobile-imports.sh
# Exit code: 0 if no violations, 1 if violations found
##

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SRC_DIR="$PROJECT_ROOT/src"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "${YELLOW}🔍 Checking for server imports in mobile code...${NC}"

# Check for forbidden module imports
FORBIDDEN_MODULES=(
  "bullmq"
  "ioredis"
  "redis"
  "child_process"
  "fs"
  "net"
  "tls"
)

VIOLATIONS=0

for module in "${FORBIDDEN_MODULES[@]}"; do
  if grep -r --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" \
    -E "from ['\"]($module)['\"]|import ['\"]($module)['\"]|require\(['\"]($module)['\"]\)" \
    "$SRC_DIR" 2>/dev/null; then
    echo "${RED}❌ VIOLATION: Import of '$module' found in mobile code${NC}"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

# Check for forbidden file patterns
FORBIDDEN_PATTERNS=(
  "workers/"
  "lib/queue"
  "middleware/rateLimitBreaker"
  "api/routes/"
)

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  if grep -r --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" \
    -E "from ['\"][^'\"]*$pattern[^'\"]*['\"]|import ['\"][^'\"]*$pattern[^'\"]*['\"]" \
    "$SRC_DIR" 2>/dev/null; then
    echo "${RED}❌ VIOLATION: Import of server code '$pattern' found in mobile code${NC}"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ $VIOLATIONS -gt 0 ]; then
  echo ""
  echo "${RED}❌ FAILED: $VIOLATIONS server import violation(s) detected${NC}"
  echo ""
  echo "Architecture violation detected:"
  echo "  Mobile code must NOT import server-only modules."
  echo "  Instead, call HTTP API endpoints."
  echo ""
  echo "Forbidden modules: ${FORBIDDEN_MODULES[*]}"
  echo "Forbidden patterns: ${FORBIDDEN_PATTERNS[*]}"
  echo ""
  echo "Fix: Remove the imports and call HTTP API instead:"
  echo "  ✓ summaryApi.fetchSummary(true)  // calls GET /api/profile/summary?autogen=true"
  echo "  ✓ summaryApi.regenerateSummary() // calls POST /api/profile/summary/regenerate"
  echo ""
  exit 1
else
  echo "${GREEN}✅ PASSED: No server imports found in mobile code${NC}"
  exit 0
fi
