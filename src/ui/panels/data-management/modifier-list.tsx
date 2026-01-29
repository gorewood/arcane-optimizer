/**
 * ModifierList — displays modifier items and hidden items section.
 */

import type { Modifier } from "@/models/types";
import type { MergedItem } from "@/data/user-data-types";
import { useUserDataStore } from "@/stores/user-data-store";
import { ModifierRow, DeletedModifierRow } from "./modifier-row";
import { HiddenItemsSection } from "./hidden-items-section";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ModifierListProps {
  readonly items: readonly MergedItem<Modifier>[];
  readonly deletedItems: readonly MergedItem<Modifier>[];
  readonly onEdit: (modifier: Modifier) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ModifierList({
  items,
  deletedItems,
  onEdit,
}: ModifierListProps): React.JSX.Element {
  const deleteModifier = useUserDataStore((s) => s.deleteModifier);
  const restoreModifier = useUserDataStore((s) => s.restoreModifier);

  return (
    <>
      <div className="border border-border-subtle rounded-md divide-y divide-border-subtle">
        {items.length === 0 ? (
          <p className="text-text-muted text-xs p-2">No matching modifiers.</p>
        ) : (
          items.map((m) => (
            <ModifierRow
              key={m.item.id}
              item={m}
              onEdit={() => { onEdit(m.item); }}
              onDelete={() => { deleteModifier(m.item.id); }}
              onReset={m.isModified ? () => { restoreModifier(m.item.id); } : undefined}
            />
          ))
        )}
      </div>

      {deletedItems.length > 0 && (
        <HiddenItemsSection
          items={deletedItems}
          onRestore={(id) => { restoreModifier(id); }}
          renderRow={(item) => (
            <DeletedModifierRow
              item={item}
              onRestore={() => { restoreModifier(item.item.id); }}
            />
          )}
        />
      )}
    </>
  );
}
