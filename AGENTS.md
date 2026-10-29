# Agent Rules — Simulation

Project-specific rules. The global agent behaviour rules in `~/.gemini/GEMINI.md` apply on top of
this file (language, communication style, engineering workflow, safety, SemanticBrain pre/post).

## Documentation language

- All Markdown documentation must be **Standard Technical English**: `docs/`, root `*.md`
  (`ARCHITECTURE.md`, `DECISIONS.md`, `TEST_INFRA.md`, `CHANGELOG.md`, `README.md`, this file).
- Chat replies and commit messages stay Vietnamese. User-facing game strings keep their
  Vietnamese/English i18n pair.
- Dated `docs/*_2026-*.md` analyses are archived snapshots and may keep their original language;
  translate them when a change touches most of the file.

## Single source of truth

- Cross-cutting constants live in `config/game-constants.json` (currency, grain, calendar,
  fatigue cap). TS surface: `src/shared/constants.ts`; the engine requires the JSON; the classic
  client keeps a copy in `public/js/config.js`. `tests/verify-shared-constants.ts` fails on drift.
- Currency is **Quan** (VI) / **quan** (EN); grain is **Thạch** (VI) / **piculs** (EN). Never
  reintroduce `N Tiền`, `N Qian` or `Dan` unit labels; `npm run lint:slop` enforces zero.
- Feature-owned tables stay in their feature: `engine/action-policy.js`, `CANONICAL_LABOR_SHIFTS`,
  `GUARD_TIER_CONFIGS`, `SETTLEMENT_PROFILES`. Do not move domain data into the global file.

## Verification and commits

- Run `npm run verify` after every change (typecheck, four lint ratchets, route shadowing,
  23 suites, 28 API contracts, 8 write smokes). Run `npm run audit` for the 1,358 invariants.
- Run `npm run build:client` after any `src/client` or `public/js` change; restart the dev server
  before a browser check (an old server keeps serving the old bundle).
- Tests under `tests/verify-*.ts` are auto-discovered; no list edit is needed.
- Commit after a green build/test, staging only task-scoped files. Never `git add -A`; prefer
  `node E:\Tools\SemanticBrain\tools\git-safe-commit.js -m "<message>" <files...>` when available.
- Do not overwrite configuration, metadata or rule files without inspecting them first.
