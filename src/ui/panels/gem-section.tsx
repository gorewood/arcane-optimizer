/**
 * GemSection — toggle list for gems.
 */

import { useMemo } from "react";
import type { Gem } from "@/models/types";
import { useGearPoolStore } from "@/stores/gear-pool-store";
import { StatSummary } from "./stat-summary";

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export function GemSection({
  gems,
  filter,
}: {
  readonly gems: readonly Gem[];
  readonly filter: string;
}): React.JSX.Element {
  const filtered = useMemo(() => {
    if (filter === "") return gems;
    const lower = filter.toLowerCase();
    return gems.filter((g) => g.name.toLowerCase().includes(lower));
  }, [gems, filter]);

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-accent-gold px-1">
        Gems
        <span className="ml-2 text-xs text-text-muted font-normal">
          ({filtered.length})
        </span>
      </h3>
      {filtered.length === 0 ? (
        <p className="text-text-muted text-xs px-1">No matching gems.</p>
      ) : (
        <div className="border border-border-subtle rounded-md divide-y divide-border-subtle overflow-hidden">
          {filtered.map((gem) => (
            <GemRow key={gem.id} gem={gem} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function GemRow({
  gem,
}: {
  readonly gem: Gem;
}): React.JSX.Element {
  const enabled = useGearPoolStore((s) => s.enabledGemIds.has(gem.id));
  const toggle = useGearPoolStore((s) => s.toggleGem);

  return (
    <label className="flex items-center gap-2 px-2 py-1 bg-bg-surface hover:bg-bg-elevated transition-colors cursor-pointer">
      <input
        type="checkbox"
        checked={enabled}
        onChange={() => {
          toggle(gem.id);
        }}
        className="size-3.5 rounded border-border-default accent-accent-gold"
      />
      <span className="text-sm text-text-primary truncate flex-1">
        {gem.name}
      </span>
      <span className="text-xs text-text-muted">T{gem.tier}</span>
      <StatSummary stats={gem.stats} />
    </label>
  );
}
