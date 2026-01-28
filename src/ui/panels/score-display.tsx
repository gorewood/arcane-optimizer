/**
 * ScoreDisplay — score + letter grade + satisfaction percentage.
 *
 * Shows the numeric score prominently, with a letter grade (S/A/B/C/D/F)
 * based on constraint satisfaction ratio.
 */

import type { SoftConstraint, Stats } from "@/models/types";
import { countSatisfactionLevels } from "./constraint-pips";

interface ScoreDisplayProps {
  readonly score: number;
  readonly stats: Stats;
  readonly constraints: readonly SoftConstraint[];
}

type Grade = "S" | "A" | "B" | "C" | "D" | "F";

const GRADE_COLORS: Record<Grade, string> = {
  S: "text-accent-gold",
  A: "text-stat-positive",
  B: "text-stat-positive/80",
  C: "text-stat-warning",
  D: "text-stat-warning/80",
  F: "text-stat-negative",
};

function calculateGrade(satisfiedPct: number): Grade {
  if (satisfiedPct >= 100) return "S";
  if (satisfiedPct >= 90) return "A";
  if (satisfiedPct >= 75) return "B";
  if (satisfiedPct >= 60) return "C";
  if (satisfiedPct >= 40) return "D";
  return "F";
}

export function ScoreDisplay({
  score,
  stats,
  constraints,
}: ScoreDisplayProps): React.JSX.Element {
  const { positive, warning } = countSatisfactionLevels(stats, constraints);
  const total = constraints.length;

  // Count positive + warning as "satisfied" for grading
  const satisfiedCount = positive + warning;
  const satisfiedPct = total > 0 ? (satisfiedCount / total) * 100 : 100;
  const grade = calculateGrade((positive / Math.max(total, 1)) * 100);
  const gradeColor = GRADE_COLORS[grade];

  return (
    <div className="flex items-baseline gap-2">
      <span className="font-stat text-lg text-accent-gold">{score.toFixed(1)}</span>
      <span className={`text-sm font-bold ${gradeColor}`}>{grade}</span>
      <span className="text-xs text-text-muted">
        ({satisfiedPct.toFixed(0)}% met)
      </span>
    </div>
  );
}

/**
 * Compact score display for inline use in card headers.
 */
export function CompactScore({
  score,
  stats,
  constraints,
}: ScoreDisplayProps): React.JSX.Element {
  const { positive } = countSatisfactionLevels(stats, constraints);
  const total = constraints.length;
  const grade = calculateGrade((positive / Math.max(total, 1)) * 100);
  const gradeColor = GRADE_COLORS[grade];

  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-stat text-sm text-accent-gold">{score.toFixed(1)}</span>
      <span className={`text-xs font-bold ${gradeColor}`}>{grade}</span>
    </span>
  );
}
