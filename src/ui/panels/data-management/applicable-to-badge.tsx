/**
 * ApplicableToBadge — visual badge showing what an enchantment applies to.
 */

import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApplicableToBadge({
  applicableTo,
}: {
  readonly applicableTo: readonly ("armor" | "accessory")[];
}): React.JSX.Element {
  const label =
    applicableTo.length === 2
      ? "All"
      : applicableTo[0] === "armor"
        ? "Armor"
        : "Acc";

  return (
    <Badge className="bg-accent-gold/20 text-accent-gold border-accent-gold/30 px-1.5 py-0 text-[10px]">
      {label}
    </Badge>
  );
}
