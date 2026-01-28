/**
 * SlotContributionTable — per-slot stat breakdown table.
 *
 * Shows how each equipped slot contributes to the total stats.
 * Used in the expanded view of result cards.
 */

import type { EquippedSlot, Loadout, StatName, Stats } from "@/models/types";
import { computeSlotStats } from "@/search/constraints";
import { resolveAtlanteanBonus, sumStats } from "@/search/stats";
import { STAT_LABELS } from "./stat-indicator";

// Stats to display in the contribution table (core stats only)
const DISPLAY_STATS: readonly StatName[] = [
  "power",
  "defense",
  "size",
  "dexterity",
  "range",
  "haste",
  "insanity",
  "warding",
];

const SLOT_NAMES = ["Chest", "Legs", "Acc 1", "Acc 2", "Acc 3"] as const;

interface SlotContributionTableProps {
  readonly loadout: Loadout;
  readonly atlanteanChoices?: ReadonlyMap<number, StatName> | undefined;
}

export function SlotContributionTable({
  loadout,
  atlanteanChoices,
}: SlotContributionTableProps): React.JSX.Element {
  // Compute per-slot stats including Atlantean bonus
  const slotStats: Stats[] = loadout.slots.map((slot, i) => {
    const baseStats = computeSlotStats(slot);
    const atlanteanBonus = resolveAtlanteanBonus(slot, atlanteanChoices?.get(i) ?? null);
    return sumStats(baseStats, atlanteanBonus);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border-subtle">
            <th className="py-1.5 text-left font-medium text-text-muted">Slot</th>
            {DISPLAY_STATS.map((stat) => (
              <th
                key={stat}
                className="py-1.5 px-2 text-right font-medium text-text-muted"
              >
                {STAT_LABELS[stat]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loadout.slots.map((slot, i) => (
            <SlotRow
              key={i}
              name={SLOT_NAMES[i] ?? `Slot ${String(i + 1)}`}
              slot={slot}
              stats={slotStats[i]}
            />
          ))}
          <TotalRow slotStats={slotStats} />
        </tbody>
      </table>
    </div>
  );
}

function SlotRow({
  name,
  slot,
  stats,
}: {
  readonly name: string;
  readonly slot: EquippedSlot;
  readonly stats: Stats | undefined;
}): React.JSX.Element {
  return (
    <tr className="border-b border-border-subtle/50">
      <td className="py-1.5 text-left">
        <span className="text-text-secondary">{name}</span>
        <span className="ml-1.5 text-text-muted truncate max-w-[120px] inline-block align-bottom">
          {slot.piece.name}
        </span>
      </td>
      {DISPLAY_STATS.map((stat) => {
        const value = stats?.[stat] ?? 0;
        return (
          <td
            key={stat}
            className={`py-1.5 px-2 text-right font-stat ${
              value > 0
                ? "text-stat-positive"
                : value < 0
                  ? "text-stat-negative"
                  : "text-text-muted"
            }`}
          >
            {value !== 0 ? (value > 0 ? `+${String(value)}` : String(value)) : "-"}
          </td>
        );
      })}
    </tr>
  );
}

function TotalRow({
  slotStats,
}: {
  readonly slotStats: readonly Stats[];
}): React.JSX.Element {
  // Sum up all slot stats
  const totals = sumStats(...slotStats);

  return (
    <tr className="bg-bg-elevated/50">
      <td className="py-1.5 text-left font-semibold text-accent-gold">Total</td>
      {DISPLAY_STATS.map((stat) => {
        const value = totals[stat];
        return (
          <td
            key={stat}
            className="py-1.5 px-2 text-right font-stat font-semibold text-text-primary"
          >
            {value}
          </td>
        );
      })}
    </tr>
  );
}
