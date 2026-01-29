/**
 * GemEditor — gem list with CRUD operations.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { Gem } from "@/models/types";
import { useUserDataStore } from "@/stores/user-data-store";
import { sortItems, type SortOption } from "@/ui/panels/sort-select";
import { GemList } from "./gem-list";
import { GemEditDialog } from "./gem-edit-dialog";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GemEditor({
  filter,
  sortBy,
  addRequest,
}: {
  readonly filter: string;
  readonly sortBy: SortOption;
  readonly addRequest: number;
}): React.JSX.Element {
  // Subscribe to userGems to trigger re-render on changes
  const userGems = useUserDataStore((s) => s.userGems);
  const getMergedGems = useUserDataStore((s) => s.getMergedGems);
  const getDeletedGems = useUserDataStore((s) => s.getDeletedGems);

  const [editingItem, setEditingItem] = useState<Gem | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Recompute merged items when userGems changes
  const items = useMemo(() => getMergedGems(), [getMergedGems, userGems]);
  const deletedItems = useMemo(() => getDeletedGems(), [getDeletedGems, userGems]);

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
    setEditingItem(createNewGem());
    setIsNew(true);
  }, []);

  const handleEdit = useCallback((gem: Gem): void => {
    setEditingItem({ ...gem });
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
