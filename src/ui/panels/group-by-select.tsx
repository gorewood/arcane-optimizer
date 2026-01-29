/**
 * GroupBySelect — dropdown for selecting grouping mode.
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Group options
// ---------------------------------------------------------------------------

export type GroupByOption = "none" | "set" | "slot" | "source";

export const GROUP_BY_OPTIONS: readonly { readonly value: GroupByOption; readonly label: string }[] = [
  { value: "none", label: "No Grouping" },
  { value: "set", label: "By Set" },
  { value: "slot", label: "By Slot" },
  { value: "source", label: "By Source" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface GroupBySelectProps {
  readonly value: GroupByOption;
  readonly onChange: (value: GroupByOption) => void;
}

const VALID_GROUP_OPTIONS = new Set<string>(GROUP_BY_OPTIONS.map((o) => o.value));

function isGroupByOption(value: string): value is GroupByOption {
  return VALID_GROUP_OPTIONS.has(value);
}

export function GroupBySelect({ value, onChange }: GroupBySelectProps): React.JSX.Element {
  return (
    <Select value={value} onValueChange={(v) => { if (isGroupByOption(v)) onChange(v); }}>
      <SelectTrigger className="w-[130px] h-8 text-xs">
        <SelectValue placeholder="Group by..." />
      </SelectTrigger>
      <SelectContent>
        {GROUP_BY_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
