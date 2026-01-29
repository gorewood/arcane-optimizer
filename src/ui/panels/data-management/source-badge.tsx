/**
 * SourceBadge — visual badge showing item source and modification state.
 */

import { Badge } from "@/components/ui/badge";
import type { MergedItem } from "@/data/user-data-types";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SourceBadge<T>({
  item,
}: {
  readonly item: MergedItem<T>;
}): React.JSX.Element | null {
  if (item.source === "user") {
    return (
      <Badge className="bg-stat-positive/20 text-stat-positive border-stat-positive/30 px-1.5 py-0 text-[10px]">
        Custom
      </Badge>
    );
  }

  if (item.isModified) {
    return (
      <Badge className="bg-accent-gold/20 text-accent-gold border-accent-gold/30 px-1.5 py-0 text-[10px]">
        Modified
      </Badge>
    );
  }

  return null;
}
