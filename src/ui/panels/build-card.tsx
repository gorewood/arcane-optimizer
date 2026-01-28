/**
 * BuildCard — displays a single search result as an expandable card.
 *
 * Collapsed: rank, score with grade, constraint pips, key stat values.
 * Expanded: slot contribution table + full stat breakdown with bars.
 */

import { useState, useCallback } from "react";
import type {
  EquipmentPiece,
  ExpandedEquipment,
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


// Stats grouped for expanded view display
type StatGroup = "combat" | "scaling" | "risk" | "defensive";

interface StatGroupConfig {
  readonly label: string;
  readonly stats: readonly StatName[];
}

const STAT_GROUPS: Record<StatGroup, StatGroupConfig> = {
  combat: { label: "Combat", stats: ["power", "pierce"] },
  scaling: { label: "Scaling", stats: ["size", "dexterity", "range", "haste"] },
  risk: { label: "Risk", stats: ["insanity", "warding", "drawback"] },
  defensive: { label: "Defensive", stats: ["defense", "regeneration", "resistance"] },
};

const STAT_GROUP_ORDER: readonly StatGroup[] = ["combat", "scaling", "risk", "defensive"];

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
// Variant helpers
// ---------------------------------------------------------------------------

function getAppliedVariant(piece: EquipmentPiece | ExpandedEquipment): string | undefined {
  if ("appliedVariant" in piece) {
    return piece.appliedVariant;
  }
  return undefined;
}

function formatPieceName(piece: EquipmentPiece | ExpandedEquipment): string {
  const variant = getAppliedVariant(piece);
  if (variant != null) {
    const capitalizedVariant = variant.charAt(0).toUpperCase() + variant.slice(1);
    return `${piece.name} (${capitalizedVariant})`;
  }
  return piece.name;
}

// ---------------------------------------------------------------------------
// Clipboard formatting
// ---------------------------------------------------------------------------

function formatBuildText(rank: number, result: SearchResult): string {
  const lines = [`Build #${String(rank)} (Score: ${result.score.toFixed(1)})`];

  for (const slot of result.loadout.slots) {
    const label = SLOT_LABELS[slot.piece.slot];
    const parts = [formatPieceName(slot.piece)];
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
// BuildCard helpers
// ---------------------------------------------------------------------------

function buildConstraintMap(constraints: readonly SoftConstraint[]): Map<StatName, SoftConstraint> {
  const map = new Map<StatName, SoftConstraint>();
  for (const c of constraints) map.set(c.stat, c);
  return map;
}

interface BuildCardProps {
  readonly rank: number;
  readonly result: SearchResult;
  readonly constraints: readonly SoftConstraint[];
  readonly disabled?: boolean;
  readonly expanded?: boolean;
  readonly onToggleExpanded?: () => void;
}

// ---------------------------------------------------------------------------
// BuildCard
// ---------------------------------------------------------------------------

export function BuildCard(props: BuildCardProps): React.JSX.Element {
  const { rank, result, constraints, disabled = false, expanded: controlledExpanded, onToggleExpanded } = props;
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;
  const constraintMap = buildConstraintMap(constraints);

  const handleCopy = useCallback(() => {
    if (disabled) return;
    void navigator.clipboard.writeText(formatBuildText(rank, result)).then(() => {
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 1500);
    });
  }, [rank, result, disabled]);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    if (isControlled && onToggleExpanded != null) onToggleExpanded();
    else setInternalExpanded((prev) => !prev);
  }, [disabled, isControlled, onToggleExpanded]);

  const cardClass = `border-border-default bg-bg-surface py-0 gap-0 transition-colors ${disabled ? "opacity-80" : "hover:border-border-accent/50"}`;
  return (
    <Card className={cardClass}>
      <CollapsedHeader rank={rank} result={result} constraints={constraints} expanded={expanded} onToggle={handleToggle} onCopy={handleCopy} copied={copied} disabled={disabled} />
      {!expanded && <CompactSlotList result={result} />}
      {expanded && (
        <>
          <Separator className="bg-border-subtle" />
          <ExpandedContent result={result} constraintMap={constraintMap} />
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
  disabled,
}: {
  readonly rank: number;
  readonly result: SearchResult;
  readonly constraints: readonly SoftConstraint[];
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly onCopy: () => void;
  readonly copied: boolean;
  readonly disabled: boolean;
}): React.JSX.Element {
  const clickableClass = disabled
    ? "cursor-default"
    : "cursor-pointer hover:bg-border-subtle/30";

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 flex-wrap rounded-t-lg transition-colors ${clickableClass}`}
      onClick={onToggle}
    >
      <span className="text-accent-gold font-bold text-base min-w-[1.5rem]">
        #{String(rank)}
      </span>
      <CompactScore score={result.score} stats={result.stats} constraints={constraints} />
      <ConstraintPips stats={result.stats} constraints={constraints} />
      <KeyStatsDisplay stats={result.stats} />
      {!disabled && <HeaderActions expanded={expanded} onCopy={onCopy} copied={copied} />}
    </div>
  );
}

function KeyStatsDisplay({ stats }: { readonly stats: SearchResult["stats"] }): React.JSX.Element {
  // Show all non-zero stats in the collapsed header
  const nonZeroStats = STAT_NAMES.filter((stat) => stats[stat] !== 0);
  return (
    <div className="hidden sm:flex items-center gap-2 ml-2 flex-wrap">
      {nonZeroStats.map((stat) => (
        <span key={stat} className="text-[10px] text-text-secondary">
          <span className="text-text-muted">{STAT_LABELS[stat]}</span>{" "}
          <span className="font-stat">{stats[stat]}</span>
        </span>
      ))}
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
      {result.loadout.slots.map((slot, i) => {
        const variant = getAppliedVariant(slot.piece);
        return (
          <div key={i} className="flex items-center gap-1.5 text-[11px]">
            <Badge variant="outline" className="px-1.5 py-0 text-[9px] shrink-0 w-10 justify-center">
              {SLOT_LABELS[slot.piece.slot]}
            </Badge>
            <span className="text-text-primary">{slot.piece.name}</span>
            {variant != null && (
              <span className="text-accent-teal capitalize">({variant})</span>
            )}
            {slot.enchantment != null && (
              <span className="text-accent-amber">[{slot.enchantment.name}]</span>
            )}
            {slot.modifier != null && (
              <span className="text-text-muted">({slot.modifier.name})</span>
            )}
            {slot.gems.length > 0 && (
              <span className="text-accent-ember">
                {slot.gems.map((g) => g.name).join(", ")}
              </span>
            )}
          </div>
        );
      })}
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
      {/* Stat bars - grouped in 4 columns */}
      <div>
        <h4 className="text-xs font-semibold text-accent-gold mb-2">
          Total Stats
        </h4>
        <div className="grid grid-cols-4 gap-x-3 gap-y-1">
          {STAT_GROUP_ORDER.map((groupKey) => {
            const group = STAT_GROUPS[groupKey];
            return (
              <div key={groupKey} className="space-y-1">
                <span className="text-[10px] font-medium text-text-muted">{group.label}</span>
                {group.stats.map((stat) => (
                  <StatBar
                    key={stat}
                    stat={stat}
                    value={result.stats[stat]}
                    max={STAT_MAX_VALUES[stat]}
                    constraint={constraintMap.get(stat)}
                    group={groupKey}
                  />
                ))}
              </div>
            );
          })}
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
