/**
 * EquipmentForm — complete form for editing an equipment piece.
 */

import { Label } from "@/components/ui/label";
import type { EquipmentPiece } from "@/models/types";
import { StatsEditor } from "./stats-editor";
import { VariantsEditor } from "./variants-editor";
import { EquipmentBasicFields } from "./equipment-basic-fields";
import { EquipmentExtraFields } from "./equipment-extra-fields";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EquipmentFormProps {
  readonly equipment: EquipmentPiece;
  readonly onChange: (equipment: EquipmentPiece) => void;
  readonly isNew: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EquipmentForm({
  equipment,
  onChange,
  isNew,
}: EquipmentFormProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <EquipmentBasicFields
        equipment={equipment}
        onChange={onChange}
        isNew={isNew}
      />

      <EquipmentExtraFields equipment={equipment} onChange={onChange} />

      <div>
        <Label className="text-xs text-text-muted mb-2 block">Base Stats</Label>
        <StatsEditor
          stats={equipment.baseStats}
          onChange={(s) => { onChange({ ...equipment, baseStats: s }); }}
        />
      </div>

      <VariantsEditor
        variants={equipment.variants}
        onChange={(v) => { onChange({ ...equipment, variants: v }); }}
      />
    </div>
  );
}
