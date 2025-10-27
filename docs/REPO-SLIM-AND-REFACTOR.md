# Repo slim-down & full-app refactor — plan and runbook

**Goal (one line)**  
Slim and modularize the entire repo. Remove docs, references, packages, and code that are not actually used by the app. Create a clean package surface for each feature. Migrate incrementally and safely.

---

## Success criteria

* App behavior unchanged for end users.
* `npm test` / `yarn test` and CI pass.
* No runtime references to removed packages or services.
* A clear package layout (workspace or `/src/*` packages) with stable public APIs.
* Docs reflect actual runtime surface only. Deprecated docs moved to `docs/archived`.
* CI enforces no deep imports into package internals and disallows new bloat.

---

## Quick summary of approach

1. **Audit**: discover declared deps, used deps, doc/service mentions, large/tangled files, circulars.
2. **Rank hotspots**: files/modules with highest coupling and bloat candidates.
3. **Plan**: pick an incremental migration order (UI, services, native, docs).
4. **Strangler migration**: create package/public API, copy implementation, add tests, codemod import sites, repeat.
5. **Prune**: remove unused deps, archive irrelevant docs, delete legacy files.
6. **Enforce**: add lint/CI rules to prevent regression.

---

## Audit phase — commands to run now

> Requirements: `ripgrep (rg)`, `jq`, Node 18+, `npx` available. Install ripgrep: `brew install ripgrep`.

Create a directory to collect outputs: `mkdir -p refactor && cd refactor`.

### 1) Declared deps (JS/TS)

```bash
# from repo root
jq -r '[.dependencies // {} , .devDependencies // {}] | add | keys[]' package.json | sort > refactor/declared_deps.txt
```

### 2) Used deps (non-relative imports)

```bash
# capture used package names from imports/requires
rg --hidden --no-ignore -n "(import .+ from|require\()" src app packages --glob '!**/node_modules/**' || true

# extract package names (non-relative)
rg --hidden --no-ignore -g '!**/node_modules/**' "import .* from|require\(" src app packages \
  | sed -E "s/.*from ['\"]([^'\"\.\/][^'\"]*)['\"].*/\1/; s/.*require\(['\"]([^'\"\.\/][^'\"]*)['\"]\).*/\1/" \
  | sort -u > refactor/used_deps.txt
```

### 3) Package vs used diff (potential unused)

```bash
comm -23 refactor/declared_deps.txt refactor/used_deps.txt > refactor/potential_unused_deps.txt
```

### 4) Depcheck (JS) — automated diagnose

```bash
# may produce false positives for dynamic requires and CLI usage
npx depcheck --specials=bin,parcel,webpack > refactor/depcheck.json || true
```

### 5) Native / pod / gradle references (React Native)

```bash
rg -n "fly.io|bullmq|modal|bull|fly|redis|bull-board|bullmq" android ios ios Podfile* --hidden || true
rg -n "fly.io|bullmq|modal|bull|fly|redis" package.json .github workflows docs || true
```

### 6) Docs references (find docs mentioning services or packages)

```bash
# make a list of suspicious names from declared_deps.txt and search docs/ root files
cat refactor/declared_deps.txt \
  | xargs -I{} sh -c "rg -n \"{}\" README.md docs .github || true" \
  > refactor/docs_mentions.txt
```

### 7) File coupling and circulars (visual)

```bash
# dependency graph + circular dependencies
npx madge --extensions js,jsx,ts,tsx --circular src app packages > refactor/madge_circulars.txt || true
npx madge --extensions js,jsx,ts,tsx --image refactor/import_graph.svg src app packages || true
```

### 8) Large/tangled files (by import degree)

```bash
npx madge --json src app packages > refactor/madge.json
# convert to readable list of module in-degree/out-degree (script below)
node -e "const fs=require('fs');const m=JSON.parse(fs.readFileSync('refactor/madge.json'));const edges=Object.keys(m);const inC={};edges.forEach(k=>{m[k].deps.forEach(d=>inC[d]=(inC[d]||0)+1)});console.log(Object.entries(inC).sort((a,b)=>b[1]-a[1]).slice(0,60).map(([f,n])=>n+' '+f).join('\\n'))" > refactor/hotspots.txt
```

### 9) Tests / coverage baseline

```bash
npm ci
npm test --silent > refactor/test_output.txt || true
# if TS: npx tsc --noEmit
```

---

## Interpreting audit outputs

* `potential_unused_deps.txt` + `depcheck.json` are candidates. Verify manually for dynamic requires and CLI usage.
* `docs_mentions.txt` lists docs that mention a package or service. If a package is referenced in docs but not used in code, it is *bloat for our goal* but still needs manual confirmation before deletion. Move confirmed items to `docs/archived/` before deleting.
* `hotspots.txt` and `madge_circulars.txt` show tangled modules. Migrate these first.

---

## Safety notes before pruning

* **Depcheck/dep lists have false positives** for: dynamic `require`, CLI tools used in scripts, native pods, Metro/gradle plugins. Validate by grepping for references in `android/`, `ios/`, `.github/`, and top-level scripts.
* For RN, check `android/app/build.gradle`, `ios/Podfile`, and `MainApplication.java` for native package usage.
* Always run full app builds on a CI or a device/emulator before removing dependencies.

---

## Refactor & slim strategy (strangler pattern — repo-wide)

### Package layout (recommended)

Use workspaces (pnpm or yarn) or keep namespaced `src/packages`:

```
/packages
  /app            # Expo / React Native entry
  /ui             # shared UI components
  /orb            # example feature -> each feature becomes a package
  /services       # API clients, infra (supabase, auth)
  /core           # utilities, constants, types
/docs
/refactor        # audits, scripts, codemods
```

Advantages: clear public API per package, separate lint/test/size budgets.

### Migration steps (for each logical module)

1. **Pick a hotspot** from `hotspots.txt` or a module with many cross-file references.
2. **Create package skeleton** (e.g., `packages/<module>`). Add `index.(ts|js)` that exports a small stable API.
3. **Copy implementation** to new package. Keep code unchanged at first. Add unit tests.
4. **Add story / example**.
5. **Codemod imports** in callers to point to `packages/<module>` public API. Use `jscodeshift` or `libcst` for AST-safe changes.
6. **Run tests**. Fix issues.
7. **Iterate** until callers to legacy code are zero. Then delete the legacy files in one cleanup PR.

### Codemod example (JS/TS)

Use `jscodeshift` to replace deep imports:

```bash
# codemod: replace imports from deep paths into new public package import
jscodeshift -t refactor/codemods/replace-deep-imports.js src packages --extensions=js,jsx,ts,tsx
```

Make the codemod only change import `source.value` and preserve local identifiers. Test on a single file with `--dry`.

---

## Docs & references cleanup

1. Identify docs that reference services/packages in `refactor/docs_mentions.txt`.
2. For each entry:

   * If the package is unused and not planned, move doc to `docs/archived/` and add header: `ARCHIVED: replaced by <new> on <date>`.
   * If the doc is still useful, update it to the current implementation.
3. Add a small script to CI that warns if docs mention a package not present in `package.json` or not used in code:

```bash
# docs-check.sh (simplified)
jq -r '[.dependencies // {}, .devDependencies // {}] | add | keys[]' package.json > /tmp/declared
rg --no-ignore -n --hidden -o "[a-zA-Z0-9_\\-\\.\\/]+" docs README.md \
  | sort -u > /tmp/docs_words
comm -23 /tmp/docs_words /tmp/declared || true
```

4. Remove the bloat docs and commit with `docs/archived`.

---

## Dependency pruning & validation

1. Use `comm -23` and `depcheck` to produce a candidate list.
2. For each candidate:

   * Grep non-js locations: `rg -n "pkgname" ios android .github scripts || true`.
   * Check `package.json` scripts for CLI usage.
   * Check `yarn.lock`/`package-lock.json` to find transitive usages.
3. Remove locally: `npm uninstall <pkg>` or update `package.json` and run install.
4. For RN remove native pods if necessary: `cd ios && pod install`.
5. Run full build + tests: `npm test`, `expo start`, and `gradlew assembleDebug` / Xcode run (or CI emulator).
6. Keep a PR documenting each removed dependency and the verification steps. Rollback if CI fails.

---

## Linting / CI / enforcement

Add the following CI gates and lint rules:

**CI jobs**

* `audit:deps` — runs the audit script and fails if new unused deps are added.
* `lint` — `eslint` with `import/no-restricted-paths` to block deep imports into package internals.
* `madge` circular check — fail on new circular dependencies.
* `docs-check` — warn/fail if docs reference a removed/unused package.

**Eslint rule example**

```json
"rules": {
  "import/no-restricted-paths": ["error", {
    "zones": [
      {"target": "./src/screens", "from": "./src/components/*/three"}
    ]
  }]
}
```

**Pre-commit**

* `pre-commit` or Husky to run `eslint --fix`, `prettier`, and a quick `rg` smoke check.

---

## PR & workflow rules

* **One logical change per PR**: package migration, dependency removal, or docs archival.
* PR must include: tests, linter pass, CI green, and a short migration checklist (what was moved, why, and how tested).
* Keep PRs small and reviewable. Prefer many green PRs over one big rewrite.
* Maintain a central `refactor/strangler` branch and merge small PRs into it. Final merge of `refactor/strangler` → `main` when stable.

---

## Automation: repo scripts to add

Add scripts into `refactor/tools/`:

1. `audit-all.sh` — runs all audit commands and writes files to `refactor/`.
2. `find-doc-mismatches.js` — node script that compares `declared_deps` vs words found in docs and produces suggestions.
3. `codemod-runner.sh` — run codemods safely with dry-run and produce a patch for review.

(If you want I can produce these exact scripts.)

---

## Rollback & testing strategy

* Every PR must be reversible. Keep changes on `refactor/strangler`.
* Before deleting anything: run `rg` to confirm zero references.
* Add a nightly CI job that runs a smoke build and `e2e` tests against a canonical environment.
* If a removed dependency causes runtime failure, revert the PR and mark the dependency as “re-check” in `refactor/status.md`.

---

## Archival policy for docs & legacy code

* Move legacy docs to `docs/archived/YYY-MM-DD/` with a short reason and pointer to the new doc or “archived”.
* Add `docs/archived/README.md` documenting why things were archived.
* For legacy code that might be useful historically, create a `legacy/` branch + tag, and remove from mainline.

---

## Timeline and first 6 milestones (example)

1. **Audit**: generate `refactor/*` outputs. (1 day)
2. **Rank & plan**: pick top 5 hotspots and the package layout. (0.5 day)
3. **Create packages skeleton & CI rules**: add eslint rules and CI checks. (1 day)
4. **Migrate top hotspot**: package + tests + codemod. (2–3 days)
5. **Migrate next 3 hotspots**: repeat (each 1–3 days).
6. **Prune deps & docs**: staged removal and verification (2–3 days). Total: reasonable first pass in ~2 weeks for medium-size repo. Adjust to repo complexity.

---

## Short checklist to run immediately (copy-paste)

```bash
# from repo root
mkdir -p refactor && cd refactor
# 1. create declared/used diff
jq -r '[.dependencies // {} , .devDependencies // {}] | add | keys[]' ../package.json | sort > declared_deps.txt
rg --hidden --no-ignore -g '!**/node_modules/**' "import .* from|require\(" ../src ../app ../packages || true \
  | sed -E "s/.*from ['\"]([^'\"\.\/][^'\"]*)['\"].*/\1/; s/.*require\(['\"]([^'\"\.\/][^'\"]*)['\"]\).*/\1/" \
  | sort -u > used_deps.txt
comm -23 declared_deps.txt used_deps.txt > potential_unused_deps.txt
# 2. run depcheck (optional)
cd .. && npx depcheck --specials=bin,parcel,webpack > refactor/depcheck.json || true && cd refactor
# 3. graph + hotspots
cd .. && npx madge --json src app packages > refactor/madge.json || true && python3 - <<'PY'
import json,sys
m=json.load(open('refactor/madge.json'))
inC={}
for k,v in m.items():
  for d in v.get('deps',[]):
    inC[d]=inC.get(d,0)+1
print('\n'.join(sorted([f'{n} {f}' for f,n in inC.items()],reverse=True)[:50]))
PY
# 4. search docs mentions
cd .. && cat refactor/declared_deps.txt | xargs -I{} sh -c "rg -n \"{}\" README.md docs .github || true" > refactor/docs_mentions.txt
```

---

## Final notes and gotchas

* Dynamic imports, CLI-only packages, and native pods require manual validation. Treat `potential_unused_deps.txt` as a candidate list not an immediate deletion list.
* Keep PR sizes small. Migration is safer than rewrite.
* If you prefer, I can produce the `refactor/audit.sh` script and a `find-doc-mismatches.js` script and run a dry audit locally for you to inspect. Tell me whether you want PNPM workspaces or in-repo packages and whether I should generate codemod templates for import replacement.

---

## Next immediate step for me if you want

1. I will generate the `refactor/audit.sh` and `refactor/find-doc-mismatches.js` scripts and the `refactor/codemods/replace-deep-imports.js` template.
2. Or run the audit now and return `refactor/*` files if you give me access/run permission.
