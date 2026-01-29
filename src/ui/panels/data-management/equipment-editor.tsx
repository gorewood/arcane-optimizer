/**
 * EquipmentEditor — equipment list with CRUD operations.
 */

import { useState, useMemo, useCallback } from "react";
import type { EquipmentPiece } from "@/models/types";
import { useUserDataStore } from "@/stores/user-data-store";
import { sortItems, type SortOption } from "@/ui/panels/sort-select";
import { EquipmentEditorHeader } from "./equipment-editor-header";
import { EquipmentList } from "./equipment-list";
import { EquipmentEditDialog } from "./equipment-edit-dialog";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EquipmentEditor({
  filter,
  sortBy,
}: {
  readonly filter: string;
  readonly sortBy: SortOption;
}): React.JSX.Element {
  // Subscribe to userEquipment to trigger re-render on changes
  const userEquipment = useUserDataStore((s) => s.userEquipment);
  const getMergedEquipment = useUserDataStore((s) => s.getMergedEquipment);
  const getDeletedEquipment = useUserDataStore((s) => s.getDeletedEquipment);

  const [editingItem, setEditingItem] = useState<EquipmentPiece | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Recompute merged items when userEquipment changes
  const items = useMemo(() => getMergedEquipment(), [getMergedEquipment, userEquipment]);
  const deletedItems = useMemo(() => getDeletedEquipment(), [getDeletedEquipment, userEquipment]);

  const filtered = useMemo(() => {
    let result = items;
    if (filter !== "") {
      const lower = filter.toLowerCase();
      result = result.filter(
        (m) =>
          m.item.name.toLowerCase().includes(lower) ||
          (m.item.setName?.toLowerCase().includes(lower) ?? false),
      );
    }
    // Sort by the item property, then map back to MergedItem
    const sortedItems = sortItems(result.map((m) => m.item), sortBy);
    const itemMap = new Map(result.map((m) => [m.item.id, m]));
    return sortedItems.flatMap((item) => {
      const merged = itemMap.get(item.id);
      return merged !== undefined ? [merged] : [];
    });
  }, [items, filter, sortBy]);

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
