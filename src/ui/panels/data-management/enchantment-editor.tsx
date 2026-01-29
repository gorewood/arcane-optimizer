/**
 * EnchantmentEditor — enchantment list with CRUD operations.
 */

import { useState, useMemo, useCallback } from "react";
import type { Enchantment } from "@/models/types";
import { useUserDataStore } from "@/stores/user-data-store";
import { EnchantmentEditorHeader } from "./enchantment-editor-header";
import { EnchantmentList } from "./enchantment-list";
import { EnchantmentEditDialog } from "./enchantment-edit-dialog";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EnchantmentEditor({
  filter,
}: {
  readonly filter: string;
}): React.JSX.Element {
  const getMergedEnchantments = useUserDataStore((s) => s.getMergedEnchantments);
  const getDeletedEnchantments = useUserDataStore((s) => s.getDeletedEnchantments);

  const [editingItem, setEditingItem] = useState<Enchantment | null>(null);
  const [isNew, setIsNew] = useState(false);

  const items = getMergedEnchantments();
  const deletedItems = getDeletedEnchantments();

  const filtered = useMemo(() => {
    if (filter === "") return items;
    const lower = filter.toLowerCase();
    return items.filter((m) => m.item.name.toLowerCase().includes(lower));
  }, [items, filter]);

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
