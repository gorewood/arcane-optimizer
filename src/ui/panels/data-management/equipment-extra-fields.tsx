/**
 * EquipmentExtraFields — tags, source, and atlantean fields.
 */

import { useMemo } from "react";
import type { EquipmentPiece } from "@/models/types";
import { useUserDataStore } from "@/stores/user-data-store";
import { FormField } from "./form-field";
import { EquipmentNumericFields } from "./equipment-numeric-fields";
import { AutocompleteInput } from "./autocomplete-input";

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

  // Extract known values from existing equipment for autocomplete
  const { knownTags, knownSources } = useMemo(() => {
    const tags = new Set<string>();
    const sources = new Set<string>();
    for (const { item } of getMergedEquipment()) {
      for (const tag of item.tags) tags.add(tag);
      if (item.source !== undefined) sources.add(item.source);
    }
    return { knownTags: [...tags].sort(), knownSources: [...sources].sort() };
  }, [getMergedEquipment]);

  return (
    <>
      <EquipmentNumericFields equipment={equipment} onChange={onChange} />

      <FormField label="Tags (comma-separated, optional)">
        <AutocompleteInput
          value={equipment.tags.join(", ")}
          placeholder="e.g., sunken, boss-drop"
          options={knownTags}
          onChange={(value) => {
            const tags = value.split(",").map((t) => t.trim()).filter(Boolean);
            onChange({ ...equipment, tags: tags.length > 0 ? tags : [] });
          }}
        />
      </FormField>

      <FormField label="Source (optional)">
        <AutocompleteInput
          value={equipment.source ?? ""}
          placeholder="e.g., Sunken Chests, Elius"
          options={knownSources}
          onChange={(value) => {
            const trimmed = value.trim();
            onChange({ ...equipment, source: trimmed !== "" ? trimmed : undefined });
          }}
        />
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
