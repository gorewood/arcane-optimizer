# Variants System Design

**Date:** 2026-01-28
**Status:** Approved

## Overview

Add a variants system to equipment items, allowing items to have optional stat bonuses based on user-selected variant types (e.g., magic types). This enables optimization for specific character builds like a Fire Mage who can only use fire-based equipment variants.

## Requirements

- Items with variants are always included in search (never filtered out)
- Without any variant enabled in goals → item uses base stats only
- With variants enabled → search considers both base-only AND base + each matching variant
- Variant stats are **additive** to base stats
- Results display which variant was applied (e.g., "Glass Arcsphere (Fire)")
- Variant type grouping (magic, fighting style) is for UX only — stored separately from items

## Data Model

### Equipment Schema Changes

Add optional `variants` field to `EquipmentPiece`:

```typescript
// src/models/types.ts
interface EquipmentPiece {
  readonly id: string;
  readonly name: string;
  readonly setName?: string | undefined;
  readonly slot: SlotType;
  readonly baseStats: Partial<Stats>;
  readonly socketCount: number;
  readonly maxLevel: number;
  readonly tags: readonly string[];
  readonly atlanteanOnly?: boolean | undefined;
  readonly variants?: Readonly<Record<string, Partial<Stats>>> | undefined;  // NEW
}
```

Zod schema addition:

```typescript
// src/data/schemas.ts
variants: z.record(z.string(), partialStatsSchema).optional()
```

### Variant Types Config

New file `src/data/variant-types.json`:

```json
{
  "magic": {
    "label": "Magic",
    "variants": [
      "acid", "ash", "crystal", "earth", "explosion",
      "fire", "glass", "ice", "light", "lightning",
      "magma", "metal", "plasma", "poison", "sand",
      "shadow", "snow", "water", "wind", "wood"
    ]
  }
}
```

### Equipment Data Example

Glass Arcsphere with variants (level 140 values, to be updated later):

```json
{
  "id": "glass-arcsphere",
  "name": "Glass Arcsphere",
  "slot": "accessory",
  "baseStats": { "power": 33, "defense": -39 },
  "socketCount": 2,
  "maxLevel": 170,
  "tags": ["treasure"],
  "atlanteanOnly": false,
  "variants": {
    "acid": { "power": 9, "pierce": 42 },
    "ash": { "power": 12, "size": 31 },
    "crystal": { "power": 9, "defense": 77, "haste": 20 },
    "earth": { "power": 9, "defense": 115, "size": 10 },
    "explosion": { "power": 9, "size": 42 },
    "fire": { "power": 23 },
    "glass": { "power": 26, "defense": -38 },
    "ice": { "power": 9, "defense": 38, "resistance": 31 },
    "light": { "power": 9, "size": -10, "dexterity": 51 },
    "lightning": { "power": 9, "range": 10, "dexterity": 31 },
    "magma": { "power": 16, "size": 20 },
    "metal": { "power": 9, "defense": 154, "range": -10, "resistance": 10 },
    "plasma": { "power": 19, "haste": 10 },
    "poison": { "power": 19, "pierce": 10 },
    "sand": { "power": 9, "haste": 42 },
    "shadow": { "power": 16, "dexterity": 20 },
    "snow": { "power": 9, "size": 31, "dexterity": 10 },
    "water": { "power": 9, "size": 31, "haste": 10 },
    "wind": { "power": 9, "range": 10, "size": 10, "dexterity": 20 },
    "wood": { "power": 12, "defense": 115 }
  }
}
```

## State Management

Extend `FitnessStore` to track enabled variants:

```typescript
// src/stores/fitness-store.ts
export interface FitnessState {
  constraints: readonly SoftConstraint[];
  activePresetName: string | null;
  enabledVariants: ReadonlySet<string>;  // NEW
}

export interface FitnessActions {
  // ... existing actions ...
  toggleVariant: (variant: string) => void;
  setEnabledVariants: (variants: ReadonlySet<string>) => void;
  enableAllVariantsOfType: (type: string) => void;
  disableAllVariantsOfType: (type: string) => void;
}
```

Default: empty set (no variants enabled).

## Search Algorithm

### Item Expansion

Items with variants expand into multiple candidates before search:

```typescript
// src/search/expand-variants.ts
interface ExpandedEquipment extends EquipmentPiece {
  readonly appliedVariant?: string | undefined;
  readonly effectiveStats: Partial<Stats>;  // base + variant (pre-computed)
}

function expandEquipment(
  items: readonly EquipmentPiece[],
  enabledVariants: ReadonlySet<string>
): readonly ExpandedEquipment[]
```

Expansion rules:
- No matching variants enabled → 1 candidate (base stats only)
- N matching variants enabled → N+1 candidates (base-only + each matching variant)

The search algorithm receives expanded items and treats each as a distinct candidate. No algorithm changes needed.

### Stats Computation

For each candidate: `effectiveStats = baseStats + variantStats` (additive, computed once at expansion time).

## UI Changes

### Goals Panel — Variant Selection

New collapsible section with checkbox groups by variant type:

```
┌─ Magic ──────────────────────────────────────┐
│ ☐ Acid    ☐ Ash      ☐ Crystal   ☐ Earth    │
│ ☐ Explosion ☐ Fire   ☐ Glass     ☐ Ice      │
│ ☐ Light   ☐ Lightning ☐ Magma    ☐ Metal    │
│ ☐ Plasma  ☐ Poison   ☐ Sand      ☐ Shadow   │
│ ☐ Snow    ☐ Water    ☐ Wind      ☐ Wood     │
│                        [Select All] [Clear] │
└──────────────────────────────────────────────┘
```

- "Select All" / "Clear" buttons per type
- Checkboxes toggle `enabledVariants` in FitnessStore
- Helper text when empty: "Enable variants to include magic-specific bonuses"

### Results Display

Show applied variant in parentheses:

```
Slot 3: Glass Arcsphere (Fire)
  +56 power, -39 defense
  Enchant: Hard, Modifier: None
```

### Gear Pool Panel

No changes — items with variants always available. Variant selection happens in goals only.

## Files to Create

- `src/data/variant-types.json` — variant type groupings config
- `src/data/variant-types.schema.ts` — Zod schema + loader
- `src/search/expand-variants.ts` — equipment expansion logic

## Files to Modify

- `src/data/schemas.ts` — add optional `variants` field
- `src/models/types.ts` — add `variants` to `EquipmentPiece`, create `ExpandedEquipment`
- `src/data/equipment.json` — add variants to Glass Arcsphere
- `src/data/loaders.ts` — export variant types loader
- `src/data/index.ts` — re-export new types
- `src/stores/fitness-store.ts` — add `enabledVariants` state + actions
- Search integration (use expanded equipment)
- UI components for variant selection and result display

## Out of Scope

- Fighting styles (future extension)
- Per-item variant selection in gear pool
- Level-scaling variant stats (using level 140 values for now)
