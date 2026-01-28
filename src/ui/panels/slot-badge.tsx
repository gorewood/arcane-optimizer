/**
 * SlotBadge — compact badge showing equipment slot type.
 */

import { Badge } from "@/components/ui/badge";
import type { SlotType } from "@/models/types";

// ---------------------------------------------------------------------------
// Slot labels
// ---------------------------------------------------------------------------

const SLOT_LABELS: Record<SlotType, string> = {
  chestplate: "C",
  leggings: "L",
  accessory: "Acc",
  "accessory-H": "H",
  "accessory-A": "A",
};

const SLOT_TITLES: Record<SlotType, string> = {
  chestplate: "Chestplate",
  leggings: "Leggings",
  accessory: "Accessory",
  "accessory-H": "Helmet",
  "accessory-A": "Amulet",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SlotBadge({
  slot,
}: {
  readonly slot: SlotType;
}): React.JSX.Element {
  return (
    <Badge
      variant="outline"
      className="px-1.5 py-0 text-[10px] font-medium text-text-secondary"
      title={SLOT_TITLES[slot]}
    >
      {SLOT_LABELS[slot]}
    </Badge>
  );
}
