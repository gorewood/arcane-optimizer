/**
 * VariantTypesList — displays variant type entries and hidden items section.
 */

import { useState } from "react";
import type { VariantTypeEntry } from "@/models/types";
import type { MergedItem } from "@/data/user-data-types";
import { useUserDataStore } from "@/stores/user-data-store";
import { VariantTypeRow, DeletedVariantTypeRow } from "./variant-type-row";
import type { VariantTypeWithKey } from "./variant-types-editor";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VariantTypesListProps {
  readonly items: readonly MergedItem<VariantTypeEntry & { readonly key: string }>[];
  readonly deletedItems: readonly MergedItem<VariantTypeEntry & { readonly key: string }>[];
  readonly onEdit: (entry: VariantTypeWithKey) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VariantTypesList({
  items,
  deletedItems,
  onEdit,
}: VariantTypesListProps): React.JSX.Element {
  const deleteVariantType = useUserDataStore((s) => s.deleteVariantType);
  const restoreVariantType = useUserDataStore((s) => s.restoreVariantType);
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="border border-border-subtle rounded-md divide-y divide-border-subtle">
        {items.length === 0 ? (
          <p className="text-text-muted text-xs p-2">No matching variant types.</p>
        ) : (
          items.map((m) => (
            <VariantTypeRow
              key={m.item.key}
              item={m}
              onEdit={() => { onEdit(m.item); }}
              onDelete={() => { deleteVariantType(m.item.key); }}
              onReset={m.isModified ? () => { restoreVariantType(m.item.key); } : undefined}
            />
          ))
        )}
      </div>

      {deletedItems.length > 0 && (
        <div className="border border-border-subtle rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => { setExpanded((p) => !p); }}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-text-muted bg-bg-elevated hover:bg-bg-surface"
          >
            <span className="text-xs">{expanded ? "\u25BC" : "\u25B6"}</span>
            <span>Hidden Items</span>
            <span className="text-xs">({deletedItems.length})</span>
          </button>
          {expanded && (
            <div className="divide-y divide-border-subtle">
              {deletedItems.map((item) => (
                <DeletedVariantTypeRow
                  key={item.item.key}
                  item={item}
                  onRestore={() => { restoreVariantType(item.item.key); }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
