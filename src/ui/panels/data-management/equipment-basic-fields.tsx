/**
 * EquipmentBasicFields — basic fields for equipment editing (name, slot, etc.).
 */

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EquipmentPiece, SlotType } from "@/models/types";
import { FormField } from "./form-field";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SLOT_VALUES = ["chestplate", "leggings", "accessory", "accessory-H", "accessory-A"] as const;

const SLOT_OPTIONS: readonly { value: SlotType; label: string }[] = [
  { value: "chestplate", label: "Chestplate" },
  { value: "leggings", label: "Leggings" },
  { value: "accessory", label: "Accessory" },
  { value: "accessory-H", label: "Helmet" },
  { value: "accessory-A", label: "Amulet" },
];

function isSlotType(value: string): value is SlotType {
  return (SLOT_VALUES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EquipmentBasicFieldsProps {
  readonly equipment: EquipmentPiece;
  readonly onChange: (equipment: EquipmentPiece) => void;
  readonly isNew: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EquipmentBasicFields({
  equipment,
  onChange,
  isNew,
}: EquipmentBasicFieldsProps): React.JSX.Element {
  const update = <K extends keyof EquipmentPiece>(
    key: K,
    value: EquipmentPiece[K],
  ): void => {
    onChange({ ...equipment, [key]: value });
  };

  return (
    <>
      <FormField label="ID">
        <Input
          value={equipment.id}
          disabled={!isNew}
          className="h-8 text-sm"
          onChange={(e) => { update("id", e.target.value); }}
        />
      </FormField>

      <FormField label="Name">
        <Input
          value={equipment.name}
          className="h-8 text-sm"
          onChange={(e) => { update("name", e.target.value); }}
        />
      </FormField>

      <FormField label="Slot">
        <Select
          value={equipment.slot}
          onValueChange={(v) => { if (isSlotType(v)) update("slot", v); }}
        >
          <SelectTrigger size="sm" className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SLOT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Set Name">
        <Input
          value={equipment.setName ?? ""}
          placeholder="(none)"
          className="h-8 text-sm"
          onChange={(e) => { update("setName", e.target.value || undefined); }}
        />
      </FormField>
    </>
  );
}
