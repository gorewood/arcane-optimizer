/**
 * BuildCard — displays a single search result as an expandable card.
 *
 * Collapsed: rank, score with grade, constraint pips, key stat values.
 * Expanded: slot contribution table + full stat breakdown with bars.
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
import { CompactScore } from "./score-display";
import { ConstraintPips } from "./constraint-pips";
import { SlotContributionTable } from "./slot-contribution-table";
import { StatBar } from "./stat-bar";
import { STAT_LABELS } from "./stat-indicator";

// ---------------------------------------------------------------------------
// Slot display labels
// ---------------------------------------------------------------------------

const SLOT_LABELS: Record<SlotType, string> = {
  chestplate: "Chest",
  leggings: "Legs",
  accessory: "Acc",
  "accessory-H": "Helm",
  "accessory-A": "Amul",
};

// Key stats to show in collapsed view
const COLLAPSED_STATS: readonly StatName[] = [
  "power",
  "defense",
  "size",
  "dexterity",
  "insanity",
];

// Stats to show bars for in expanded view
const EXPANDED_STATS: readonly StatName[] = [
  "power",
  "defense",
  "size",
  "dexterity",
  "range",
  "haste",
  "insanity",
  "warding",
];

// Max values for stat bars (approximate game maximums)
const STAT_MAX_VALUES: Record<StatName, number> = {
  power: 200,
  defense: 1000,
  size: 400,
  dexterity: 400,
  range: 400,
  haste: 400,
  insanity: 10,
  warding: 10,
  drawback: 10,
  regeneration: 100,
  pierce: 100,
  resistance: 100,
};

// ---------------------------------------------------------------------------
// Clipboard formatting
// ---------------------------------------------------------------------------

function formatBuildText(rank: number, result: SearchResult): string {
  const lines = [`Build #${String(rank)} (Score: ${result.score.toFixed(1)})`];

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
    <Card className="border-border-default bg-bg-surface py-0 gap-0 transition-colors hover:border-border-accent/50">
      {/* Collapsed header row */}
      <CollapsedHeader
        rank={rank}
        result={result}
        constraints={constraints}
        expanded={expanded}
        onToggle={() => { setExpanded((prev) => !prev); }}
        onCopy={handleCopy}
        copied={copied}
      />

      {/* Collapsed: compact slot list */}
      {!expanded && <CompactSlotList result={result} />}

      {/* Expanded: detailed breakdown */}
      {expanded && (
        <>
          <Separator className="bg-border-subtle" />
          <ExpandedContent
            result={result}
            constraintMap={constraintMap}
          />
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// CollapsedHeader — rank, score, pips, key stats
// ---------------------------------------------------------------------------

function CollapsedHeader({
  rank,
  result,
  constraints,
  expanded,
  onToggle,
  onCopy,
  copied,
}: {
  readonly rank: number;
  readonly result: SearchResult;
  readonly constraints: readonly SoftConstraint[];
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly onCopy: () => void;
  readonly copied: boolean;
}): React.JSX.Element {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 flex-wrap cursor-pointer"
      onClick={onToggle}
    >
      <span className="text-accent-gold font-bold text-base min-w-[1.5rem]">
        #{String(rank)}
      </span>
      <CompactScore score={result.score} stats={result.stats} constraints={constraints} />
      <ConstraintPips stats={result.stats} constraints={constraints} />
      <KeyStatsDisplay stats={result.stats} />
      <HeaderActions expanded={expanded} onCopy={onCopy} copied={copied} />
    </div>
  );
}

function KeyStatsDisplay({ stats }: { readonly stats: SearchResult["stats"] }): React.JSX.Element {
  return (
    <div className="hidden sm:flex items-center gap-2 ml-2">
      {COLLAPSED_STATS.map((stat) => {
        const value = stats[stat];
        if (value === 0) return null;
        return (
          <span key={stat} className="text-[10px] text-text-secondary">
            <span className="text-text-muted">{STAT_LABELS[stat]}</span>{" "}
            <span className="font-stat">{value}</span>
          </span>
        );
      })}
    </div>
  );
}

function HeaderActions({
  expanded,
  onCopy,
  copied,
}: {
  readonly expanded: boolean;
  readonly onCopy: () => void;
  readonly copied: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 ml-auto">
      <span className="text-text-muted text-[10px]">{expanded ? "collapse" : "expand"}</span>
      <Button
        variant="ghost"
        size="xs"
        className="text-text-secondary hover:text-accent-gold h-6 px-2"
        onClick={(e) => { e.stopPropagation(); onCopy(); }}
      >
        {copied ? "Copied!" : "Copy"}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CompactSlotList — slot summary with full item names
// ---------------------------------------------------------------------------

function CompactSlotList({
  result,
}: {
  readonly result: SearchResult;
}): React.JSX.Element {
  return (
    <div className="px-3 pb-2 space-y-0.5">
      {result.loadout.slots.map((slot, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[11px]">
          <Badge variant="outline" className="px-1.5 py-0 text-[9px] shrink-0 w-10 justify-center">
            {SLOT_LABELS[slot.piece.slot]}
          </Badge>
          <span className="text-text-primary">{slot.piece.name}</span>
          {slot.enchantment != null && (
            <span className="text-accent-amber">[{slot.enchantment.name}]</span>
          )}
          {slot.modifier != null && (
            <span className="text-text-muted">({slot.modifier.name})</span>
          )}
          {slot.gems.length > 0 && (
            <span className="text-accent-ember">{slot.gems.length} gem{slot.gems.length > 1 ? "s" : ""}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExpandedContent — stat bars + contribution table
// ---------------------------------------------------------------------------

function ExpandedContent({
  result,
  constraintMap,
}: {
  readonly result: SearchResult;
  readonly constraintMap: ReadonlyMap<StatName, SoftConstraint>;
}): React.JSX.Element {
  return (
    <div className="px-3 py-3 space-y-4">
      {/* Stat bars */}
      <div>
        <h4 className="text-xs font-semibold text-accent-gold mb-2">
          Total Stats
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {EXPANDED_STATS.map((stat) => (
            <StatBar
              key={stat}
              stat={stat}
              value={result.stats[stat]}
              max={STAT_MAX_VALUES[stat]}
              constraint={constraintMap.get(stat)}
            />
          ))}
        </div>
      </div>

      {/* Slot contribution table */}
      <div>
        <h4 className="text-xs font-semibold text-accent-gold mb-2">
          Per-Slot Contribution
        </h4>
        <SlotContributionTable
          loadout={result.loadout}
          atlanteanChoices={result.atlanteanChoices}
        />
      </div>
    </div>
  );
}
