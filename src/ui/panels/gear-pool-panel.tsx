/**
 * GearPoolPanel — main panel for configuring which equipment, enchantments,
 * modifiers, and gems are available to the optimizer.
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { EquipmentPiece, Enchantment, Modifier, Gem } from "@/models/types";
import { useGearPoolStore } from "@/stores/gear-pool-store";
import { useUserDataStore } from "@/stores/user-data-store";
import { SortSelect, type SortOption } from "./sort-select";
import { GroupBySelect, type GroupByOption } from "./group-by-select";
import { EquipmentSection } from "./equipment-section";
import { EnchantmentSection } from "./enchantment-section";
import { ModifierSection } from "./modifier-section";
import { GemSection } from "./gem-section";

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

interface MergedGearData {
  readonly equipment: readonly EquipmentPiece[];
  readonly enchantments: readonly Enchantment[];
  readonly modifiers: readonly Modifier[];
  readonly gems: readonly Gem[];
}

function useMergedGearData(): MergedGearData {
  const getMergedEquipment = useUserDataStore((s) => s.getMergedEquipment);
  const getMergedEnchantments = useUserDataStore((s) => s.getMergedEnchantments);
  const getMergedModifiers = useUserDataStore((s) => s.getMergedModifiers);
  const getMergedGems = useUserDataStore((s) => s.getMergedGems);

  return {
    equipment: useMemo(() => getMergedEquipment().filter((m) => !m.isDeleted).map((m) => m.item), [getMergedEquipment]),
    enchantments: useMemo(() => getMergedEnchantments().filter((m) => !m.isDeleted).map((m) => m.item), [getMergedEnchantments]),
    modifiers: useMemo(() => getMergedModifiers().filter((m) => !m.isDeleted).map((m) => m.item), [getMergedModifiers]),
    gems: useMemo(() => getMergedGems().filter((m) => !m.isDeleted).map((m) => m.item), [getMergedGems]),
  };
}

// ---------------------------------------------------------------------------
// GearPoolPanel
// ---------------------------------------------------------------------------

export function GearPoolPanel(): React.JSX.Element {
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("set-name");
  const [groupBy, setGroupBy] = useState<GroupByOption>("set");
  const enableAll = useGearPoolStore((s) => s.enableAll);
  const disableAll = useGearPoolStore((s) => s.disableAll);
  const { equipment, enchantments, modifiers, gems } = useMergedGearData();

  return (
    <div className="space-y-4 p-4">
      <PanelHeader
        filter={filter}
        onFilterChange={setFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        onEnableAll={enableAll}
        onDisableAll={disableAll}
      />
      <Tabs defaultValue="equipment">
        <TabsList variant="line">
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="enchantments">Enchantments</TabsTrigger>
          <TabsTrigger value="modifiers">Modifiers</TabsTrigger>
          <TabsTrigger value="gems">Gems</TabsTrigger>
        </TabsList>
        <TabsContent value="equipment">
          <EquipmentSection equipment={equipment} filter={filter} sortBy={sortBy} groupBy={groupBy} />
        </TabsContent>
        <TabsContent value="enchantments">
          <EnchantmentSection enchantments={enchantments} filter={filter} sortBy={sortBy} />
        </TabsContent>
        <TabsContent value="modifiers">
          <ModifierSection modifiers={modifiers} filter={filter} sortBy={sortBy} />
        </TabsContent>
        <TabsContent value="gems">
          <GemSection gems={gems} filter={filter} sortBy={sortBy} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PanelHeader — title, bulk actions, search
// ---------------------------------------------------------------------------

function PanelHeader({
  filter,
  onFilterChange,
  sortBy,
  onSortChange,
  groupBy,
  onGroupByChange,
  onEnableAll,
  onDisableAll,
}: {
  readonly filter: string;
  readonly onFilterChange: (value: string) => void;
  readonly sortBy: SortOption;
  readonly onSortChange: (value: SortOption) => void;
  readonly groupBy: GroupByOption;
  readonly onGroupByChange: (value: GroupByOption) => void;
  readonly onEnableAll: () => void;
  readonly onDisableAll: () => void;
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-text-primary">
          Gear Pool Configuration
        </h2>
        <div className="flex gap-1.5 ml-auto">
          <Button variant="outline" size="xs" onClick={onEnableAll}>
            Enable All
          </Button>
          <Button variant="outline" size="xs" onClick={onDisableAll}>
            Disable All
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SearchInput value={filter} onChange={onFilterChange} />
        <SortSelect value={sortBy} onChange={onSortChange} />
        <GroupBySelect value={groupBy} onChange={onGroupByChange} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SearchInput
// ---------------------------------------------------------------------------

function SearchInput({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none">
        Search
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        placeholder="Filter by name..."
        className="w-full rounded-md border border-border-default bg-bg-surface px-2 py-1.5 pl-16 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-gold focus:outline-none focus:ring-1 focus:ring-accent-gold"
      />
    </div>
  );
}
