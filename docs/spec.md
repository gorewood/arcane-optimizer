# Arcane Odyssey Gear Optimization Engine
## Technical Specification v1.0

**Document Date:** January 27, 2026
**Target:** Static TypeScript Web Application
**Build System:** Vite + TypeScript

---

## 1. Executive Summary

This specification defines a hyperparameter optimization engine for Arcane Odyssey gear loadouts. The system will search possible combinations of armor, enchantments, modifiers, and gems to optimize a configurable fitness function while respecting game constraints.

### Design Principles
- **Modularity:** Simple parts, clean interfaces
- **Extensibility:** Data-driven architecture allowing easy addition of new gear/stats
- **Pluggable Search:** Exhaustive search with swappable GA backend
- **Static Deployment:** Pure client-side, no backend required

---

## 2. Domain Model

### 2.1 Equipment Slots

A loadout consists of exactly **5 equipment slots**:

| Slot | Type | Constraint |
|------|------|------------|
| Chestplate | `chestplate` | Exactly 1 |
| Leggings | `leggings` | Exactly 1 |
| Accessory 1 | `accessory` | Any accessory type |
| Accessory 2 | `accessory` | Any accessory type |
| Accessory 3 | `accessory` | Any accessory type |

**Accessory Sub-Types with Conflicts:**
- `accessory-H` (Helmet): Max 1 per loadout
- `accessory-A` (Amulet): Max 1 per loadout
- `accessory` (Generic): No limit

### 2.2 Stats

Stats are additive integers computed from base gear + enchantments + modifiers + gems.

```typescript
interface Stats {
  // Primary
  power: number;           // Increases damage
  defense: number;         // Increases max HP (1:1)

  // Secondary (diminishing returns formula applies in-game)
  size: number;            // AoE of attacks
  dexterity: number;       // Attack speed / startup reduction
  range: number;           // Movement/range
  haste: number;           // Cooldown reduction

  // Special
  insanity: number;        // Negative: causes hallucinations
  warding: number;         // Counters insanity (net = insanity - warding)
  drawback: number;        // Negative: self-damage on attack
  regeneration: number;    // Lifesteal
  pierce: number;          // Armor penetration
  resistance: number;      // Damage reduction
}
```

### 2.3 Equipment Piece

```typescript
interface EquipmentPiece {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  setName?: string;              // Optional set membership
  slot: 'chestplate' | 'leggings' | 'accessory' | 'accessory-H' | 'accessory-A';
  baseStats: Partial<Stats>;     // Base stats at max level
  socketCount: number;           // 0-3 (usually 2, Theugrist has 3)
  maxLevel: number;              // Usually 170 for endgame
  tags: string[];                // For filtering: ['sunken', 'dark-sea', 'boss-drop', etc.]
}
```

### 2.4 Enchantments

Enchantments add flat stats. Only ONE enchantment per equipment piece.

```typescript
interface Enchantment {
  id: string;
  name: string;
  tier: 1 | 2;                   // Tier 2 = "mystic" (Dark Sea)
  applicableTo: ('armor' | 'accessory')[];
  stats: Partial<Stats>;
  incompatibleWith?: string[];   // e.g., Virtuous incompatible with Atlantean
}
```

**Key Enchantments (Tier 2 - Equipment):**
| Name | Stats |
|------|-------|
| Powerful | +14 Power |
| Armored | +136 Defense |
| Explosive | +44 Size |
| Brisk | +44 Dexterity |
| Virtuous | +71 Defense, +1 Warding (removes Atlantean) |
| Charged | +9 Power, +23 Haste |
| Hasty | +23 Dexterity, +23 Range |

### 2.5 Modifiers

Modifiers are pre-existing on items (not player-applied except Atlantean). Only ONE modifier per piece.

```typescript
interface Modifier {
  id: string;
  name: string;
  stats: Partial<Stats>;
  grantsSocket?: boolean;        // Gilded adds 1 socket
  atlanteanBehavior?: AtlanteanConfig;  // Special handling
}

interface AtlanteanConfig {
  insanity: number;              // Always +1
  possibleBonusStats: readonly (keyof Stats)[];  // Picks stat NOT on base item OR its socketed gems
}
```

**Modifiers:**
| Name | Stats | Notes |
|------|-------|-------|
| Gilded | +1 socket | Exclusive with other modifiers |
| Archaic | +24 Size | |
| Blasted | +8 Power | |
| Crystalline | +24 Dexterity | |
| Drowned | +39 Defense, +14 Size | |
| Frozen | +76 Defense | |
| Sandy | +38 Size | |
| Superheated | +15 Power, +24 Size | |
| Abyssal | +2 Insanity, +high stat bonus | Stronger atlantean variant |
| Imbued | +varies | Elemental modifier |
| Atlantean | +1 Insanity + one of: 13 Power / 116 Defense / 38 Size / 38 Dexterity / 38 Range / 38 Haste | Picks stat NOT on base item OR its socketed gems |

### 2.6 Gems/Jewels

Gems socket into equipment. Each socket holds one gem.

```typescript
interface Gem {
  id: string;
  name: string;
  tier: 1 | 2;                   // Tier 2 = mystic
  stats: Partial<Stats>;
}
```

**Gems (Max Level Jewelcrafting):**
| Name | Stats |
|------|-------|
| Agate | +48 Defense, +8 Size |
| Malachite | +4 Power, +8 Size |
| Candelaria | +4 Power, +8 Dexterity |
| Painite | +224 Defense, +1 Drawback |
| Emerald | +16 Size |
| Sapphire | +16 Dexterity |
| Lapis Lazuli | +8 Power |
| Larimar | +12 Dexterity, +12 Haste |

---

## 3. Constraints System

### 3.1 Hard Constraints (Must Satisfy)

These eliminate invalid loadouts from search space:

```typescript
interface HardConstraints {
  // Slot rules
  maxHelmetAccessories: 1;
  maxAmuletAccessories: 1;
  totalAccessories: 3;

  // Item rules
  noDuplicateItems: boolean;       // No duplicate items in loadout (game-enforced)

  // Modifier rules
  atlanteanIncompatibleWith: ['Virtuous'];  // Enchantment blocks modifier

  // Stat caps (net insanity after warding)
  maxNetInsanity: number;        // Default: 1
  maxDrawback: number;           // Default: 2 (< 3 means ≤ 2)
}
```

No duplicate items of any kind in loadouts — the game enforces unique item selection.

### 3.2 Soft Constraints (Fitness Penalties/Bonuses)

```typescript
type ConstraintType =
  | 'minimize'      // Lower is better (no cap)
  | 'maximize'      // Higher is better (no cap)
  | 'atLeast'       // Penalty if below threshold, then maximize
  | 'atMost'        // Penalty if above threshold, then minimize
  | 'target'        // Penalty for deviation from target
  | 'exactly';      // Hard match only

interface SoftConstraint {
  stat: keyof Stats;
  type: ConstraintType;
  value?: number;           // Threshold/target value
  weight: number;           // Importance multiplier (1-100)
  hardCap?: number;         // Optional hard ceiling/floor
}
```

---

## 4. Fitness Function

### 4.1 Default Configuration (Mage Build)

Based on the spreadsheet priorities:

```typescript
const defaultFitness: SoftConstraint[] = [
  { stat: 'defense', type: 'atLeast', value: 700, weight: 100 },
  { stat: 'power', type: 'atLeast', value: 100, weight: 90 },
  { stat: 'dexterity', type: 'target', value: 300, hardCap: 330, weight: 80 },
  { stat: 'size', type: 'target', value: 300, hardCap: 330, weight: 70 },
  { stat: 'insanity', type: 'exactly', value: 1, weight: 100 },
  { stat: 'drawback', type: 'atMost', value: 2, weight: 100 },
];
```

### 4.2 Scoring Algorithm

```typescript
function computeFitness(loadout: Loadout, constraints: SoftConstraint[]): number {
  const stats = computeTotalStats(loadout);
  let score = 0;

  for (const c of constraints) {
    const val = stats[c.stat];

    switch (c.type) {
      case 'minimize':
        score -= val * c.weight;
        break;

      case 'maximize':
        score += val * c.weight;
        break;

      case 'atLeast':
        if (val < c.value!) {
          score -= (c.value! - val) * c.weight * 10; // Heavy penalty
        } else {
          score += (val - c.value!) * c.weight * 0.1; // Diminishing bonus
        }
        break;

      case 'atMost':
        if (val > c.value!) {
          score -= (val - c.value!) * c.weight * 10;
        }
        if (c.hardCap && val > c.hardCap) {
          return -Infinity; // Disqualify
        }
        break;

      case 'target':
        const deviation = Math.abs(val - c.value!);
        score -= deviation * c.weight;
        if (c.hardCap && val > c.hardCap) {
          return -Infinity;
        }
        break;

      case 'exactly':
        if (val !== c.value!) {
          return -Infinity; // Disqualify
        }
        break;
    }
  }

  return score;
}
```

---

## 5. Search Algorithms

### 5.1 Interface

```typescript
interface SearchStrategy {
  name: string;
  search(
    gearPool: GearPool,
    constraints: HardConstraints,
    fitness: SoftConstraint[],
    options: SearchOptions
  ): Promise<SearchResult[]>;

  // For GA: progress callbacks
  onProgress?: (generation: number, best: number) => void;
}

interface SearchResult {
  loadout: Loadout;
  score: number;
  stats: Stats;
}

interface SearchOptions {
  maxResults: number;           // Top N to return
  timeout?: number;             // Max milliseconds
  // GA-specific
  populationSize?: number;
  generations?: number;
  mutationRate?: number;
  crossoverRate?: number;
}
```

### 5.2 Exhaustive Search (Primary)

Iterates all valid combinations with aggressive pruning:

```typescript
class ExhaustiveSearch implements SearchStrategy {
  name = 'exhaustive';

  async search(pool, constraints, fitness, options): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    // Pre-filter gear by hard constraints
    const validChests = pool.chestplates.filter(c => this.passesHardConstraints(c));
    const validLeggings = pool.leggings.filter(b => this.passesHardConstraints(b));
    const validAccessories = pool.accessories.filter(a => this.passesHardConstraints(a));

    // Group accessories by subtype for conflict checking
    const helmets = validAccessories.filter(a => a.slot === 'accessory-H');
    const amulets = validAccessories.filter(a => a.slot === 'accessory-A');
    const generic = validAccessories.filter(a => a.slot === 'accessory');

    // Generate valid accessory combinations (respecting 1 helmet, 1 amulet max)
    const accessoryCombos = this.generateAccessoryCombinations(helmets, amulets, generic);

    for (const chest of validChests) {
      for (const leggings of validLeggings) {
        for (const [acc1, acc2, acc3] of accessoryCombos) {
          // For each base loadout, enumerate enchant/modifier/gem combinations
          yield* this.enumerateEnhancements(
            [chest, leggings, acc1, acc2, acc3],
            pool,
            constraints,
            fitness
          );
        }
      }
    }

    // Sort and return top N
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, options.maxResults);
  }

  private *generateAccessoryCombinations(
    helmets: Equipment[],
    amulets: Equipment[],
    generic: Equipment[]
  ): Generator<[Equipment, Equipment, Equipment]> {
    const all = [...helmets, ...amulets, ...generic];

    for (let i = 0; i < all.length; i++) {
      for (let j = i; j < all.length; j++) {
        for (let k = j; k < all.length; k++) {
          const combo = [all[i], all[j], all[k]];

          // Check conflicts
          const helmetCount = combo.filter(a => a.slot === 'accessory-H').length;
          const amuletCount = combo.filter(a => a.slot === 'accessory-A').length;

          if (helmetCount <= 1 && amuletCount <= 1) {
            yield combo as [Equipment, Equipment, Equipment];
          }
        }
      }
    }
  }
}
```

### 5.3 Genetic Algorithm (Pluggable)

For larger gear pools:

```typescript
class GeneticSearch implements SearchStrategy {
  name = 'genetic';

  // Chromosome: [chestIdx, leggingsIdx, acc1Idx, acc2Idx, acc3Idx,
  //              enchant1..5, modifier1..5, gems1..15 (5 pieces × 3 sockets)]

  async search(pool, constraints, fitness, options): Promise<SearchResult[]> {
    const pop = this.initializePopulation(pool, options.populationSize!);

    for (let gen = 0; gen < options.generations!; gen++) {
      // Evaluate fitness
      const scored = pop.map(chromosome => ({
        chromosome,
        score: this.evaluateChromosome(chromosome, pool, constraints, fitness)
      }));

      // Selection (tournament)
      const parents = this.tournamentSelection(scored);

      // Crossover
      const offspring = this.crossover(parents, options.crossoverRate!);

      // Mutation
      this.mutate(offspring, pool, options.mutationRate!);

      // Repair invalid individuals
      offspring.forEach(c => this.repair(c, pool, constraints));

      // Replace population
      pop = [...this.elitism(scored, 2), ...offspring];

      this.onProgress?.(gen, scored[0].score);
    }

    // Return top results
    return pop
      .map(c => this.chromosomeToResult(c, pool))
      .sort((a, b) => b.score - a.score)
      .slice(0, options.maxResults);
  }

  private repair(chromosome: number[], pool: GearPool, constraints: HardConstraints) {
    // Fix accessory conflicts
    // Fix Atlantean + Virtuous conflicts
    // Ensure valid gem assignments per socket count
  }
}
```

---

## 6. Data Architecture

### 6.1 File Structure

```
src/
├── data/
│   ├── equipment.json     // Equipment data (externalized)
│   ├── enchantments.json  // Enchantment data
│   ├── modifiers.json     // Modifier data
│   ├── gems.json          // Gem data
│   ├── schemas.ts         // Zod validation schemas
│   └── index.ts           // Data loaders with Zod validation
├── models/
│   ├── types.ts           // TypeScript interfaces
│   ├── stats.ts           // Stats computation
│   └── loadout.ts         // Loadout validation
├── search/
│   ├── interface.ts       // SearchStrategy interface
│   ├── exhaustive.ts      // Exhaustive search impl
│   ├── genetic.ts         // GA impl
│   └── fitness.ts         // Fitness computation
├── ui/
│   ├── App.tsx            // Main component
│   ├── GearSelector.tsx   // Filter/select gear
│   ├── FitnessEditor.tsx  // Configure constraints
│   ├── ResultsView.tsx    // Display top builds
│   └── LoadoutCard.tsx    // Single build display
└── main.tsx
```

### 6.2 Data Format Example

Game data is externalized as JSON files and validated at load time using Zod schemas. This separates data authoring (JSON) from type safety (Zod + TypeScript).

```json
// data/equipment.json
[
  {
    "id": "sunken-iron-helmet",
    "name": "Sunken Iron Helmet",
    "setName": "Sunken Iron",
    "slot": "accessory-H",
    "baseStats": { "defense": 247, "size": 28 },
    "socketCount": 2,
    "maxLevel": 170,
    "tags": ["sunken", "fishing", "underwater"]
  },
  {
    "id": "sunken-iron-armor",
    "name": "Sunken Iron Armor",
    "setName": "Sunken Iron",
    "slot": "chestplate",
    "baseStats": { "defense": 330, "size": 38 },
    "socketCount": 2,
    "maxLevel": 170,
    "tags": ["sunken", "fishing", "underwater"]
  }
]
```

```typescript
// data/schemas.ts — Zod schemas for runtime validation
import { z } from 'zod';

const StatsSchema = z.object({
  power: z.number().optional(),
  defense: z.number().optional(),
  size: z.number().optional(),
  // ... all stat fields
}).strict();

const EquipmentPieceSchema = z.object({
  id: z.string(),
  name: z.string(),
  setName: z.string().optional(),
  slot: z.enum(['chestplate', 'leggings', 'accessory', 'accessory-H', 'accessory-A']),
  baseStats: StatsSchema,
  socketCount: z.number().int().min(0).max(3),
  maxLevel: z.number().int(),
  tags: z.array(z.string()),
});

// data/index.ts — Loader with validation
import equipmentJson from './equipment.json';
export const equipment = z.array(EquipmentPieceSchema).parse(equipmentJson);
```

---

## 7. User Interface

### 7.1 Main Screens

1. **Gear Pool Configuration**
   - Toggle individual pieces on/off
   - Filter by set, tags, slot type
   - Import/export gear pool as JSON

2. **Fitness Function Editor**
   - Add/remove stat constraints
   - Adjust weights via sliders
   - Preset configurations (Mage, Warrior, Tank, etc.)
   - Save/load custom presets

3. **Search Controls**
   - Algorithm selector (Exhaustive / GA)
   - Max results slider
   - Start/Stop buttons
   - Progress indicator

4. **Results Display**
   - Sortable table of top builds
   - Expandable cards showing full loadout
   - Copy build to clipboard
   - Export to CSV

### 7.2 Tech Stack

- **Framework:** React 18+ with TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS
- **State:** Zustand or React Context
- **Workers:** Web Workers for search (non-blocking UI)

---

## 8. External Data Sources

### 8.1 Authoritative Sources (for manual data updates)

| Source | URL | Content |
|--------|-----|---------|
| Fandom Wiki | `roblox-arcane-odyssey.fandom.com` | Equipment stats, enchantments, modifiers |
| Fandom Wiki Module | `roblox-arcane-odyssey.fandom.com/wiki/Module:Equipment/data` | Lua table with equipment data |
| Miraheze Wiki | `arcaneodyssey.miraheze.org` | Alternative wiki, sometimes more current |
| AO Guides (GitHub) | `github.com/myaltaccountsthis/arcane-odyssey-guides` | Active armor calculator with data |
| AO Tools | `tools.arcaneodyssey.net` | Gear builder (reference, not updated since 2024) |

### 8.2 Data Update Strategy

1. **Initial:** Manual transcription from spreadsheet + wiki verification
2. **Ongoing:** JSON data files are easily editable; document wiki sources in comments
3. **Future:** Consider scraping wiki Module:Equipment/data (Lua → JSON conversion)

---

## 9. Implementation Phases

### Phase 1: Core Engine (MVP)
- [ ] Data model types
- [ ] Stats computation
- [ ] Loadout validation
- [ ] Exhaustive search (small pool)
- [ ] Basic fitness function
- [ ] CLI test harness

### Phase 2: Web UI
- [ ] Vite + React + TypeScript setup
- [ ] Gear pool display
- [ ] Fitness editor
- [ ] Results table
- [ ] Web Worker integration

### Phase 3: Optimization
- [ ] GA implementation
- [ ] Search pruning optimizations
- [ ] Caching/memoization
- [ ] Performance profiling

### Phase 4: Polish
- [ ] Preset management
- [ ] Import/export
- [ ] Mobile responsive
- [ ] Build sharing (URL hash)

---

## 10. Testing Strategy

### 10.1 Unit Tests
- Stats computation accuracy
- Constraint validation
- Fitness scoring
- Atlantean modifier logic

### 10.2 Integration Tests
- Full search with known optimal result
- Constraint violation detection
- Edge cases (empty pools, all constraints fail)

### 10.3 Test Data
Maintain a `testdata/` folder with:
- Minimal valid gear pool
- Known-optimal loadouts for regression
- Edge case configurations

---

## 11. Appendix: Spreadsheet Data Mapping

### Equipment from Spreadsheet

| Set | Pieces | Key Stats |
|-----|--------|-----------|
| Sunken Iron | Helmet, Armor, Leggings | Defense + Size |
| Sunken Warrior | Helmet, Armor, Leggings | Defense + Dexterity |
| Vatrachos | Helmet, Cape, Armor, Leggings | Power + Defense + Drawback |
| Sopharagos | Hood, Robes, Pants | Power + Negative Defense |
| Ravenna Apostle | Gi, Leggings, Bracelets, Faulds, Pauldrons | Power + Dexterity |
| Omen | Cloak, Armor, Leggings | Negative Power + High Defense |
| Theugrist | Robes, Pants, Hat, Cloak | Dexterity + Warding + 3 sockets |
| Apex | Cloak, Armor, Leggings | Power + Defense |
| Kraken Band | Band (Accessory) | Power + Defense + Range |
| Lost Chief | Cape, Armor, Leggings | Power + Defense + Size |

### Standalone Accessories

| Item | Slot | Stats |
|------|------|-------|
| Dexterity Amulet | accessory-A | 127 Dexterity |
| Size Amulet | accessory-A | 127 Size |
| Power Amulet | accessory-A | 43 Power |
| Defense Amulet | accessory-A | 382 Defense |
| Glass Arcsphere | accessory | 30 Power, -45 Defense |

---

## 12. Glossary

| Term | Definition |
|------|------------|
| Loadout | Complete set of 5 equipped items with enchants, modifiers, and gems |
| Socket | Slot on equipment that can hold one gem |
| Atlantean | Special modifier from Dark Sea that adds insanity; picks stat NOT on base item OR its socketed gems |
| Warding | Stat that counters insanity effects |
| Net Insanity | `insanity - warding` (negative values treated as 0) |
| Drawback | Self-damage stat (1% max HP per attack) |
| Mystic | Tier 2 enchantments/gems from Dark Sea |
| Fitness | Score representing how well a loadout meets goals |

---

*End of Specification*
