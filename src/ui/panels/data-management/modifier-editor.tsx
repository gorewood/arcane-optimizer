/**
 * ModifierEditor — modifier list with CRUD operations.
 */

import { useState, useMemo, useCallback } from "react";
import type { Modifier } from "@/models/types";
import { useUserDataStore } from "@/stores/user-data-store";
import { ModifierEditorHeader } from "./modifier-editor-header";
import { ModifierList } from "./modifier-list";
import { ModifierEditDialog } from "./modifier-edit-dialog";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ModifierEditor({
  filter,
}: {
  readonly filter: string;
}): React.JSX.Element {
  const getMergedModifiers = useUserDataStore((s) => s.getMergedModifiers);
  const getDeletedModifiers = useUserDataStore((s) => s.getDeletedModifiers);

  const [editingItem, setEditingItem] = useState<Modifier | null>(null);
  const [isNew, setIsNew] = useState(false);

  const items = getMergedModifiers();
  const deletedItems = getDeletedModifiers();

  const filtered = useMemo(() => {
    if (filter === "") return items;
    const lower = filter.toLowerCase();
    return items.filter((m) => m.item.name.toLowerCase().includes(lower));
  }, [items, filter]);

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
