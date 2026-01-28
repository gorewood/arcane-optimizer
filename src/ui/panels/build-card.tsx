/**
 * BuildCard — displays a single search result as an expandable card.
 *
 * Collapsed: rank, score, item names with augment badges.
 * Expanded: per-slot detail (equipment, enchantment, modifier, gems,
 *           Atlantean bonus) and full stat breakdown with constraint indicators.
 */

import { useState, useCallback } from "react";
import type {
  EquippedSlot,
  SearchResult,
  SoftConstraint,
  StatName,
  SlotType,
} from "@/models/types";
import { STAT_NAMES } from "@/search/stats";
import { computeSlotStats } from "@/search/constraints";
import { resolveAtlanteanBonus, ATLANTEAN_BONUS_VALUES } from "@/search/stats";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatIndicator } from "./stat-indicator";

// ---------------------------------------------------------------------------
// Slot display labels
// ---------------------------------------------------------------------------

const SLOT_LABELS: Record<SlotType, string> = {
  chestplate: "Chestplate",
  leggings: "Leggings",
  accessory: "Accessory",
  "accessory-H": "Helmet",
  "accessory-A": "Amulet",
};

// ---------------------------------------------------------------------------
// Clipboard formatting
// ---------------------------------------------------------------------------

function formatBuildText(rank: number, result: SearchResult): string {
  const lines = [`Build #${String(rank)} (Score: ${String(result.score)})`];

  for (const slot of result.loadout.slots) {
    const label = SLOT_LABELS[slot.piece.slot];
    const parts = [slot.piece.name];
    if (slot.enchantment != null) parts.push(`[${slot.enchantment.name}]`);
    if (slot.modifier != null) parts.push(`(${slot.modifier.name})`);
    if (slot.gems.length > 0) {
      parts.push(`{${slot.gems.map((g) => g.name).join(", ")}}`);
    }
    lines.push(`${label}: ${parts.join(" ")}`);
  }

  const statParts = STAT_NAMES.filter((s) => result.stats[s] !== 0).map(
    (s) => `${s}=${String(result.stats[s])}`,
  );
  lines.push(`Stats: ${statParts.join(", ")}`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// BuildCard
// ---------------------------------------------------------------------------

export function BuildCard({
  rank,
  result,
  constraints,
}: {
  readonly rank: number;
  readonly result: SearchResult;
  readonly constraints: readonly SoftConstraint[];
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const constraintMap = new Map<StatName, SoftConstraint>();
  for (const c of constraints) {
    constraintMap.set(c.stat, c);
  }

  const handleCopy = useCallback(() => {
    const text = formatBuildText(rank, result);
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    });
  }, [rank, result]);

  return (
    <Card
      className="cursor-pointer border-border-default bg-bg-surface py-0 gap-0"
      onClick={() => {
        setExpanded((prev) => !prev);
      }}
    >
      <CardHeader
        rank={rank}
        score={result.score}
        expanded={expanded}
        onCopy={handleCopy}
        copied={copied}
      />
      <SlotList slots={result.loadout.slots} />
      {expanded && (
        <>
          <Separator className="bg-border-subtle" />
          <SlotDetailList
            slots={result.loadout.slots}
            atlanteanChoices={result.atlanteanChoices}
          />
          <Separator className="bg-border-subtle" />
          <StatBreakdown
            stats={result.stats}
            constraintMap={constraintMap}
          />
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// CardHeader (internal)
// ---------------------------------------------------------------------------

function CardHeader({
  rank,
  score,
  expanded,
  onCopy,
  copied,
}: {
  readonly rank: number;
  readonly score: number;
  readonly expanded: boolean;
  readonly onCopy: (e: React.MouseEvent) => void;
  readonly copied: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-accent-gold font-bold text-lg min-w-[2rem]">
        #{String(rank)}
      </span>
      <span className="font-stat text-text-primary text-sm">
        Score: <span className="text-accent-amber font-semibold">{score}</span>
      </span>
      <span className="text-text-muted text-xs ml-1">
        {expanded ? "click to collapse" : "click to expand"}
      </span>
      <Button
        variant="ghost"
        size="xs"
        className="ml-auto text-text-secondary hover:text-accent-gold"
        onClick={(e) => {
          e.stopPropagation();
          onCopy(e);
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SlotList — compact item name list
// ---------------------------------------------------------------------------

function SlotList({
  slots,
}: {
  readonly slots: SearchResult["loadout"]["slots"];
}): React.JSX.Element {
  return (
    <div className="px-4 pb-3 space-y-1">
      {slots.map((slot, i) => (
        <div key={i} className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="px-1.5 py-0 text-[10px] font-medium text-text-secondary min-w-[4.5rem] justify-center"
          >
            {SLOT_LABELS[slot.piece.slot]}
          </Badge>
          <span className="text-text-primary text-xs truncate">
            {slot.piece.name}
          </span>
          <AugmentBadges slot={slot} />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AugmentBadges — enchantment/modifier/gem badges
// ---------------------------------------------------------------------------

function AugmentBadges({
  slot,
}: {
  readonly slot: SearchResult["loadout"]["slots"][number];
}): React.JSX.Element {
  return (
    <span className="flex gap-1 ml-auto shrink-0">
      {slot.enchantment != null && (
        <Badge
          variant="secondary"
          className="px-1 py-0 text-[9px] text-text-muted"
        >
          {slot.enchantment.name}
        </Badge>
      )}
      {slot.modifier != null && (
        <Badge
          variant="secondary"
          className="px-1 py-0 text-[9px] text-text-muted"
        >
          {slot.modifier.name}
        </Badge>
      )}
      {slot.gems.length > 0 && (
        <Badge
          variant="secondary"
          className="px-1 py-0 text-[9px] text-text-muted"
        >
          {String(slot.gems.length)} gem{slot.gems.length > 1 ? "s" : ""}
        </Badge>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SlotDetailList — per-slot breakdown (expanded view)
// ---------------------------------------------------------------------------

function SlotDetailList({
  slots,
  atlanteanChoices,
}: {
  readonly slots: SearchResult["loadout"]["slots"];
  readonly atlanteanChoices?: ReadonlyMap<number, StatName> | undefined;
}): React.JSX.Element {
  return (
    <div className="px-4 py-3 space-y-3">
      <h4 className="text-xs font-semibold text-accent-gold">
        Slot Details
      </h4>
      {slots.map((slot, i) => (
        <SlotDetail
          key={i}
          slot={slot}
          slotIndex={i}
          atlanteanChoice={atlanteanChoices?.get(i)}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SlotDetail — single slot detail
// ---------------------------------------------------------------------------

function SlotDetail({
  slot,
  slotIndex,
  atlanteanChoice,
}: {
  readonly slot: EquippedSlot;
  readonly slotIndex: number;
  readonly atlanteanChoice?: StatName | undefined;
}): React.JSX.Element {
  const slotStats = computeSlotStats(slot);
  const hasEnhancements =
    slot.enchantment != null || slot.modifier != null || slot.gems.length > 0;

  return (
    <div className="rounded-md border border-border-subtle bg-bg-base p-2 space-y-1">
      <SlotDetailHeader slot={slot} slotIndex={slotIndex} />
      {hasEnhancements && (
        <SlotEnhancementLines slot={slot} atlanteanChoice={atlanteanChoice} />
      )}
      <SlotStatSummary stats={slotStats} atlanteanChoice={atlanteanChoice} slot={slot} />
    </div>
  );
}

function SlotDetailHeader({
  slot,
  slotIndex,
}: {
  readonly slot: EquippedSlot;
  readonly slotIndex: number;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className="px-1.5 py-0 text-[10px] font-medium text-text-secondary min-w-[4.5rem] justify-center"
      >
        {SLOT_LABELS[slot.piece.slot]}
      </Badge>
      <span className="text-text-primary text-xs font-semibold">
        {slot.piece.name}
      </span>
      <span className="text-text-muted text-[10px] ml-auto">
        Slot {String(slotIndex + 1)}
      </span>
    </div>
  );
}

function SlotEnhancementLines({
  slot,
  atlanteanChoice,
}: {
  readonly slot: EquippedSlot;
  readonly atlanteanChoice?: StatName | undefined;
}): React.JSX.Element {
  return (
    <div className="pl-2 space-y-0.5">
      {slot.enchantment != null && (
        <DetailLine
          label="Enchant"
          value={slot.enchantment.name}
          stats={slot.enchantment.stats}
        />
      )}
      {slot.modifier != null && (
        <DetailLine
          label="Modifier"
          value={slot.modifier.name}
          stats={slot.modifier.stats}
        />
      )}
      {atlanteanChoice != null && (
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-text-muted min-w-[3.5rem]">Atlantean</span>
          <span className="text-accent-amber">
            +{String(ATLANTEAN_BONUS_VALUES[atlanteanChoice])} {atlanteanChoice}
          </span>
        </div>
      )}
      {slot.gems.length > 0 && (
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-text-muted min-w-[3.5rem]">Gems</span>
          <span className="text-text-secondary">
            {slot.gems.map((g) => g.name).join(", ")}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DetailLine — label + value + stat summary
// ---------------------------------------------------------------------------

function DetailLine({
  label,
  value,
  stats,
}: {
  readonly label: string;
  readonly value: string;
  readonly stats: Partial<Record<StatName, number>>;
}): React.JSX.Element {
  const statParts = STAT_NAMES.filter((s) => (stats[s] ?? 0) !== 0)
    .map((s) => `${s[0]?.toUpperCase() ?? ""}${s.slice(1)} +${String(stats[s] ?? 0)}`);

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-text-muted min-w-[3.5rem]">{label}</span>
      <span className="text-text-primary">{value}</span>
      {statParts.length > 0 && (
        <span className="text-text-muted">
          ({statParts.join(", ")})
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SlotStatSummary — per-slot total stats
// ---------------------------------------------------------------------------

function SlotStatSummary({
  stats,
  atlanteanChoice,
  slot,
}: {
  readonly stats: Partial<Record<StatName, number>>;
  readonly atlanteanChoice?: StatName | undefined;
  readonly slot: EquippedSlot;
}): React.JSX.Element {
  // Add atlantean bonus to slot stats for display
  let displayStats = { ...stats };
  if (atlanteanChoice != null && slot.modifier?.atlanteanBehavior != null) {
    const bonus = resolveAtlanteanBonus(slot, atlanteanChoice);
    for (const key of STAT_NAMES) {
      const current = displayStats[key] ?? 0;
      const bonusVal = bonus[key] ?? 0;
      if (bonusVal !== 0) {
        displayStats = { ...displayStats, [key]: current + bonusVal };
      }
    }
  }

  const nonZero = STAT_NAMES.filter((s) => (displayStats[s] ?? 0) !== 0);
  if (nonZero.length === 0) return <></>;

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-0.5">
      {nonZero.map((s) => (
        <span key={s} className="text-[10px] text-text-secondary">
          <span className="text-text-muted">{s}:</span>{" "}
          <span className="font-stat">{String(displayStats[s] ?? 0)}</span>
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatBreakdown — full stat grid with constraint indicators
// ---------------------------------------------------------------------------

function StatBreakdown({
  stats,
  constraintMap,
}: {
  readonly stats: SearchResult["stats"];
  readonly constraintMap: ReadonlyMap<StatName, SoftConstraint>;
}): React.JSX.Element {
  const nonZeroStats = STAT_NAMES.filter((s) => stats[s] !== 0);

  return (
    <div className="px-4 py-3">
      <h4 className="text-xs font-semibold text-accent-gold mb-2">
        Total Stats
      </h4>
      <div className="grid grid-cols-3 gap-x-4 gap-y-1">
        {nonZeroStats.map((stat) => (
          <StatIndicator
            key={stat}
            stat={stat}
            value={stats[stat]}
            constraint={constraintMap.get(stat)}
          />
        ))}
      </div>
    </div>
  );
}
