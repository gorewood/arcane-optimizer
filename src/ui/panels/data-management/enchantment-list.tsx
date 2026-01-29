/**
 * EnchantmentList — displays enchantment items and hidden items section.
 */

import type { Enchantment } from "@/models/types";
import type { MergedItem } from "@/data/user-data-types";
import { useUserDataStore } from "@/stores/user-data-store";
import { EnchantmentRow, DeletedEnchantmentRow } from "./enchantment-row";
import { HiddenItemsSection } from "./hidden-items-section";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EnchantmentListProps {
  readonly items: readonly MergedItem<Enchantment>[];
  readonly deletedItems: readonly MergedItem<Enchantment>[];
  readonly onEdit: (enchantment: Enchantment) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EnchantmentList({
  items,
  deletedItems,
  onEdit,
}: EnchantmentListProps): React.JSX.Element {
  const deleteEnchantment = useUserDataStore((s) => s.deleteEnchantment);
  const restoreEnchantment = useUserDataStore((s) => s.restoreEnchantment);

  return (
    <>
      <div className="border border-border-subtle rounded-md divide-y divide-border-subtle">
        {items.length === 0 ? (
          <p className="text-text-muted text-xs p-2">No matching enchantments.</p>
        ) : (
          items.map((m) => (
            <EnchantmentRow
              key={m.item.id}
              item={m}
              onEdit={() => { onEdit(m.item); }}
              onDelete={() => { deleteEnchantment(m.item.id); }}
              onReset={m.isModified ? () => { restoreEnchantment(m.item.id); } : undefined}
            />
          ))
        )}
      </div>

      {deletedItems.length > 0 && (
        <HiddenItemsSection
          items={deletedItems}
          onRestore={(id) => { restoreEnchantment(id); }}
          renderRow={(item) => (
            <DeletedEnchantmentRow
              item={item}
              onRestore={() => { restoreEnchantment(item.item.id); }}
            />
          )}
        />
      )}
    </>
  );
}
