/**
 * EquipmentEditor — equipment list with CRUD operations.
 */

import { useState, useMemo, useCallback } from "react";
import type { EquipmentPiece } from "@/models/types";
import { useUserDataStore } from "@/stores/user-data-store";
import { EquipmentEditorHeader } from "./equipment-editor-header";
import { EquipmentList } from "./equipment-list";
import { EquipmentEditDialog } from "./equipment-edit-dialog";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EquipmentEditor({
  filter,
}: {
  readonly filter: string;
}): React.JSX.Element {
  const getMergedEquipment = useUserDataStore((s) => s.getMergedEquipment);
  const getDeletedEquipment = useUserDataStore((s) => s.getDeletedEquipment);

  const [editingItem, setEditingItem] = useState<EquipmentPiece | null>(null);
  const [isNew, setIsNew] = useState(false);

  const items = getMergedEquipment();
  const deletedItems = getDeletedEquipment();

  const filtered = useMemo(() => {
    if (filter === "") return items;
    const lower = filter.toLowerCase();
    return items.filter(
      (m) =>
        m.item.name.toLowerCase().includes(lower) ||
        (m.item.setName?.toLowerCase().includes(lower) ?? false),
    );
  }, [items, filter]);

  const handleAddNew = useCallback((): void => {
    setEditingItem(createNewEquipment());
    setIsNew(true);
  }, []);

  const handleEdit = useCallback((equipment: EquipmentPiece): void => {
    setEditingItem({ ...equipment });
    setIsNew(false);
  }, []);

  const handleClose = useCallback((): void => { setEditingItem(null); }, []);

  return (
    <div className="space-y-2">
      <EquipmentEditorHeader count={filtered.length} onAddNew={handleAddNew} />
      <EquipmentList items={filtered} deletedItems={deletedItems} onEdit={handleEdit} />
      <EquipmentEditDialog equipment={editingItem} isNew={isNew} onClose={handleClose} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createNewEquipment(): EquipmentPiece {
  return {
    id: `custom-${String(Date.now())}`,
    name: "",
    slot: "accessory",
    baseStats: {},
    socketCount: 0,
    maxLevel: 1,
    tags: [],
  };
}
