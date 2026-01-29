/**
 * EquipmentEditDialog - dialog for creating/editing equipment.
 */

import { useState, useEffect } from "react";
import type { EquipmentPiece } from "@/models/types";
import type { ItemPurpose } from "@/data/user-data-types";
import { useUserDataStore } from "@/stores/user-data-store";
import { ItemEditorDialog } from "./item-editor-dialog";
import { EquipmentForm } from "./equipment-form";
import { PurposeToggle } from "./purpose-toggle";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EquipmentEditDialogProps {
  readonly equipment: EquipmentPiece | null;
  readonly isNew: boolean;
  readonly onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EquipmentEditDialog({
  equipment,
  isNew,
  onClose,
}: EquipmentEditDialogProps): React.JSX.Element {
  const addEquipment = useUserDataStore((s) => s.addEquipment);
  const updateEquipment = useUserDataStore((s) => s.updateEquipment);

  const [draft, setDraft] = useState<EquipmentPiece | null>(null);
  const [purpose, setPurpose] = useState<ItemPurpose>("contribution");

  useEffect(() => {
    setDraft(equipment);
  }, [equipment]);

  useEffect(() => {
    if (equipment !== null) {
      setPurpose("contribution");
    }
  }, [equipment]);

  const handleSave = (): void => {
    if (draft === null) return;
    if (isNew) {
      addEquipment(draft, purpose);
    } else {
      updateEquipment(draft.id, draft);
    }
    onClose();
  };

  const isValid =
    draft !== null && draft.name.trim() !== "" && draft.id.trim() !== "";

  return (
    <ItemEditorDialog
      open={equipment !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={isNew ? "Add Equipment" : "Edit Equipment"}
      onSave={handleSave}
      onCancel={onClose}
      isValid={isValid}
    >
      {draft !== null && (
        <EquipmentForm equipment={draft} onChange={setDraft} isNew={isNew} />
      )}
      {isNew && (
        <PurposeToggle
          idPrefix="equipment"
          value={purpose}
          onChange={setPurpose}
        />
      )}
    </ItemEditorDialog>
  );
}
