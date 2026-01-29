# Phase 5: Polish Design

## Scope

1. **Rename Data → "Game Data"**, remove Equipment subtab
2. **Header-level Add button** — consistent placement in both tabs
3. **Enhanced gear row** — set/source as dimmed text, contextual hiding, responsive wrap, vertical center

## Tab & Add Button Changes

### Files to modify:
- `src/ui/layout/app-shell.tsx` — rename tab label "Data" → "Game Data"
- `src/ui/panels/data-management/data-management-panel.tsx` — remove Equipment tab, lift Add state to header
- `src/ui/panels/data-management/panel-header.tsx` — add context-aware "+ Add" button

### Header layout (Game Data):
```
[Game Data] [Storage: 1.2KB]          [+ Add] [Import] [Export] [Clear All]
```

The Add button opens the dialog for the currently active subtab (Enchantments, Modifiers, Gems, or Variants).

### Implementation:
- Panel tracks explicit `activeTab` state to pass to header
- Panel has `handleAdd` that switches on `activeTab` and opens the appropriate dialog
- Remove `*-editor-header.tsx` components (4 files) since Add moves to panel header

## Enhanced Gear Row

### Current row structure:
```
[checkbox] [name] [SourceBadge] [SlotBadge] [sockets] [StatSummary] [Edit] [Reset] [Hide/Del]
```

### New row structure:
```
[checkbox] [name-block]                    [SourceBadge] [SlotBadge] [sockets] [StatSummary] [actions]
           │
           └─ <div class="flex flex-col justify-center">
                <span>Sunken Iron Helmet</span>
                <span class="text-xs text-text-muted">Sunken Iron Set · Myriad</span>
              </div>
```

### Contextual hiding logic:
- `sortBy === "set-name"` → hide set name from metadata
- `sortBy === "source"` → hide source from metadata
- If both would be hidden or both are empty → no metadata line

### Responsive behavior:
- Metadata in flex column naturally wraps
- Row uses `items-center` for vertical centering

### Props change:
`InventoryEquipmentRow` receives `hideSet` and `hideSource` booleans.

### Files to modify:
- `src/ui/panels/gear-inventory/inventory-equipment-row.tsx` — add metadata display
- `src/ui/panels/gear-inventory/inventory-equipment-section.tsx` — pass sort info down
- `src/ui/panels/gear-inventory/gear-inventory-panel.tsx` — pass sortBy to section

## Implementation Order

1. Update app-shell.tsx — rename tab
2. Modify data-management-panel.tsx — remove Equipment, add activeTab state, lift Add
3. Modify panel-header.tsx — add "+ Add" button
4. Delete 4 editor header files
5. Update 4 editors — remove header rendering
6. Enhance inventory-equipment-row.tsx — add set/source metadata
7. Thread sortBy through panel → section → row

## Files to Delete

- `enchantment-editor-header.tsx`
- `modifier-editor-header.tsx`
- `gem-editor-header.tsx`
- `variant-types-editor-header.tsx`
