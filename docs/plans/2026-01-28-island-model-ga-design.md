# Island Model GA with Stagnation Indicator

**Date:** 2026-01-28
**Status:** Approved

## Overview

Improve GA search quality by running multiple independent populations ("islands") that exchange individuals when stuck. Add user-facing indicator when search converges early.

## Goals

1. Show "Converged early (gen 152/1000)" when GA exits due to stagnation
2. Run parallel GA islands to improve result quality through diversity
3. Use stagnation-triggered migration between islands

## Design

### Stagnation Indicator

Add `exitReason` field to search completion:
- `"complete"` - Ran all generations
- `"stagnation"` - Converged early
- `"cancelled"` - User stopped
- `"timeout"` - Deadline hit (exhaustive only)

UI displays reason in search feedback area after completion.

**Files:**
- `genetic-core.ts` - Return exit reason + final generation
- `search-worker.ts` - Include metadata in `complete` response
- `WorkerResponse` type - Add `exitReason`, `finalGeneration` fields
- `search-feedback.tsx` - Display the reason

### Island Model Architecture

```
Main Thread (Coordinator)
    │
    ├── Island Worker 0 ──┐
    ├── Island Worker 1 ──┼── Ring: 0→1→2→3→0
    ├── Island Worker 2 ──┤
    └── Island Worker 3 ──┘
```

**Island count:** `Math.min(navigator.hardwareConcurrency ?? 4, 8)`

**Migration flow:**
1. Island hits stagnation threshold (25 gens without improvement)
2. Requests migrants from ring neighbor instead of random diversity injection
3. Coordinator routes request, gets top 2 individuals from neighbor
4. Stagnating island incorporates migrants, resets stagnation counter

### Worker Protocol

**Coordinator → Island:**
```typescript
| { type: "start"; config: GAConfig; islandId: number }
| { type: "stop" }
| { type: "requestMigrants"; count: number }
| { type: "receiveMigrants"; individuals: Chromosome[] }
```

**Island → Coordinator:**
```typescript
| { type: "progress"; islandId: number; generation: number; bestScore: number }
| { type: "stagnating"; islandId: number }
| { type: "migrants"; islandId: number; individuals: Chromosome[] }
| { type: "complete"; islandId: number; results: SearchResult[]; exitReason: string; finalGen: number }
```

**Progress aggregation:** Sum generations across islands (e.g., 4 islands × gen 50 = 200/4000).

**Completion:** When all islands complete, coordinator merges results, dedupes by loadout fingerprint, returns top N.

### Files to Create/Modify

**New files:**
- `src/workers/island-coordinator.ts` - Orchestrates multiple workers
- `src/workers/island-worker.ts` - Single island GA with migration support

**Modified files:**
- `src/search/genetic-core.ts` - Add `exportTopN()`, `importMigrants()`, return exit metadata
- `src/ui/hooks/use-search-worker.ts` - Use coordinator for GA mode
- `src/ui/panels/search-feedback.tsx` - Display exit reason
- `src/workers/search-worker.ts` - Update WorkerResponse type

## Non-Goals

- No UI for island count configuration
- No per-island progress visualization
- No timed migration (stagnation-triggered only)
- No complex topologies (ring only)
- No changes to exhaustive search
- No persistence of island state

## Fallback

If `navigator.hardwareConcurrency` is 1 or unavailable, use single-worker GA (current behavior).
