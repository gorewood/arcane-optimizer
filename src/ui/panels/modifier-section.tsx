/**
 * ModifierSection — toggle list for modifiers.
 */

import { useMemo } from "react";
import type { Modifier } from "@/models/types";
import { useGearPoolStore } from "@/stores/gear-pool-store";
import { sortItems, type SortOption } from "./sort-select";
import { StatSummary } from "./stat-summary";

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export function ModifierSection({
  modifiers,
  filter,
  sortBy,
}: {
  readonly modifiers: readonly Modifier[];
  readonly filter: string;
  readonly sortBy: SortOption;
}): React.JSX.Element {
  const filtered = useMemo(() => {
    let result = modifiers;
    if (filter !== "") {
      const lower = filter.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(lower));
    }
    return sortItems(result, sortBy);
  }, [modifiers, filter, sortBy]);

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-accent-gold px-1">
        Modifiers
        <span className="ml-2 text-xs text-text-muted font-normal">
          ({filtered.length})
        </span>
      </h3>
      {filtered.length === 0 ? (
        <p className="text-text-muted text-xs px-1">No matching modifiers.</p>
      ) : (
        <div className="border border-border-subtle rounded-md divide-y divide-border-subtle overflow-hidden">
          {filtered.map((modifier) => (
            <ModifierRow key={modifier.id} modifier={modifier} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function ModifierRow({
  modifier,
}: {
  readonly modifier: Modifier;
}): React.JSX.Element {
  const enabled = useGearPoolStore((s) =>
    s.enabledModifierIds.has(modifier.id),
  );
  const toggle = useGearPoolStore((s) => s.toggleModifier);

  const description = buildModifierDescription(modifier);

  return (
    <label className="flex items-center gap-2 px-2 py-1 bg-bg-surface hover:bg-bg-elevated transition-colors cursor-pointer">
      <input
        type="checkbox"
        checked={enabled}
        onChange={() => {
          toggle(modifier.id);
        }}
        className="size-3.5 rounded border-border-default accent-accent-gold"
      />
      <span className="text-sm text-text-primary truncate flex-1">
        {modifier.name}
      </span>
      {description !== "" && (
        <span className="text-xs text-text-muted">{description}</span>
      )}
      <StatSummary stats={modifier.stats} />
    </label>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildModifierDescription(modifier: Modifier): string {
  const parts: string[] = [];
  if (modifier.grantsSocket === true) {
    parts.push("+1 socket");
  }
  if (modifier.atlanteanBehavior != null) {
    parts.push("special");
  }
  return parts.join(", ");
}
