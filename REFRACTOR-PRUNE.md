Refactor plan — prune branch

Target
Refactor the prune pipeline into a clean, modular package with explicit public APIs, improved tests, safe incremental migration, and automated CI checks. This targets the prune branch as the source of truth. 

README

Goals (measurable)

Produce a single, well-documented package API: jink_pruner.{loader,features,scorer,selector,validator,cli}.

Reduce module coupling and remove dead code. Target >60% of orb-related or tangled files moved to modules with explicit public API.

Maintain or increase test coverage. Minimum: keep all existing tests passing and add unit tests per migrated module. Tests exist and will act as safety net. 

tests/height_test

Prune unused dependencies from requirements.txt.

Make small, reviewable PRs. One module per PR. Each PR must include tests and CI pass.

Scope

In scope: src/ code for the pruner; existing tests under tests/; requirements.txt and dev tooling. 

README

Out of scope: full rewrite, data outputs, large dataset reprocessing, unrelated frontend repos.

Constraints & decision rule

Incremental migration (strangler) unless audit shows rewrite conditions (low test coverage, impossible build tool constraints, or unresolvable circular deps). Current repo is modular with tests and a requirements file so incremental migration is preferred. 

README

Success criteria

pytest passes on CI for all PRs.

Public package jink_pruner with documented run()/prune() entrypoints.

No imports from legacy paths (src/* non-public files) after final cleanup.

requirements.txt reduced by removing at least one third of unused libs (if present) or locked versions added.

Quick audit (deliverable: refactor/audit.md)

Run locally on prune branch.

Commands:

# environment
python -m venv .venv && source .venv/bin/activate
pip install pipdeptree vulture pydeps ruff mypy

# deps
pipdeptree --freeze > refactor/deps_tree.txt

# dead code (approx)
vulture src/ > refactor/vulture_dead.txt || true

# import graph
pydeps --max-bacon 3 --noshow --output refactor/import_graph.svg src/

# tests
pytest -q --maxfail=1


Audit output:

Top 10 files by incoming edges (tangled hubs).

Dead exports and unused functions.

Circular dependencies list.

Deliver refactor/audit.md with a ranked list (priority to high inbound-degree modules and high-change-risk files).

Target package layout (suggested)
src/jink_pruner/
  __init__.py            # package exports and VERSION
  cli.py                 # thin CLI adapter
  loader.py              # data loader + fixtures
  features.py            # feature engineering
  scorer.py              # rule-based scoring functions
  selector.py            # diversity + selection algorithms
  validator.py           # validation/plots
  config.py              # load_config wrapper
  _legacy/               # temporary: moved legacy files (internal only)
tests/
  test_loader.py
  test_features.py
  test_scorer.py


API surface:

jink_pruner.run(config_path) — full pipeline run.

jink_pruner.prune(df, config) — core pure function returning pruned rows.

Module-level pure functions for features and scoring.


Migration strategy (Strangler pattern)

Create branch: refactor/strangler from prune.

One module at a time:

Pick top-priority module from audit (high-coupling or high-change friction).

Create src/jink_pruner/<module>.py. Copy code with minimal edits. Add type hints. Add tests.

Add __all__ and exports.

Replace callers to use from jink_pruner.loader import X. Do not delete original file yet.

Run tests and linter.

Repeat until callers of original file are zero.

Delete legacy file in a single cleanup PR after reference count is zero.


Rationale: small PRs, easy review, safe rollback.


Implementation details (per module)
loader.py

Responsibilities: load CSV/geo data into DataFrame/GeoDataFrame, provide small fixtures for tests.

Requirements: explicit return types, no module-level side effects.

Tests: test_loader.py with small CSV fixture.


features.py

Responsibilities: compute numeric features and normalized columns. Stateless pure functions.

Tests: check exact numeric outputs on synthetic input.


scorer.py

Responsibilities: rule-based scoring and normalization. No global config. Expose score(df, config).


selector.py

Responsibilities: clustering + MMR selection. Keep external ML calls isolated. Expose select(df, k, rng).


validator.py

Responsibilities: plotting and metric checks. Keep plotting optional behind --no-display flag.


Coding standards & tooling

Add or enforce:

ruff for linting.

mypy incremental strictness.

pytest with coverage.

pre-commit hooks for formatting.

pyproject.toml for tools config.

Example pyproject.toml (snippet):

[tool.ruff]
line-length = 100
select = ["E", "F", "W", "C"]

[tool.mypy]
strict = false


Codemod / import replacement

Preferred approach: small, reversible edit per file. Use git grep + sed for straightforward replacements. For more complex refactors, use Bowler or libcst.


Simple import replacement script

# Replace "from data_loader import X" with "from jink_pruner.loader import X"
git grep -n "from data_loader import" -- '*.py' | cut -d: -f1 | sort -u \
  | xargs -n1 sed -i 's/from data_loader import /from jink_pruner.loader import /g'
git add -A && git commit -m "refactor: point imports to jink_pruner.loader (codemod)"


Bowler example (recommended for robust codemods)
Create codemods/replace_imports.py:

from bowler import Query
(
    Query("src")
    .select_module()  # will iterate files in src/
    .modify(
        lambda node, capture, filename: node  # custom transformation to change ImportFrom nodes
    )
    .write()
)


Use Bowler to do fine-grained AST-aware changes. Test codemods on one file first.


Tests & CI

CI checklist for each PR:

pytest -q

ruff check src tests

mypy src --ignore-missing-imports

pipdeptree sanity check

Example GitHub Actions job:

name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with: python-version: '3.11'
      - run: |
          python -m pip install -U pip
          pip install -r requirements.txt
          pip install ruff mypy pytest pipdeptree
      - run: ruff check src tests
      - run: mypy src || true
      - run: pytest -q


Add coverage gating after baseline stabilized.


Dependency pruning

Run pipdeptree --freeze > refactor/deps.txt.

Cross-check with vulture dead imports and importlib runtime checks.

Remove unused lines from requirements.txt. Commit change and run CI to ensure nothing breaks.

Pin versions and add constraints.txt if needed.


PR rules & template

One module per PR.

Include tests.

Add a short changelog in PR description: what moved, what API, test status.

Include BREAKING-CHANGES.md if public API changed.

PR template:

### What
- Moved <old> -> `jink_pruner.<module>`
- Added tests: tests/test_<module>.py

### Why
- Reduce coupling. Provide stable API.

### Risk
- Low. Covered by unit tests.

### Manual test
- `pytest tests/test_<module>.py -q`


Acceptance & final cleanup

Merge all module PRs.

Add a refactor/cleanup PR that deletes legacy files. It must be reviewed and merged only after CI shows no references.

Update README.md with new dev instructions and jink_pruner API.


Rollback & risk mitigation

Keep changes small. If something breaks, revert the offending PR.

Keep a single refactor/strangler branch until all modules are green. Merge small PRs into refactor/strangler. When stable, merge refactor/strangler → prune. This centralizes integration risk.


Milestones (example)

Audit & plan — commit refactor/audit.md.

Module 1 (loader) — package + tests.

Module 2 (features) — package + tests.

Module 3 (scorer).

Module 4 (selector).

Final cleanup — remove legacy files, prune deps, update README.


Each milestone is one or more PRs. Keep PR size under ~300 LOC.


Checklist (pre-merge for each module)

 New module file exists in src/jink_pruner.

 Unit tests added and passing.

 All callers updated to new import.

 Lint pass (ruff).

 Type checks or mypy note added if not fully typed.

 requirements.txt unchanged (dep pruning later).

 PR description documents intent and tests.


Next immediate actions (concrete)

Create branch: git checkout -b refactor/strangler prune.

Run audit commands and commit refactor/audit.md.

Pick the highest-priority module from audit and open the first PR with module + tests.


Notes / References

Repo structure, README, and requirements.txt indicate an existing modular Python project and a prepared test suite, making the strangler approach appropriate. 

README +1
