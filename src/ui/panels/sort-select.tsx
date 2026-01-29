/**
 * SortSelect — dropdown for selecting sort order.
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------

export type SortOption =
  | "name-asc"
  | "name-desc"
  | "defense-desc"
  | "power-desc"
  | "set-name";

export const SORT_OPTIONS: readonly { readonly value: SortOption; readonly label: string }[] = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "defense-desc", label: "Defense (High-Low)" },
  { value: "power-desc", label: "Power (High-Low)" },
  { value: "set-name", label: "Set Name" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SortSelectProps {
  readonly value: SortOption;
  readonly onChange: (value: SortOption) => void;
}

const VALID_SORT_OPTIONS = new Set<string>(SORT_OPTIONS.map((o) => o.value));

function isSortOption(value: string): value is SortOption {
  return VALID_SORT_OPTIONS.has(value);
}

export function SortSelect({ value, onChange }: SortSelectProps): React.JSX.Element {
  return (
    <Select value={value} onValueChange={(v) => { if (isSortOption(v)) onChange(v); }}>
      <SelectTrigger className="w-[160px] h-8 text-xs">
        <SelectValue placeholder="Sort by..." />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// Sort functions
// ---------------------------------------------------------------------------

interface Sortable {
  readonly name: string;
  readonly setName?: string | undefined;
  readonly baseStats?: Partial<Record<string, number>> | undefined;
}

export function sortItems<T extends Sortable>(
  items: readonly T[],
  sortBy: SortOption,
): readonly T[] {
  const sorted = [...items];

  switch (sortBy) {
    case "name-asc":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name-desc":
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "defense-desc":
      sorted.sort((a, b) => (b.baseStats?.defense ?? 0) - (a.baseStats?.defense ?? 0));
      break;
    case "power-desc":
      sorted.sort((a, b) => (b.baseStats?.power ?? 0) - (a.baseStats?.power ?? 0));
      break;
    case "set-name":
      sorted.sort((a, b) => {
        const setCompare = (a.setName ?? "zzz").localeCompare(b.setName ?? "zzz");
        if (setCompare !== 0) return setCompare;
        return a.name.localeCompare(b.name);
      });
      break;
  }

  return sorted;
}
