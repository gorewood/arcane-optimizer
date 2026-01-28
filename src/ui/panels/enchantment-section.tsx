/**
 * EnchantmentSection — toggle list for enchantments.
 */

import { useMemo } from "react";
import type { Enchantment } from "@/models/types";
import { useGearPoolStore } from "@/stores/gear-pool-store";
import { StatSummary } from "./stat-summary";

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export function EnchantmentSection({
  enchantments,
  filter,
}: {
  readonly enchantments: readonly Enchantment[];
  readonly filter: string;
}): React.JSX.Element {
  const filtered = useMemo(() => {
    if (filter === "") return enchantments;
    const lower = filter.toLowerCase();
    return enchantments.filter((e) => e.name.toLowerCase().includes(lower));
  }, [enchantments, filter]);

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-accent-gold px-1">
        Enchantments
        <span className="ml-2 text-xs text-text-muted font-normal">
          ({filtered.length})
        </span>
      </h3>
      {filtered.length === 0 ? (
        <p className="text-text-muted text-xs px-1">No matching enchantments.</p>
      ) : (
        <div className="border border-border-subtle rounded-md divide-y divide-border-subtle overflow-hidden">
          {filtered.map((enchantment) => (
            <EnchantmentRow key={enchantment.id} enchantment={enchantment} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function EnchantmentRow({
  enchantment,
}: {
  readonly enchantment: Enchantment;
}): React.JSX.Element {
  const enabled = useGearPoolStore((s) =>
    s.enabledEnchantmentIds.has(enchantment.id),
  );
  const toggle = useGearPoolStore((s) => s.toggleEnchantment);

  return (
    <label className="flex items-center gap-2 px-2 py-1 bg-bg-surface hover:bg-bg-elevated transition-colors cursor-pointer">
      <input
        type="checkbox"
        checked={enabled}
        onChange={() => {
          toggle(enchantment.id);
        }}
        className="size-3.5 rounded border-border-default accent-accent-gold"
      />
      <span className="text-sm text-text-primary truncate flex-1">
        {enchantment.name}
      </span>
      <span className="text-xs text-text-muted">T{enchantment.tier}</span>
      <StatSummary stats={enchantment.stats} />
    </label>
  );
}
