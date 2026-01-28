import { Button } from "@/components/ui/button";
import { GearPoolPanel, FitnessPanel, SearchPanel, ResultsPanel } from "@/ui/panels";
import { useUIStore } from "@/stores/ui-store";
import type { UIState } from "@/stores/ui-store";

// ---------------------------------------------------------------------------
// Tab configuration
// ---------------------------------------------------------------------------

interface TabDef {
  readonly id: UIState["activePanel"];
  readonly label: string;
}

const TABS: readonly TabDef[] = [
  { id: "gear", label: "Gear Pool" },
  { id: "fitness", label: "Fitness" },
  { id: "search", label: "Search" },
  { id: "results", label: "Results" },
] as const;

// ---------------------------------------------------------------------------
// AppShell
// ---------------------------------------------------------------------------

/** Root layout with header, tab bar, and panel content area. */
export function AppShell(): React.JSX.Element {
  const activePanel = useUIStore((s) => s.activePanel);
  const setActivePanel = useUIStore((s) => s.setActivePanel);

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      {/* Header */}
      <header className="border-b border-border-default bg-bg-secondary px-4 py-3">
        <h1 className="text-lg font-bold text-accent-gold">
          AO Armor Optimizer
        </h1>
      </header>

      {/* Tab bar */}
      <nav className="flex flex-wrap gap-1 border-b border-border-default bg-bg-secondary px-4">
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activePanel === tab.id}
            onSelect={setActivePanel}
          />
        ))}
      </nav>

      {/* Panel content */}
      <main className="flex-1">
        <PanelContent panel={activePanel} />
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TabButton (extracted for readability + 60-line rule)
// ---------------------------------------------------------------------------

function TabButton({
  tab,
  isActive,
  onSelect,
}: {
  tab: TabDef;
  isActive: boolean;
  onSelect: (panel: UIState["activePanel"]) => void;
}): React.JSX.Element {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={
        isActive
          ? "rounded-none border-b-2 border-accent-gold text-accent-gold"
          : "rounded-none border-b-2 border-transparent text-text-secondary hover:text-text-primary"
      }
      onClick={() => {
        onSelect(tab.id);
      }}
    >
      {tab.label}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Panel content
// ---------------------------------------------------------------------------

function PanelContent({
  panel,
}: {
  panel: UIState["activePanel"];
}): React.JSX.Element {
  if (panel === "gear") {
    return <GearPoolPanel />;
  }

  if (panel === "fitness") {
    return <FitnessPanel />;
  }

  if (panel === "search") {
    return <SearchPanel />;
  }

  return <ResultsPanel />;
}
