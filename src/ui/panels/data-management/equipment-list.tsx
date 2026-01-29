/**
 * EquipmentList — displays equipment items and hidden items section.
 */

import type { EquipmentPiece } from "@/models/types";
import type { MergedItem } from "@/data/user-data-types";
import { useUserDataStore } from "@/stores/user-data-store";
import { EquipmentRow, DeletedEquipmentRow } from "./equipment-row";
import { HiddenItemsSection } from "./hidden-items-section";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EquipmentListProps {
  readonly items: readonly MergedItem<EquipmentPiece>[];
  readonly deletedItems: readonly MergedItem<EquipmentPiece>[];
  readonly onEdit: (equipment: EquipmentPiece) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EquipmentList({
  items,
  deletedItems,
  onEdit,
}: EquipmentListProps): React.JSX.Element {
  const deleteEquipment = useUserDataStore((s) => s.deleteEquipment);
  const restoreEquipment = useUserDataStore((s) => s.restoreEquipment);

  return (
    <>
      <div className="border border-border-subtle rounded-md divide-y divide-border-subtle">
        {items.length === 0 ? (
          <p className="text-text-muted text-xs p-2">No matching equipment.</p>
        ) : (
          items.map((m) => (
            <EquipmentRow
              key={m.item.id}
              item={m}
              onEdit={() => { onEdit(m.item); }}
              onDelete={() => { deleteEquipment(m.item.id); }}
              onReset={m.isModified ? () => { restoreEquipment(m.item.id); } : undefined}
            />
          ))
        )}
      </div>

      {deletedItems.length > 0 && (
        <HiddenItemsSection
          items={deletedItems}
          onRestore={(id) => { restoreEquipment(id); }}
          renderRow={(item) => (
            <DeletedEquipmentRow
              item={item}
              onRestore={() => { restoreEquipment(item.item.id); }}
            />
          )}
        />
      )}
    </>
  );
}
