/**
 * EquipmentExtraFields — tags and atlantean fields.
 */

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import type { EquipmentPiece } from "@/models/types";
import { useUserDataStore } from "@/stores/user-data-store";
import { FormField } from "./form-field";
import { EquipmentNumericFields } from "./equipment-numeric-fields";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EquipmentExtraFieldsProps {
  readonly equipment: EquipmentPiece;
  readonly onChange: (equipment: EquipmentPiece) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EquipmentExtraFields({
  equipment,
  onChange,
}: EquipmentExtraFieldsProps): React.JSX.Element {
  const getMergedEquipment = useUserDataStore((s) => s.getMergedEquipment);

  // Extract all known tags from existing equipment for autocomplete
  const knownTags = useMemo(() => {
    const tags = new Set<string>();
    for (const item of getMergedEquipment()) {
      for (const tag of item.item.tags) {
        tags.add(tag);
      }
    }
    return [...tags].sort();
  }, [getMergedEquipment]);

  return (
    <>
      <EquipmentNumericFields equipment={equipment} onChange={onChange} />

      <FormField label="Tags (comma-separated, optional)">
        <Input
          value={equipment.tags.join(", ")}
          placeholder="e.g., sunken, boss-drop"
          list="equipment-tags-list"
          className="h-8 text-sm"
          onChange={(e) => {
            const value = e.target.value;
            const tags = value
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean);
            onChange({ ...equipment, tags: tags.length > 0 ? tags : [] });
          }}
        />
        <datalist id="equipment-tags-list">
          {knownTags.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      </FormField>

      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={equipment.atlanteanOnly ?? false}
          onChange={(e) => {
            onChange({ ...equipment, atlanteanOnly: e.target.checked || undefined });
          }}
          className="size-4 rounded border-border-default accent-accent-gold"
        />
        Atlantean Only
      </label>
    </>
  );
}
