/**
 * DataManagementPanel — main panel for managing user game data.
 * Provides CRUD operations for equipment, enchantments, modifiers, gems, and variants.
 */

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PanelHeader } from "./panel-header";
import { SearchInput } from "./search-input";
import { EquipmentEditor } from "./equipment-editor";
import { EnchantmentEditor } from "./enchantment-editor";
import { ModifierEditor } from "./modifier-editor";
import { GemEditor } from "./gem-editor";
import { VariantTypesEditor } from "./variant-types-editor";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataManagementPanel(): React.JSX.Element {
  const [filter, setFilter] = useState("");

  return (
    <div className="space-y-4 p-4">
      <PanelHeader />
      <SearchInput value={filter} onChange={setFilter} />

      <Tabs defaultValue="equipment">
        <TabsList variant="line">
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="enchantments">Enchantments</TabsTrigger>
          <TabsTrigger value="modifiers">Modifiers</TabsTrigger>
          <TabsTrigger value="gems">Gems</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
        </TabsList>

        <TabsContent value="equipment">
          <EquipmentEditor filter={filter} />
        </TabsContent>

        <TabsContent value="enchantments">
          <EnchantmentEditor filter={filter} />
        </TabsContent>

        <TabsContent value="modifiers">
          <ModifierEditor filter={filter} />
        </TabsContent>

        <TabsContent value="gems">
          <GemEditor filter={filter} />
        </TabsContent>

        <TabsContent value="variants">
          <VariantTypesEditor filter={filter} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

