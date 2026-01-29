/**
 * DataManagementPanel — main panel for managing user game data.
 * Provides CRUD operations for enchantments, modifiers, gems, and variants.
 * Equipment is managed in the Gear Inventory panel.
 */

import { useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PanelHeader } from "./panel-header";
import { SearchInput } from "./search-input";
import { SortSelect, type SortOption } from "@/ui/panels/sort-select";
import { EnchantmentEditor } from "./enchantment-editor";
import { ModifierEditor } from "./modifier-editor";
import { GemEditor } from "./gem-editor";
import { VariantTypesEditor } from "./variant-types-editor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GameDataTab = "enchantments" | "modifiers" | "gems" | "variants";

const VALID_TABS = new Set<string>(["enchantments", "modifiers", "gems", "variants"]);

function isGameDataTab(value: string): value is GameDataTab {
  return VALID_TABS.has(value);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataManagementPanel(): React.JSX.Element {
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [activeTab, setActiveTab] = useState<GameDataTab>("enchantments");
  const [addRequest, setAddRequest] = useState(0);

  const handleAdd = useCallback((): void => {
    setAddRequest((prev) => prev + 1);
  }, []);

  return (
    <div className="space-y-4 p-4">
      <PanelHeader onAdd={handleAdd} />
      <div className="flex items-center gap-2">
        <SearchInput value={filter} onChange={setFilter} />
        <SortSelect value={sortBy} onChange={setSortBy} />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { if (isGameDataTab(v)) setActiveTab(v); }}>
        <TabsList variant="line">
          <TabsTrigger value="enchantments">Enchantments</TabsTrigger>
          <TabsTrigger value="modifiers">Modifiers</TabsTrigger>
          <TabsTrigger value="gems">Gems</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
        </TabsList>

        <TabsContent value="enchantments">
          <EnchantmentEditor
            filter={filter}
            sortBy={sortBy}
            addRequest={activeTab === "enchantments" ? addRequest : 0}
          />
        </TabsContent>

        <TabsContent value="modifiers">
          <ModifierEditor
            filter={filter}
            sortBy={sortBy}
            addRequest={activeTab === "modifiers" ? addRequest : 0}
          />
        </TabsContent>

        <TabsContent value="gems">
          <GemEditor
            filter={filter}
            sortBy={sortBy}
            addRequest={activeTab === "gems" ? addRequest : 0}
          />
        </TabsContent>

        <TabsContent value="variants">
          <VariantTypesEditor
            filter={filter}
            sortBy={sortBy}
            addRequest={activeTab === "variants" ? addRequest : 0}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

