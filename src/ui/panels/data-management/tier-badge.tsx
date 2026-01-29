/**
 * TierBadge — visual badge showing item tier (1 or 2).
 */

import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TierBadge({
  tier,
}: {
  readonly tier: 1 | 2;
}): React.JSX.Element {
  const colorClass =
    tier === 2
      ? "bg-rarity-exotic/20 text-rarity-exotic border-rarity-exotic/30"
      : "bg-rarity-common/20 text-rarity-common border-rarity-common/30";

  return (
    <Badge className={`${colorClass} px-1.5 py-0 text-[10px]`}>
      T{tier}
    </Badge>
  );
}
