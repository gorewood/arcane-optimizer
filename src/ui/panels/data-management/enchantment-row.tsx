/**
 * EnchantmentRow — single enchantment item row with actions.
 */

import { Button } from "@/components/ui/button";
import type { Enchantment } from "@/models/types";
import type { MergedItem } from "@/data/user-data-types";
import { StatSummary } from "@/ui/panels/stat-summary";
import { SourceBadge } from "./source-badge";
import { TierBadge } from "./tier-badge";
import { ApplicableToBadge } from "./applicable-to-badge";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EnchantmentRowProps {
  readonly item: MergedItem<Enchantment>;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onReset?: (() => void) | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EnchantmentRow({
  item,
  onEdit,
  onDelete,
  onReset,
}: EnchantmentRowProps): React.JSX.Element {
  const enchantment = item.item;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-surface hover:bg-bg-elevated transition-colors">
      <span className="text-sm text-text-primary truncate flex-1">
        {enchantment.name}
      </span>
      <SourceBadge item={item} />
      <TierBadge tier={enchantment.tier} />
      <ApplicableToBadge applicableTo={enchantment.applicableTo} />
      <StatSummary stats={enchantment.stats} />
      <div className="flex gap-1 ml-2">
        <Button variant="ghost" size="xs" onClick={onEdit}>
          Edit
        </Button>
        {item.isModified && onReset && (
          <Button variant="ghost" size="xs" onClick={onReset}>
            Reset
          </Button>
        )}
        <Button
          variant="ghost"
          size="xs"
          className="text-stat-negative hover:text-stat-negative"
          onClick={onDelete}
        >
          {item.source === "bundled" ? "Hide" : "Delete"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DeletedEnchantmentRow — for restore UI
// ---------------------------------------------------------------------------

export function DeletedEnchantmentRow({
  item,
  onRestore,
}: {
  readonly item: MergedItem<Enchantment>;
  readonly onRestore: () => void;
}): React.JSX.Element {
  const enchantment = item.item;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-surface/50 opacity-60">
      <span className="text-sm text-text-muted truncate flex-1 line-through">
        {enchantment.name}
      </span>
      <TierBadge tier={enchantment.tier} />
      <Button variant="ghost" size="xs" onClick={onRestore}>
        Restore
      </Button>
    </div>
  );
}
