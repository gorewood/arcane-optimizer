/**
 * ModifierEditDialog - dialog for creating/editing modifiers.
 */

import { useState, useEffect } from "react";
import type { Modifier } from "@/models/types";
import type { ItemPurpose } from "@/data/user-data-types";
import { useUserDataStore } from "@/stores/user-data-store";
import { ItemEditorDialog } from "./item-editor-dialog";
import { ModifierForm } from "./modifier-form";
import { PurposeToggle } from "./purpose-toggle";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ModifierEditDialogProps {
  readonly modifier: Modifier | null;
  readonly isNew: boolean;
  readonly onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ModifierEditDialog({
  modifier,
  isNew,
  onClose,
}: ModifierEditDialogProps): React.JSX.Element {
  const addModifier = useUserDataStore((s) => s.addModifier);
  const updateModifier = useUserDataStore((s) => s.updateModifier);

  const [draft, setDraft] = useState<Modifier | null>(null);
  const [purpose, setPurpose] = useState<ItemPurpose>("contribution");

  useEffect(() => {
    setDraft(modifier);
  }, [modifier]);

  useEffect(() => {
    if (modifier !== null) {
      setPurpose("contribution");
    }
  }, [modifier]);

  const handleSave = (): void => {
    if (draft === null) return;
    if (isNew) {
      addModifier(draft, purpose);
    } else {
      updateModifier(draft.id, draft);
    }
    onClose();
  };

  const isValid =
    draft !== null && draft.name.trim() !== "" && draft.id.trim() !== "";

  return (
    <ItemEditorDialog
      open={modifier !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={isNew ? "Add Modifier" : "Edit Modifier"}
      onSave={handleSave}
      onCancel={onClose}
      isValid={isValid}
    >
      {draft !== null && (
        <ModifierForm modifier={draft} onChange={setDraft} isNew={isNew} />
      )}
      {isNew && (
        <PurposeToggle
          idPrefix="modifier"
          value={purpose}
          onChange={setPurpose}
        />
      )}
    </ItemEditorDialog>
  );
}
