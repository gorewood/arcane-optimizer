# AO Armor Optimizer

Arcane Odyssey gear loadout optimization engine. Static web app — pure client-side, no backend.

## Tooling Priority

**Always use `just` for dev lifecycle commands.** Never call `npm`, `npx`, `tsc`, `eslint`,
or `vite` directly — use the corresponding `just` recipe. This ensures agents and humans
run identical steps through mise-managed tooling every time.

```bash
just --list           # See all available recipes
just setup            # First-time: mise + npm ci
just check            # ALL quality gates
just dev              # Dev server
just build            # Production build
just lint             # Lint with auto-fix
just test             # Run tests
just add-component X  # Add shadcn/ui component
```

If a recipe doesn't exist for what you need, **add it to the justfile** (unless it's
a one-off bespoke command). Node and npm are managed by mise — never use system node.

## Quality Gates

```bash
just check    # typecheck + lint-check + test (all three, in order)
just typecheck
just lint-check
just test
```

Pre-existing failures are still our problem. All gates must pass before work is complete.

## Conventions

- **TypeScript strict mode** with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- **Zero `any`** — use `unknown` and narrow. ESLint blocks disabling type-safety rules.
- **Complexity limits enforced**: max 60 lines/function, 400 lines/file, cyclomatic complexity 10
- **Type-first**: define interfaces before implementation
- **Pure functions**: domain logic has no side effects
- **Design system tokens only**: no one-off styling, use Tailwind theme tokens
- **Externalized data**: all game data in JSON files under `src/data/`, Zod-validated at load
- **Path alias**: `@/` maps to `src/`
- **Commit regularly** — small, focused commits as work progresses

## Architecture

```
src/
├── data/          # External JSON game data + Zod schemas + loaders
├── models/        # TypeScript domain types and interfaces
├── search/        # Search strategies, fitness, constraints (pure functions)
├── stores/        # Zustand state management
├── ui/            # React components (design system + feature panels)
├── workers/       # Web Worker wrappers for search computation
├── test/          # Test setup and utilities
├── index.css      # Tailwind + dark fantasy theme tokens
├── App.tsx        # Root component
└── main.tsx       # Entry point
```

## Game Data

Stat names use current in-game names (Full Release v1.20):
- Primary: `power`, `defense`
- Secondary: `size`, `dexterity`, `range`, `haste`
- Special: `insanity`, `warding`, `drawback`, `regeneration`, `pierce`, `resistance`

No duplicate items in loadouts. Max 1 helmet accessory, max 1 amulet accessory.

## Task Tracking

Use `bd` for task tracking. Run `bd ready` to see available work.

## Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

### Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - `just check`
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
