/**
 * FilterChips — quick toggle filters for common equipment categories.
 */

import { Toggle } from "@/components/ui/toggle";

// ---------------------------------------------------------------------------
// Filter definitions
// ---------------------------------------------------------------------------

export type FilterChipId = "boss" | "dark-sea" | "sunken" | "craftable" | "user";

interface FilterChipDef {
  readonly id: FilterChipId;
  readonly label: string;
  readonly matcher: (source: string | undefined, isUserItem: boolean) => boolean;
}

const BOSS_SOURCES = new Set([
  "Cernyx", "Elius", "Calvus", "King Calvus", "Merlot", "Iris",
  "Commodore Kai", "Lady Carina", "Argos", "Maria", "Shura",
]);

export const FILTER_CHIPS: readonly FilterChipDef[] = [
  {
    id: "boss",
    label: "Boss Drops",
    matcher: (source) => source !== undefined && BOSS_SOURCES.has(source),
  },
  {
    id: "dark-sea",
    label: "Dark Sea",
    matcher: (source) => source?.toLowerCase().includes("dark sea") ?? false,
  },
  {
    id: "sunken",
    label: "Sunken",
    matcher: (source) => source?.toLowerCase().includes("sunken") ?? false,
  },
  {
    id: "craftable",
    label: "Craftable",
    matcher: (source) => source?.toLowerCase().includes("craft") ?? false,
  },
  {
    id: "user",
    label: "Custom",
    matcher: (_source, isUserItem) => isUserItem,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FilterChipsProps {
  readonly activeFilters: ReadonlySet<FilterChipId>;
  readonly onToggle: (id: FilterChipId) => void;
}

export function FilterChips({ activeFilters, onToggle }: FilterChipsProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-1">
      {FILTER_CHIPS.map((chip) => (
        <Toggle
          key={chip.id}
          size="sm"
          variant="outline"
          pressed={activeFilters.has(chip.id)}
          onPressedChange={() => { onToggle(chip.id); }}
          className="text-[10px] h-6 px-2"
        >
          {chip.label}
        </Toggle>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter logic
// ---------------------------------------------------------------------------

export function matchesActiveFilters(
  source: string | undefined,
  isUserItem: boolean,
  activeFilters: ReadonlySet<FilterChipId>,
): boolean {
  if (activeFilters.size === 0) return true;

  // Item matches if it matches ANY of the active filters (OR logic)
  for (const chip of FILTER_CHIPS) {
    if (activeFilters.has(chip.id) && chip.matcher(source, isUserItem)) {
      return true;
    }
  }
  return false;
}
