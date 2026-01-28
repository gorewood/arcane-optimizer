/**
 * BuildCard — displays a single search result as an expandable card.
 *
 * Collapsed: rank, score, item names.
 * Expanded: full stat breakdown with constraint satisfaction indicators.
 */

import { useState, useCallback } from "react";
import type {
  SearchResult,
  SoftConstraint,
  StatName,
  SlotType,
} from "@/models/types";
import { STAT_NAMES } from "@/search/stats";
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
    lines.push(`${label}: ${slot.piece.name}`);
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
