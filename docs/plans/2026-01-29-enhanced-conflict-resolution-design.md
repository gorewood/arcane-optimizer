# Enhanced Conflict Resolution System

**Date:** 2026-01-29
**Status:** Design Complete

## Overview

Replace the current all-or-nothing version conflict dialog with an item-level sync system that supports contributor workflows and custom item protection.

## Use Cases

1. **Contributor sync** - User adds items for the project, we merge them into bundled data, user's duplicates are automatically cleaned up
2. **Custom items** - User adds items for personal builds that persist forever
3. **Cleanup** - User can manually remove obsolete items

## Design Decisions

| Decision | Choice |
|----------|--------|
| Item tagging | `purpose: "contribution" \| "custom"` (default: contribution) |
| Duplicate detection | Normalized name + type match (case-insensitive, trim, strip possessives) |
| Dialog detail level | Expandable summary (counts upfront, item names on expand) |
| Changelog | Human-curated in `data-manifest.json` |
| Sync trigger | On app load only (when version mismatch detected) |
| Gear pool on purge | Reset to defaults (bundled items enabled by default) |

## Data Model Changes

### User Item Records

```typescript
interface UserItemRecord<T> {
  id: string
  data?: T
  deleted?: boolean
  baseVersion?: number
  createdAt: number
  updatedAt: number
  purpose: "contribution" | "custom"  // NEW - defaults to "contribution"
}
```

### Data Manifest

```typescript
// data-manifest.json
{
  "version": 2,
  "changelog": [
    {
      "version": 2,
      "date": "2026-01-30",
      "summary": "Added Siren's Set, fixed Cernyx stats",
      "added": ["Siren Helmet", "Siren Armor", "Siren Amulet"],
      "modified": ["Cernyx Helmet", "Cernyx Armor"],
      "removed": []
    }
  ]
}
```

## Sync Logic

When app loads and version mismatch detected:

1. **Compute bundled diff** between old version and new version
   - New items: in new, not in old
   - Modified items: in both, but different
   - Removed items: in old, not in new

2. **Detect duplicates** - For each user item marked `purpose: "contribution"`:
   - Normalize name (lowercase, trim, strip possessives like "'s")
   - Check if bundled item exists with same normalized name + type
   - If match found → mark as duplicate

3. **Categorize user items:**
   - **Duplicates** (contributions matching bundled) → will be purged
   - **Orphan contributions** (contributions NOT matching bundled) → kept, user can manually delete
   - **Custom items** → always kept

4. **On "Accept":**
   - Update `bundledVersion` to new version
   - Delete all duplicate contribution records
   - Keep custom items and orphan contributions untouched

## Dialog UI

```
┌─────────────────────────────────────────────────────────┐
│  Game Data Updated (v1 → v2)                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📦 Bundled Changes                                     │
│  ├─ 3 new items                              [expand ▶] │
│  ├─ 2 modified items                         [expand ▶] │
│  └─ 0 removed items                                     │
│                                                         │
│  🧹 Your Items                                          │
│  ├─ 2 duplicates (will be removed)           [expand ▶] │
│  ├─ 1 orphan contribution (kept)             [expand ▶] │
│  └─ 1 custom item (always kept)              [expand ▶] │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  "Added Siren's Set, fixed Cernyx stats"                │
│                                                         │
│              [ Cancel ]           [ Accept & Sync ]     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Expanded section example:**
```
│  ├─ 2 duplicates (will be removed)           [collapse] │
│  │    • Cernyx Helmet → matches bundled                 │
│  │    • Cernyx Armor → matches bundled                  │
```

**Cancel:** Close dialog, don't update version, dialog reappears next load.

## Purpose Toggle in Editors

```
┌─────────────────────────────────────────────────────────┐
│  Add Equipment                                          │
├─────────────────────────────────────────────────────────┤
│  Name: [Cernyx Helmet          ]                        │
│  Slot: [Helmet ▼]                                       │
│  ...stats...                                            │
│                                                         │
│  Purpose: ○ Contribution (syncs with updates)           │
│           ○ Custom (keeps forever)                      │
│                                                         │
│              [ Cancel ]                    [ Save ]     │
└─────────────────────────────────────────────────────────┘
```

- Contribution selected by default
- Can be changed later by editing
- Tooltip explains the difference

## Migration

Existing user items get `purpose: "contribution"` on first load after feature ships. Users with custom items can edit them to mark as custom.

## Implementation Scope

### Files to Modify

| File | Changes |
|------|---------|
| `src/data/data-manifest.json` | Add `changelog` array |
| `src/data/user-data-types.ts` | Add `purpose` field to `UserItemRecord` |
| `src/data/user-data-schemas.ts` | Update Zod schemas for new fields |
| `src/stores/user-data-store.ts` | Migration logic, sync logic |
| `src/data/merge-user-data.ts` | Duplicate detection, name normalization |
| `src/ui/panels/data-management/version-conflict-dialog.tsx` | New expandable UI |
| `src/ui/panels/data-management/*-editor.tsx` | Add purpose toggle |

### New Files

| File | Purpose |
|------|---------|
| `src/data/sync-utils.ts` | Pure functions: `normalizeItemName`, `detectDuplicates`, `computeBundledDiff` |

### Testing

- Unit tests for `normalizeItemName` (case, whitespace, possessives)
- Unit tests for `detectDuplicates` matching logic
- Unit tests for `computeBundledDiff`
- Integration test for full sync flow
