/**
 * EquipmentEditDialog — dialog for creating/editing equipment.
 */

import { useState, useEffect } from "react";
import type { EquipmentPiece } from "@/models/types";
import { useUserDataStore } from "@/stores/user-data-store";
import { ItemEditorDialog } from "./item-editor-dialog";
import { EquipmentForm } from "./equipment-form";

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

  useEffect(() => {
    setDraft(equipment);
  }, [equipment]);

  const handleSave = (): void => {
    if (draft === null) return;
    if (isNew) {
      addEquipment(draft);
    } else {
      updateEquipment(draft.id, draft);
    }
    onClose();
  };

  const isValid =
    draft !== null &&
    draft.name.trim() !== "" &&
    draft.id.trim() !== "";

  return (
    <ItemEditorDialog
      open={equipment !== null}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={isNew ? "Add Equipment" : "Edit Equipment"}
      onSave={handleSave}
      onCancel={onClose}
      isValid={isValid}
    >
      {draft !== null && (
        <EquipmentForm equipment={draft} onChange={setDraft} isNew={isNew} />
      )}
    </ItemEditorDialog>
  );
}
