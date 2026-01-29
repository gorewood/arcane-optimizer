/**
 * EnchantmentEditor — enchantment list with CRUD operations.
 */

import { useState, useMemo, useCallback } from "react";
import type { Enchantment } from "@/models/types";
import { useUserDataStore } from "@/stores/user-data-store";
import { sortItems, type SortOption } from "@/ui/panels/sort-select";
import { EnchantmentEditorHeader } from "./enchantment-editor-header";
import { EnchantmentList } from "./enchantment-list";
import { EnchantmentEditDialog } from "./enchantment-edit-dialog";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EnchantmentEditor({
  filter,
  sortBy,
}: {
  readonly filter: string;
  readonly sortBy: SortOption;
}): React.JSX.Element {
  // Subscribe to userEnchantments to trigger re-render on changes
  const userEnchantments = useUserDataStore((s) => s.userEnchantments);
  const getMergedEnchantments = useUserDataStore((s) => s.getMergedEnchantments);
  const getDeletedEnchantments = useUserDataStore((s) => s.getDeletedEnchantments);

  const [editingItem, setEditingItem] = useState<Enchantment | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Recompute merged items when userEnchantments changes
  const items = useMemo(() => getMergedEnchantments(), [getMergedEnchantments, userEnchantments]);
  const deletedItems = useMemo(() => getDeletedEnchantments(), [getDeletedEnchantments, userEnchantments]);

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
    setEditingItem(createNewEnchantment());
    setIsNew(true);
  }, []);

  const handleEdit = useCallback((enchantment: Enchantment): void => {
    setEditingItem({ ...enchantment });
    setIsNew(false);
  }, []);

  const handleClose = useCallback((): void => { setEditingItem(null); }, []);

  return (
    <div className="space-y-2">
      <EnchantmentEditorHeader count={filtered.length} onAddNew={handleAddNew} />
      <EnchantmentList items={filtered} deletedItems={deletedItems} onEdit={handleEdit} />
      <EnchantmentEditDialog enchantment={editingItem} isNew={isNew} onClose={handleClose} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createNewEnchantment(): Enchantment {
  return {
    id: `custom-${String(Date.now())}`,
    name: "",
    tier: 1,
    applicableTo: ["armor", "accessory"],
    stats: {},
  };
}
