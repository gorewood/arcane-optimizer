/**
 * VariantTypesEditor — variant types list with CRUD operations.
 */

import { useState, useMemo, useCallback } from "react";
import type { VariantTypeEntry } from "@/models/types";
import { useUserDataStore } from "@/stores/user-data-store";
import { VariantTypesEditorHeader } from "./variant-types-editor-header";
import { VariantTypesList } from "./variant-types-list";
import { VariantTypeEditDialog } from "./variant-type-edit-dialog";

// ---------------------------------------------------------------------------
// Extended entry with key for editing
// ---------------------------------------------------------------------------

export interface VariantTypeWithKey extends VariantTypeEntry {
  readonly key: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VariantTypesEditor({
  filter,
}: {
  readonly filter: string;
}): React.JSX.Element {
  const getMergedVariantTypes = useUserDataStore((s) => s.getMergedVariantTypes);
  const getDeletedVariantTypes = useUserDataStore((s) => s.getDeletedVariantTypes);

  const [editingItem, setEditingItem] = useState<VariantTypeWithKey | null>(null);
  const [isNew, setIsNew] = useState(false);

  const items = getMergedVariantTypes();
  const deletedItems = getDeletedVariantTypes();

  const filtered = useMemo(() => {
    if (filter === "") return items;
    const lower = filter.toLowerCase();
    return items.filter(
      (m) =>
        m.item.key.toLowerCase().includes(lower) ||
        m.item.label.toLowerCase().includes(lower),
    );
  }, [items, filter]);

  const handleAddNew = useCallback((): void => {
    setEditingItem(createNewVariantType());
    setIsNew(true);
  }, []);

  const handleEdit = useCallback((entry: VariantTypeWithKey): void => {
    setEditingItem({ ...entry });
    setIsNew(false);
  }, []);

  const handleClose = useCallback((): void => { setEditingItem(null); }, []);

  return (
    <div className="space-y-2">
      <VariantTypesEditorHeader count={filtered.length} onAddNew={handleAddNew} />
      <VariantTypesList items={filtered} deletedItems={deletedItems} onEdit={handleEdit} />
      <VariantTypeEditDialog variantType={editingItem} isNew={isNew} onClose={handleClose} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createNewVariantType(): VariantTypeWithKey {
  return {
    key: "",
    label: "",
    variants: [],
  };
}
