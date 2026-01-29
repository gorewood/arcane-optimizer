# Gear Inventory Unification Plan

## Executive Summary

The Gear Pool and Data Management tabs serve different purposes but share significant structural overlap. This plan proposes a unified **"Gear Inventory"** view that combines browsing, filtering, and editing capabilities while maintaining clear modal separation between "what's available for optimization" and "what items exist."

---

## Current State Analysis

### Gear Pool Tab
**Purpose**: Configure which items are available to the optimizer
**Data Source**: Static loaders (bundled JSON only)
**Features**:
- ✅ Filter by name/set
- ✅ Sort by name, defense, power, set
- ✅ Group by set (only when sorted by set)
- ✅ Enable/disable individual items
- ✅ Bulk enable/disable all
- ❌ No grouping by slot, source, or tags
- ❌ No merged view (doesn't show user-added items)
- ❌ No item details view

### Data Management Tab
**Purpose**: CRUD operations for game data
**Data Source**: Merged view (bundled + user data)
**Features**:
- ✅ Filter by name/set
- ✅ Sort by name, defense, power, set
- ✅ Add/edit/delete items
- ✅ Import/export JSON
- ✅ Source badges (bundled vs user)
- ✅ Restore deleted items
- ❌ No grouping at all (flat list only)
- ❌ No enable/disable for optimizer
- ❌ Same limited sort options

### Critical Gap: Gear Pool Ignores User Data!

```typescript
// gear-pool-panel.tsx lines 26-29 - PROBLEM!
const equipment = loadEquipment();  // Only bundled data
```

User-added equipment is **not visible** in the Gear Pool tab. This is a significant bug.

---

## Proposed Architecture

### Option A: Unified Single Tab (Recommended)

Replace both tabs with a single **"Gear Inventory"** that handles all concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│  GEAR INVENTORY                                                  │
├─────────────────────────────────────────────────────────────────┤
│  [Search...] [Sort ▼] [Group By ▼] [Filter ▼]  [+ Add] [⚙ More]│
├─────────────────────────────────────────────────────────────────┤
│  [Equipment] [Enchantments] [Modifiers] [Gems] [Variants]       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ▼ Sunken Iron (3 pieces)                          [Set ☑]     │
│    ☑ Sunken Iron Helmet    [H] 2◆  DEF:247 SIZ:28   [···]      │
│    ☑ Sunken Iron Armor     [C] 2◆  DEF:330 SIZ:38   [···]      │
│    ☐ Sunken Iron Greaves   [L] 2◆  DEF:247 SIZ:28   [···]      │
│                                                                  │
│  ▼ Vatrachos (4 pieces)                            [Set ☑]     │
│    ...                                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key UX principles**:
1. **Checkbox = optimizer inclusion** (primary interaction)
2. **[···] menu = edit/delete/details** (secondary)
3. **Grouping is a view option**, not tied to sort
4. **Source badges visible** (bundled/user/modified)

### Option B: Keep Separate Tabs, Share Infrastructure

If merging feels too ambitious:
1. Create shared `<ItemGrid>` component with all grouping/sorting
2. Gear Pool uses it with checkbox mode
3. Data Management uses it with edit mode
4. Both draw from merged data source

---

## Grouping Options

Current grouping is limited. Proposed expansion:

| Group By | Description | Use Case |
|----------|-------------|----------|
| **Set** | Group by `setName` | Finding full sets |
| **Slot** | Group by `slot` | Filling specific slots |
| **Source** | Group by `source` field | Finding boss drops |
| **Tags** | Group by first tag | Finding sunken/dark-sea/etc |
| **None** | Flat list | Quick scanning |

Implementation:

```typescript
type GroupBy = "none" | "set" | "slot" | "source" | "tags";

function groupItems<T>(items: T[], groupBy: GroupBy): Map<string, T[]> {
  // Generalized grouping function
}
```

---

## Sort Options

Current options are limited. Proposed expansion:

| Sort | Description |
|------|-------------|
| Name (A-Z) | Alphabetical |
| Name (Z-A) | Reverse alphabetical |
| Defense (High) | By defense stat descending |
| Power (High) | By power stat descending |
| Dexterity (High) | By dexterity stat descending |
| Sockets (High) | By socket count |
| Set → Name | Primary by set, secondary by name |
| Source → Name | Primary by source, secondary by name |
| Recently Added | User items first, by timestamp |

---

## Filter Options

Current: text search only. Proposed expansion:

### Quick Filters (Toggle Chips)
```
[Boss Drops] [Dark Sea] [Sunken] [Craftable] [User Added]
```

### Advanced Filters (Collapsible Panel)
- **Slot**: Chestplate / Leggings / Accessory / Helmet / Amulet
- **Source**: Specific boss/location
- **Stats**: Has power > 0, Has negative defense, etc.
- **Enabled**: Show only enabled / disabled

---

## Component Architecture

### Shared Components (New)

```
src/ui/components/inventory/
├── inventory-grid.tsx        # Main grid with grouping
├── inventory-toolbar.tsx     # Search, sort, group, filter controls
├── inventory-group.tsx       # Collapsible group with header
├── inventory-row.tsx         # Single item row (abstract)
├── group-by-select.tsx       # Group by dropdown
├── filter-chips.tsx          # Quick filter toggles
└── advanced-filters.tsx      # Collapsible filter panel
```

### Equipment-Specific Components

```
src/ui/components/inventory/equipment/
├── equipment-row.tsx         # Equipment item display
├── equipment-row-compact.tsx # Dense view option
├── equipment-detail.tsx      # Expanded detail view
└── equipment-actions.tsx     # Context menu actions
```

### Unified Panel

```
src/ui/panels/
├── gear-inventory-panel.tsx  # Unified inventory panel
└── gear-pool-panel.tsx       # [DEPRECATED - redirect]
└── data-management-panel.tsx # [DEPRECATED - redirect]
```

---

## Data Flow

### Current (Broken)

```
Gear Pool:     loadEquipment() ──────────────────────► bundled only
Data Mgmt:     getMergedEquipment() ─────────────────► bundled + user
```

### Proposed (Unified)

```
                              ┌──────────────────────┐
                              │   user-data-store    │
                              │  (user overrides)    │
                              └──────────┬───────────┘
                                         │
┌──────────────┐                         ▼
│ loaders.ts   │──────────► mergeEquipment() ─────► MergedItem[]
│ (bundled)    │                         │
└──────────────┘                         ▼
                              ┌──────────────────────┐
                              │   gear-pool-store    │
                              │  (enabled IDs)       │
                              └──────────────────────┘
```

Both views read from `getMergedEquipment()` and reference `gear-pool-store` for enabled state.

---

## Implementation Phases

### Phase 1: Fix Critical Bug
**Goal**: Gear Pool shows merged data
**Files**: `gear-pool-panel.tsx`, `equipment-section.tsx`
**Effort**: Small

```typescript
// Replace static loaders with merged data
const getMergedEquipment = useUserDataStore((s) => s.getMergedEquipment);
const equipment = useMemo(() =>
  getMergedEquipment().map(m => m.item),
  [getMergedEquipment]
);
```

### Phase 2: Enhanced Grouping
**Goal**: Multiple grouping options for equipment
**Files**: New `group-by-select.tsx`, update `equipment-section.tsx`
**Effort**: Medium

- Add `GroupBy` type and selector
- Implement `groupItems()` utility
- Decouple grouping from sorting

### Phase 3: Enhanced Sorting & Filtering
**Goal**: More sort options, quick filters
**Files**: Update `sort-select.tsx`, new `filter-chips.tsx`
**Effort**: Medium

- Add dexterity, sockets, source sorting
- Add tag-based quick filter chips
- Add slot filter chips

### Phase 4: Unified Inventory Panel
**Goal**: Single panel for browse + edit
**Files**: New `gear-inventory-panel.tsx`, refactor shared components
**Effort**: Large

- Create unified toolbar component
- Add inline edit capability
- Add context menu for item actions
- Deprecate old panels (keep as redirects)

### Phase 5: Polish & Features
**Goal**: Advanced features
**Effort**: Medium

- Keyboard navigation
- Multi-select for bulk operations
- Compact/detailed view toggle
- Column configuration
- Saved filter presets

---

## Migration Path

1. **Phase 1**: Ship immediately (bugfix)
2. **Phase 2-3**: Ship together as "Enhanced Browsing"
3. **Phase 4**: Ship as "Unified Inventory" with deprecation notice
4. **Phase 5**: Ship incrementally based on feedback

Old tab names can redirect to new panel with a toast: "Gear Pool and Data Management are now unified in Gear Inventory."

---

## Open Questions

1. **Detail Panel vs Modal**: Should item details open in a side panel or modal?
2. **Bulk Edit**: Allow editing multiple items at once?
3. **Drag & Drop**: Should items be reorderable?
4. **Virtualization**: At 125+ items, do we need virtual scrolling?
5. **Mobile**: How does this work on small screens?

---

## Recommendation

**Start with Phase 1 immediately** — the bug where user items don't appear in Gear Pool is significant.

Then proceed with Phases 2-3 to enhance the browsing experience before tackling the full unification in Phase 4.

The unified approach (Option A) is cleaner long-term but requires careful UX design to avoid confusion between "browsing" and "editing" modes.
