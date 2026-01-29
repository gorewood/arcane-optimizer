/**
 * GemList — displays gem items and hidden items section.
 */

import type { Gem } from "@/models/types";
import type { MergedItem } from "@/data/user-data-types";
import { useUserDataStore } from "@/stores/user-data-store";
import { GemRow, DeletedGemRow } from "./gem-row";
import { HiddenItemsSection } from "./hidden-items-section";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GemListProps {
  readonly items: readonly MergedItem<Gem>[];
  readonly deletedItems: readonly MergedItem<Gem>[];
  readonly onEdit: (gem: Gem) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GemList({
  items,
  deletedItems,
  onEdit,
}: GemListProps): React.JSX.Element {
  const deleteGem = useUserDataStore((s) => s.deleteGem);
  const restoreGem = useUserDataStore((s) => s.restoreGem);

  return (
    <>
      <div className="border border-border-subtle rounded-md divide-y divide-border-subtle">
        {items.length === 0 ? (
          <p className="text-text-muted text-xs p-2">No matching gems.</p>
        ) : (
          items.map((m) => (
            <GemRow
              key={m.item.id}
              item={m}
              onEdit={() => { onEdit(m.item); }}
              onDelete={() => { deleteGem(m.item.id); }}
              onReset={m.isModified ? () => { restoreGem(m.item.id); } : undefined}
            />
          ))
        )}
      </div>

      {deletedItems.length > 0 && (
        <HiddenItemsSection
          items={deletedItems}
          onRestore={(id) => { restoreGem(id); }}
          renderRow={(item) => (
            <DeletedGemRow
              item={item}
              onRestore={() => { restoreGem(item.item.id); }}
            />
          )}
        />
      )}
    </>
  );
}
