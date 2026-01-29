/**
 * VariantTypesEditor — variant types list with CRUD operations.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { VariantTypeEntry } from "@/models/types";
import { useUserDataStore } from "@/stores/user-data-store";
import type { SortOption } from "@/ui/panels/sort-select";
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
  sortBy,
  addRequest,
}: {
  readonly filter: string;
  readonly sortBy: SortOption;
  readonly addRequest: number;
}): React.JSX.Element {
  // Subscribe to userVariantTypes to trigger re-render on changes
  const userVariantTypes = useUserDataStore((s) => s.userVariantTypes);
  const getMergedVariantTypes = useUserDataStore((s) => s.getMergedVariantTypes);
  const getDeletedVariantTypes = useUserDataStore((s) => s.getDeletedVariantTypes);

  const [editingItem, setEditingItem] = useState<VariantTypeWithKey | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Recompute merged items when userVariantTypes changes
  const items = useMemo(() => getMergedVariantTypes(), [getMergedVariantTypes, userVariantTypes]);
  const deletedItems = useMemo(() => getDeletedVariantTypes(), [getDeletedVariantTypes, userVariantTypes]);

  const filtered = useMemo(() => {
    let result = items;
    if (filter !== "") {
      const lower = filter.toLowerCase();
      result = result.filter(
        (m) =>
          m.item.key.toLowerCase().includes(lower) ||
          m.item.label.toLowerCase().includes(lower),
      );
    }
    // Sort variants by key or label based on sort option
    const sorted = [...result];
    if (sortBy === "name-asc") {
      sorted.sort((a, b) => a.item.label.localeCompare(b.item.label));
    } else if (sortBy === "name-desc") {
      sorted.sort((a, b) => b.item.label.localeCompare(a.item.label));
    }
    // Other sort options don't apply to variants
    return sorted;
  }, [items, filter, sortBy]);

  const handleAddNew = useCallback((): void => {
    setEditingItem(createNewVariantType());
    setIsNew(true);
  }, []);

  const handleEdit = useCallback((entry: VariantTypeWithKey): void => {
    setEditingItem({ ...entry });
    setIsNew(false);
  }, []);

  const handleClose = useCallback((): void => { setEditingItem(null); }, []);

  // Respond to add requests from parent
  const prevAddRequest = useRef(addRequest);
  useEffect(() => {
    if (addRequest > 0 && addRequest !== prevAddRequest.current) {
      // Use requestAnimationFrame to avoid sync setState in effect
      requestAnimationFrame(() => { handleAddNew(); });
    }
    prevAddRequest.current = addRequest;
  }, [addRequest, handleAddNew]);

  return (
    <div className="space-y-2">
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
