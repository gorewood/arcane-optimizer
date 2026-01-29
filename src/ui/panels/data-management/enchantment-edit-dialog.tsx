/**
 * EnchantmentEditDialog — dialog for creating/editing enchantments.
 */

import { useState, useEffect } from "react";
import type { Enchantment } from "@/models/types";
import { useUserDataStore } from "@/stores/user-data-store";
import { ItemEditorDialog } from "./item-editor-dialog";
import { EnchantmentForm } from "./enchantment-form";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EnchantmentEditDialogProps {
  readonly enchantment: Enchantment | null;
  readonly isNew: boolean;
  readonly onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EnchantmentEditDialog({
  enchantment,
  isNew,
  onClose,
}: EnchantmentEditDialogProps): React.JSX.Element {
  const addEnchantment = useUserDataStore((s) => s.addEnchantment);
  const updateEnchantment = useUserDataStore((s) => s.updateEnchantment);

  const [draft, setDraft] = useState<Enchantment | null>(null);

  useEffect(() => {
    setDraft(enchantment);
  }, [enchantment]);

  const handleSave = (): void => {
    if (draft === null) return;
    if (isNew) {
      addEnchantment(draft);
    } else {
      updateEnchantment(draft.id, draft);
    }
    onClose();
  };

  const isValid =
    draft !== null &&
    draft.name.trim() !== "" &&
    draft.id.trim() !== "" &&
    draft.applicableTo.length > 0;

  return (
    <ItemEditorDialog
      open={enchantment !== null}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={isNew ? "Add Enchantment" : "Edit Enchantment"}
      onSave={handleSave}
      onCancel={onClose}
      isValid={isValid}
    >
      {draft !== null && (
        <EnchantmentForm enchantment={draft} onChange={setDraft} isNew={isNew} />
      )}
    </ItemEditorDialog>
  );
}
