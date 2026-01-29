/**
 * VariantTypeEditDialog — dialog for creating/editing variant types.
 */

import { useState, useEffect } from "react";
import { useUserDataStore } from "@/stores/user-data-store";
import { ItemEditorDialog } from "./item-editor-dialog";
import { VariantTypeForm } from "./variant-type-form";
import type { VariantTypeWithKey } from "./variant-types-editor";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VariantTypeEditDialogProps {
  readonly variantType: VariantTypeWithKey | null;
  readonly isNew: boolean;
  readonly onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VariantTypeEditDialog({
  variantType,
  isNew,
  onClose,
}: VariantTypeEditDialogProps): React.JSX.Element {
  const addVariantType = useUserDataStore((s) => s.addVariantType);
  const updateVariantType = useUserDataStore((s) => s.updateVariantType);

  const [draft, setDraft] = useState<VariantTypeWithKey | null>(null);

  useEffect(() => {
    setDraft(variantType);
  }, [variantType]);

  const handleSave = (): void => {
    if (draft === null) return;
    const entry = { label: draft.label, variants: draft.variants };
    if (isNew) {
      addVariantType(draft.key, entry);
    } else {
      updateVariantType(draft.key, entry);
    }
    onClose();
  };

  const isValid =
    draft !== null &&
    draft.key.trim() !== "" &&
    draft.label.trim() !== "";

  return (
    <ItemEditorDialog
      open={variantType !== null}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={isNew ? "Add Variant Type" : "Edit Variant Type"}
      onSave={handleSave}
      onCancel={onClose}
      isValid={isValid}
    >
      {draft !== null && (
        <VariantTypeForm variantType={draft} onChange={setDraft} isNew={isNew} />
      )}
    </ItemEditorDialog>
  );
}
