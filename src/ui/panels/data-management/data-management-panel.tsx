/**
 * DataManagementPanel — main panel for managing user game data.
 * Provides CRUD operations for enchantments, modifiers, gems, and variants.
 * Equipment is managed in the Gear Inventory panel.
 */

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PanelHeader } from "./panel-header";
import { SearchInput } from "./search-input";
import { SortSelect, type SortOption } from "@/ui/panels/sort-select";
import { EnchantmentEditor } from "./enchantment-editor";
import { ModifierEditor } from "./modifier-editor";
import { GemEditor } from "./gem-editor";
import { VariantTypesEditor } from "./variant-types-editor";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataManagementPanel(): React.JSX.Element {
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");

  return (
    <div className="space-y-4 p-4">
      <PanelHeader />
      <div className="flex items-center gap-2">
        <SearchInput value={filter} onChange={setFilter} />
        <SortSelect value={sortBy} onChange={setSortBy} />
      </div>

      <Tabs defaultValue="enchantments">
        <TabsList variant="line">
          <TabsTrigger value="enchantments">Enchantments</TabsTrigger>
          <TabsTrigger value="modifiers">Modifiers</TabsTrigger>
          <TabsTrigger value="gems">Gems</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
        </TabsList>

        <TabsContent value="enchantments">
          <EnchantmentEditor filter={filter} sortBy={sortBy} />
        </TabsContent>

        <TabsContent value="modifiers">
          <ModifierEditor filter={filter} sortBy={sortBy} />
        </TabsContent>

        <TabsContent value="gems">
          <GemEditor filter={filter} sortBy={sortBy} />
        </TabsContent>

        <TabsContent value="variants">
          <VariantTypesEditor filter={filter} sortBy={sortBy} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

