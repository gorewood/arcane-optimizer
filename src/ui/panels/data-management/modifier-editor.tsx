/**
 * ModifierEditor — modifier list with CRUD operations.
 */

import { useState, useMemo, useCallback } from "react";
import type { Modifier } from "@/models/types";
import { useUserDataStore } from "@/stores/user-data-store";
import { sortItems, type SortOption } from "@/ui/panels/sort-select";
import { ModifierEditorHeader } from "./modifier-editor-header";
import { ModifierList } from "./modifier-list";
import { ModifierEditDialog } from "./modifier-edit-dialog";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ModifierEditor({
  filter,
  sortBy,
}: {
  readonly filter: string;
  readonly sortBy: SortOption;
}): React.JSX.Element {
  // Subscribe to userModifiers to trigger re-render on changes
  const userModifiers = useUserDataStore((s) => s.userModifiers);
  const getMergedModifiers = useUserDataStore((s) => s.getMergedModifiers);
  const getDeletedModifiers = useUserDataStore((s) => s.getDeletedModifiers);

  const [editingItem, setEditingItem] = useState<Modifier | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Recompute merged items when userModifiers changes
  const items = useMemo(() => getMergedModifiers(), [getMergedModifiers, userModifiers]);
  const deletedItems = useMemo(() => getDeletedModifiers(), [getDeletedModifiers, userModifiers]);

  const filtered = useMemo(() => {
    let result = items;
    if (filter !== "") {
      const lower = filter.toLowerCase();
      result = result.filter((m) => m.item.name.toLowerCase().includes(lower));
    }
    const sortedItems = sortItems(result.map((m) => m.item), sortBy);
    const itemMap = new Map(result.map((m) => [m.item.id, m]));
    return sortedItems.flatMap((item) => {
      const merged = itemMap.get(item.id);
      return merged !== undefined ? [merged] : [];
    });
  }, [items, filter, sortBy]);

  const handleAddNew = useCallback((): void => {
    setEditingItem(createNewModifier());
    setIsNew(true);
  }, []);

  const handleEdit = useCallback((modifier: Modifier): void => {
    setEditingItem({ ...modifier });
    setIsNew(false);
  }, []);

  const handleClose = useCallback((): void => { setEditingItem(null); }, []);

  return (
    <div className="space-y-2">
      <ModifierEditorHeader count={filtered.length} onAddNew={handleAddNew} />
      <ModifierList items={filtered} deletedItems={deletedItems} onEdit={handleEdit} />
      <ModifierEditDialog modifier={editingItem} isNew={isNew} onClose={handleClose} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createNewModifier(): Modifier {
  return {
    id: `custom-${String(Date.now())}`,
    name: "",
    stats: {},
  };
}
