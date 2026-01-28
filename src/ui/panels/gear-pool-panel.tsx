/**
 * GearPoolPanel — main panel for configuring which equipment, enchantments,
 * modifiers, and gems are available to the optimizer.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  loadEquipment,
  loadEnchantments,
  loadModifiers,
  loadGems,
} from "@/data/loaders";
import { useGearPoolStore } from "@/stores/gear-pool-store";
import { EquipmentSection } from "./equipment-section";
import { EnchantmentSection } from "./enchantment-section";
import { ModifierSection } from "./modifier-section";
import { GemSection } from "./gem-section";

// ---------------------------------------------------------------------------
// Static data (loaders return cached, validated data — safe in render)
// ---------------------------------------------------------------------------

const equipment = loadEquipment();
const enchantments = loadEnchantments();
const modifiers = loadModifiers();
const gems = loadGems();

// ---------------------------------------------------------------------------
// GearPoolPanel
// ---------------------------------------------------------------------------

export function GearPoolPanel(): React.JSX.Element {
  const [filter, setFilter] = useState("");
  const enableAll = useGearPoolStore((s) => s.enableAll);
  const disableAll = useGearPoolStore((s) => s.disableAll);

  return (
    <div className="space-y-4 p-4 max-w-4xl">
      <PanelHeader
        filter={filter}
        onFilterChange={setFilter}
        onEnableAll={enableAll}
        onDisableAll={disableAll}
      />
      <Separator className="bg-border-subtle" />
      <EquipmentSection equipment={equipment} filter={filter} />
      <Separator className="bg-border-subtle" />
      <EnchantmentSection enchantments={enchantments} filter={filter} />
      <Separator className="bg-border-subtle" />
      <ModifierSection modifiers={modifiers} filter={filter} />
      <Separator className="bg-border-subtle" />
      <GemSection gems={gems} filter={filter} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PanelHeader — title, bulk actions, search
// ---------------------------------------------------------------------------

function PanelHeader({
  filter,
  onFilterChange,
  onEnableAll,
  onDisableAll,
}: {
  readonly filter: string;
  readonly onFilterChange: (value: string) => void;
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
      <SearchInput value={filter} onChange={onFilterChange} />
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
