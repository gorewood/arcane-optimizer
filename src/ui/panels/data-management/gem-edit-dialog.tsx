/**
 * GemEditDialog - dialog for creating/editing gems.
 */

import { useState, useEffect } from "react";
import type { Gem } from "@/models/types";
import type { ItemPurpose } from "@/data/user-data-types";
import { useUserDataStore } from "@/stores/user-data-store";
import { ItemEditorDialog } from "./item-editor-dialog";
import { GemForm } from "./gem-form";
import { PurposeToggle } from "./purpose-toggle";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GemEditDialogProps {
  readonly gem: Gem | null;
  readonly isNew: boolean;
  readonly onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GemEditDialog({
  gem,
  isNew,
  onClose,
}: GemEditDialogProps): React.JSX.Element {
  const addGem = useUserDataStore((s) => s.addGem);
  const updateGem = useUserDataStore((s) => s.updateGem);

  const [draft, setDraft] = useState<Gem | null>(null);
  const [purpose, setPurpose] = useState<ItemPurpose>("contribution");

  useEffect(() => {
    setDraft(gem);
  }, [gem]);

  useEffect(() => {
    if (gem !== null) {
      setPurpose("contribution");
    }
  }, [gem]);

  const handleSave = (): void => {
    if (draft === null) return;
    if (isNew) {
      addGem(draft, purpose);
    } else {
      updateGem(draft.id, draft);
    }
    onClose();
  };

  const isValid =
    draft !== null && draft.name.trim() !== "" && draft.id.trim() !== "";

  return (
    <ItemEditorDialog
      open={gem !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={isNew ? "Add Gem" : "Edit Gem"}
      onSave={handleSave}
      onCancel={onClose}
      isValid={isValid}
    >
      {draft !== null && (
        <GemForm gem={draft} onChange={setDraft} isNew={isNew} />
      )}
      {isNew && (
        <PurposeToggle idPrefix="gem" value={purpose} onChange={setPurpose} />
      )}
    </ItemEditorDialog>
  );
}
