/**
 * EquipmentNumericFields — sockets and max level fields.
 */

import { Input } from "@/components/ui/input";
import type { EquipmentPiece } from "@/models/types";
import { FormField } from "./form-field";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EquipmentNumericFieldsProps {
  readonly equipment: EquipmentPiece;
  readonly onChange: (equipment: EquipmentPiece) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EquipmentNumericFields({
  equipment,
  onChange,
}: EquipmentNumericFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Sockets">
        <Input
          type="number"
          value={equipment.socketCount}
          min={0}
          max={5}
          className="h-8 text-sm"
          onChange={(e) => {
            onChange({ ...equipment, socketCount: parseInt(e.target.value, 10) || 0 });
          }}
        />
      </FormField>
      <FormField label="Max Level">
        <Input
          type="number"
          value={equipment.maxLevel}
          min={1}
          max={100}
          className="h-8 text-sm"
          onChange={(e) => {
            onChange({ ...equipment, maxLevel: parseInt(e.target.value, 10) || 1 });
          }}
        />
      </FormField>
    </div>
  );
}
