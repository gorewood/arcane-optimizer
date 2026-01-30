# Arcane Odyssey Armor Optimizer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A gear loadout optimization tool for [Arcane Odyssey](https://arcane-odyssey.fandom.com/wiki/Arcane_Odyssey_Wiki). Find the best armor, accessories, enchantments, and gems to maximize your build's stats.

**🎮 [Try It Now](https://gorewood.github.io/arcane-optimizer/)** — runs entirely in your browser, no account required.

**Repository:** [github.com/gorewood/arcane-optimizer](https://github.com/gorewood/arcane-optimizer)

## Features

- **Multi-objective optimization** — Balance power, defense, and secondary stats with weighted priorities
- **Flexible constraints** — Set minimum, maximum, exact, or range requirements for any stat
- **Full gear coverage** — Armor, accessories, enchantments, modifiers, and gems
- **Variant support** — Atlantean, seasonal, and other equipment variants
- **Custom data** — Add your own equipment, enchantments, and modifiers
- **Profile system** — Save and load optimization presets
- **Genetic algorithm** — Experimental GA search for large gear pools (WIP)
- **Pure client-side** — No server, no account required, runs entirely in your browser

## Quick Start Tutorial

### Step 1: Choose a Profile or Start Fresh

When you open the app, you'll see the **Optimizer** tab. You can either:
- Select a preset profile (e.g., "Maximum Defense Build") from the dropdown
- Start with a blank slate and configure your own constraints

### Step 2: Configure Your Constraints

Add constraints to define what you want from your build:

1. Click **Add Constraint** to add a new stat requirement
2. Select the stat you want to constrain (e.g., defense, power, insanity)
3. Choose a constraint type (see [Constraint Types](#constraint-types) below)
4. Set the target value and weight

**Example: Tank Build**
- Defense: maximize, weight 10
- Insanity: at most 100, weight 5
- Drawback: minimize, weight 3

### Step 3: Configure Your Gear Pool

Switch to the **Gear Pool** tab to enable/disable specific items:

- Use the category toggles to enable entire sets (e.g., all Sunken gear)
- Use "Enable by Tag" to quickly toggle boss-drop, dark-sea, or treasure items
- Disable items you don't have access to

### Step 4: Run the Search

1. Return to the **Optimizer** tab
2. Click **Search** to start optimization
3. Results appear sorted by fitness score (higher is better)
4. Click any result to see the full loadout breakdown

### Step 5: Save Your Build

- Click **Save Profile** to save your current constraint configuration
- Saved profiles appear in the profile dropdown for quick access

## Constraint Types

| Type | Symbol | Description | Example |
|------|--------|-------------|---------|
| **Maximize** | max | Higher values score better | "maximize power" |
| **Minimize** | min | Lower values score better | "minimize drawback" |
| **At Least** | ≥ | Must meet minimum threshold | "at least 200 defense" |
| **At Most** | ≤ | Must not exceed maximum | "at most 50 insanity" |
| **Exactly** | = | Must hit exact value | "exactly 0 warding" |
| **Between** | ↔ | Must fall within range | "between 100-200 power" |

### Constraint Weights

Each constraint has a weight (1-10) that determines its priority:

- **Weight 10**: Critical — this stat matters most
- **Weight 5**: Important — balance with other stats
- **Weight 1**: Nice to have — only matters if other constraints are satisfied

The optimizer multiplies each constraint's score by its weight, so a weight-10 constraint has 10x the influence of a weight-1 constraint.

### Hard vs Soft Constraints

**Soft constraints** (configurable):
- Maximize/minimize goals with weights
- Threshold constraints (at least, at most, exactly, between)
- Violated constraints reduce fitness score but don't disqualify loadouts

**Hard constraints** (enforced automatically):
- Maximum 1 helmet accessory per loadout
- Maximum 1 amulet accessory per loadout
- No duplicate equipment pieces
- Atlantean modifier restrictions

### Scoring Modes

The optimizer supports three scoring modes that determine how stat values translate to fitness:

| Mode | Description | Best For |
|------|-------------|----------|
| **Linear** | Direct stat values × weights | Simple optimization, balanced builds |
| **Efficiency** | Normalized scoring with diminishing returns | Builds with stat caps or thresholds |
| **Multiplier** | In-game damage/defense formula | Accurate combat effectiveness |

Each mode can be configured with stat-specific limits, minimums, and efficiency curves to match your playstyle.

## Stats Reference

All stat names follow Arcane Odyssey Full Release v1.20:

| Category | Stats |
|----------|-------|
| **Primary** | Power, Defense |
| **Secondary** | Size, Dexterity, Range, Haste |
| **Special** | Insanity, Warding, Drawback, Regeneration, Pierce, Resistance |

### Stat Effects

| Stat | Effect |
|------|--------|
| Power | Increases damage dealt |
| Defense | Reduces damage taken |
| Size | Increases hitbox/AoE of attacks |
| Dexterity | Affects aim/accuracy mechanics |
| Range | Extends attack reach |
| Haste | Reduces cooldowns |
| Insanity | Negative stat — causes debuffs at high values |
| Warding | Reduces insanity buildup |
| Drawback | Negative stat — reduces max HP |
| Regeneration | Increases HP recovery |
| Pierce | Penetrates enemy defense |
| Resistance | Reduces pierce damage |

## Search Strategies

### Exhaustive Search (Default)

The default search enumerates all valid equipment combinations for your enabled gear pool. It automatically filters items that don't contribute to your goal stats, reducing the search space. Best for:
- Small to medium gear pools
- Finding guaranteed optimal solutions
- Quick searches with limited item selection

### Genetic Algorithm (Experimental)

For large gear pools, an experimental genetic algorithm search is available. It uses evolutionary techniques to explore the solution space more efficiently.

**Status: Work in Progress**

The GA search is functional but still being tuned for:
- Better convergence on optimal solutions
- Improved population diversity
- More consistent results across runs

GA parameters (population size, generations, mutation rate) can be configured in advanced settings.

## Custom Game Data

The **Data** tab lets you extend the built-in game data:

### Adding Custom Equipment

1. Go to Data → Equipment
2. Click **Add New**
3. Fill in name, slot type, base stats, socket count, and max level
4. Click **Save**

### Adding Custom Enchantments/Modifiers/Gems

Similar workflow — each category has its own editor with appropriate fields.

### Import/Export

- **Export**: Download your custom data as JSON for backup or sharing
- **Import**: Load previously exported data
- **Reset**: Clear all custom data and revert to bundled defaults

### Version Conflicts

When the bundled game data is updated, you'll see a version conflict dialog offering to:
- Keep your customizations (may miss new items)
- Reset to defaults (loses custom data)
- Merge (adds new items while keeping your changes)

## Development

### Prerequisites

- Node.js 20+ (managed via [mise](https://mise.jdx.dev/))
- [just](https://github.com/casey/just) command runner

### Setup

```bash
just setup    # Install mise tools and npm dependencies
```

### Commands

```bash
just dev      # Start development server (localhost:5173)
just build    # Production build
just check    # Run all quality gates (typecheck + lint + test)
just test     # Run tests only
just lint     # Lint with auto-fix
```

### Project Structure

```
src/
├── data/       # Game data JSON files and Zod schemas
├── models/     # TypeScript domain types
├── search/     # Optimization algorithms (exhaustive, genetic)
├── stores/     # Zustand state management
├── ui/         # React components
└── workers/    # Web Workers for background computation
```

### Tech Stack

- **React 19** + **TypeScript** (strict mode)
- **Vite** for builds
- **Tailwind CSS v4** for styling
- **Zustand** for state management
- **Zod** for runtime validation
- **Vitest** for testing

## License

[MIT](LICENSE)
