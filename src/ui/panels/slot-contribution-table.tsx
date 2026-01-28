/**
 * SlotContributionTable — per-slot stat breakdown table.
 *
 * Shows how each equipped slot contributes to the total stats.
 * Split columns for slot type and item name, with expandable
 * enchant/modifier/gem details.
 */

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { EquippedSlot, Loadout, StatName, Stats } from "@/models/types";
import { computeSlotStats } from "@/search/constraints";
import { resolveAtlanteanBonus, sumStats, ATLANTEAN_BONUS_VALUES } from "@/search/stats";
import { STAT_LABELS } from "./stat-indicator";

// Stats to display in the contribution table (core stats only)
const DISPLAY_STATS: readonly StatName[] = [
  "power",
  "defense",
  "size",
  "dexterity",
  "insanity",
  "warding",
];

const SLOT_LABELS = ["Chest", "Legs", "Acc 1", "Acc 2", "Acc 3"] as const;

interface SlotContributionTableProps {
  readonly loadout: Loadout;
  readonly atlanteanChoices?: ReadonlyMap<number, StatName> | undefined;
}

export function SlotContributionTable({
  loadout,
  atlanteanChoices,
}: SlotContributionTableProps): React.JSX.Element {
  const [expandedSlots, setExpandedSlots] = useState<ReadonlySet<number>>(new Set());

  const toggleSlot = (index: number): void => {
    setExpandedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

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
            <th className="py-1.5 pr-3 w-14 text-left font-medium text-text-muted">Slot</th>
            <th className="py-1.5 text-left font-medium text-text-muted">Item</th>
            {DISPLAY_STATS.map((stat) => (
              <th key={stat} className="py-1.5 px-1.5 text-right font-medium text-text-muted">
                {STAT_LABELS[stat]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loadout.slots.map((slot, i) => (
            <SlotRows
              key={i}
              label={SLOT_LABELS[i] ?? `Slot ${String(i + 1)}`}
              slot={slot}
              stats={slotStats[i]}
              atlanteanChoice={atlanteanChoices?.get(i)}
              expanded={expandedSlots.has(i)}
              onToggle={() => { toggleSlot(i); }}
            />
          ))}
          <TotalRow slotStats={slotStats} />
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SlotRows — main row + optional detail rows
// ---------------------------------------------------------------------------

function SlotRows({
  label,
  slot,
  stats,
  atlanteanChoice,
  expanded,
  onToggle,
}: {
  readonly label: string;
  readonly slot: EquippedSlot;
  readonly stats: Stats | undefined;
  readonly atlanteanChoice?: StatName | undefined;
  readonly expanded: boolean;
  readonly onToggle: () => void;
}): React.JSX.Element {
  const hasDetails =
    slot.enchantment != null || slot.modifier != null || slot.gems.length > 0;

  return (
    <>
      <tr
        className={`border-b border-border-subtle/50 ${hasDetails ? "cursor-pointer hover:bg-bg-elevated/30" : ""}`}
        onClick={hasDetails ? onToggle : undefined}
      >
        <td className="py-1.5 pr-3 text-left text-text-muted">
          <span className="flex items-center gap-1">
            {hasDetails && (
              <ChevronRight
                className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
              />
            )}
            {label}
          </span>
        </td>
        <td className="py-1.5 text-left text-text-primary">{slot.piece.name}</td>
        {DISPLAY_STATS.map((stat) => <StatCell key={stat} value={stats?.[stat] ?? 0} />)}
      </tr>
      {expanded && hasDetails && (
        <DetailRows slot={slot} atlanteanChoice={atlanteanChoice} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// DetailRows — enchantment, modifier, gems, atlantean bonus
// ---------------------------------------------------------------------------

function DetailRows({
  slot,
  atlanteanChoice,
}: {
  readonly slot: EquippedSlot;
  readonly atlanteanChoice?: StatName | undefined;
}): React.JSX.Element {
  return (
    <>
      {slot.enchantment != null && (
        <tr className="bg-bg-elevated/20">
          <td className="py-0.5 pl-5 text-[10px] text-text-muted">Ench</td>
          <td className="py-0.5 text-[10px] text-accent-amber">{slot.enchantment.name}</td>
          {DISPLAY_STATS.map((stat) => (
            <StatCell key={stat} value={slot.enchantment?.stats[stat] ?? 0} small />
          ))}
        </tr>
      )}
      {slot.modifier != null && (
        <tr className="bg-bg-elevated/20">
          <td className="py-0.5 pl-5 text-[10px] text-text-muted">Mod</td>
          <td className="py-0.5 text-[10px] text-accent-amber">{slot.modifier.name}</td>
          {DISPLAY_STATS.map((stat) => (
            <StatCell key={stat} value={slot.modifier?.stats[stat] ?? 0} small />
          ))}
        </tr>
      )}
      {atlanteanChoice != null && (
        <tr className="bg-bg-elevated/20">
          <td className="py-0.5 pl-5 text-[10px] text-text-muted">Atl</td>
          <td className="py-0.5 text-[10px] text-accent-gold">+{atlanteanChoice}</td>
          {DISPLAY_STATS.map((stat) => (
            <StatCell
              key={stat}
              value={stat === atlanteanChoice ? ATLANTEAN_BONUS_VALUES[stat] : 0}
              small
            />
          ))}
        </tr>
      )}
      {slot.gems.length > 0 && slot.gems.map((gem, gi) => (
        <tr key={gi} className="bg-bg-elevated/20">
          <td className="py-0.5 pl-5 text-[10px] text-text-muted">{gi === 0 ? "Gem" : ""}</td>
          <td className="py-0.5 text-[10px] text-accent-ember">{gem.name}</td>
          {DISPLAY_STATS.map((stat) => (
            <StatCell key={stat} value={gem.stats[stat] ?? 0} small />
          ))}
        </tr>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// StatCell — stat value cell with coloring
// ---------------------------------------------------------------------------

function StatCell({
  value,
  small = false,
}: {
  readonly value: number;
  readonly small?: boolean;
}): React.JSX.Element {
  const colorClass =
    value > 0 ? "text-stat-positive" : value < 0 ? "text-stat-negative" : "text-text-muted";
  const sizeClass = small ? "text-[10px] py-0.5" : "py-1.5";

  return (
    <td className={`px-1.5 text-right font-stat ${colorClass} ${sizeClass}`}>
      {value !== 0 ? (value > 0 ? `+${String(value)}` : String(value)) : "-"}
    </td>
  );
}

// ---------------------------------------------------------------------------
// TotalRow
// ---------------------------------------------------------------------------

function TotalRow({
  slotStats,
}: {
  readonly slotStats: readonly Stats[];
}): React.JSX.Element {
  const totals = sumStats(...slotStats);

  return (
    <tr className="bg-bg-elevated/50">
      <td className="py-1.5 text-left font-semibold text-accent-gold" colSpan={2}>
        Total
      </td>
      {DISPLAY_STATS.map((stat) => (
        <td key={stat} className="py-1.5 px-1.5 text-right font-stat font-semibold text-text-primary">
          {totals[stat]}
        </td>
      ))}
    </tr>
  );
}
