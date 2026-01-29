/**
 * GemEditor — gem list with CRUD operations.
 */

import { useState, useMemo, useCallback } from "react";
import type { Gem } from "@/models/types";
import { useUserDataStore } from "@/stores/user-data-store";
import { GemEditorHeader } from "./gem-editor-header";
import { GemList } from "./gem-list";
import { GemEditDialog } from "./gem-edit-dialog";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GemEditor({
  filter,
}: {
  readonly filter: string;
}): React.JSX.Element {
  const getMergedGems = useUserDataStore((s) => s.getMergedGems);
  const getDeletedGems = useUserDataStore((s) => s.getDeletedGems);

  const [editingItem, setEditingItem] = useState<Gem | null>(null);
  const [isNew, setIsNew] = useState(false);

  const items = getMergedGems();
  const deletedItems = getDeletedGems();

  const filtered = useMemo(() => {
    if (filter === "") return items;
    const lower = filter.toLowerCase();
    return items.filter((m) => m.item.name.toLowerCase().includes(lower));
  }, [items, filter]);

  const handleAddNew = useCallback((): void => {
    setEditingItem(createNewGem());
    setIsNew(true);
  }, []);

  const handleEdit = useCallback((gem: Gem): void => {
    setEditingItem({ ...gem });
    setIsNew(false);
  }, []);

  const handleClose = useCallback((): void => { setEditingItem(null); }, []);

  return (
    <div className="space-y-2">
      <GemEditorHeader count={filtered.length} onAddNew={handleAddNew} />
      <GemList items={filtered} deletedItems={deletedItems} onEdit={handleEdit} />
      <GemEditDialog gem={editingItem} isNew={isNew} onClose={handleClose} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createNewGem(): Gem {
  return {
    id: `custom-${String(Date.now())}`,
    name: "",
    tier: 1,
    stats: {},
  };
}
