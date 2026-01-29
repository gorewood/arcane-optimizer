import { Button } from "@/components/ui/button";
import { GearPoolPanel, DataManagementPanel, HelpPanel } from "@/ui/panels";
import { OptimizerPage } from "@/ui/panels/optimizer-page";
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
  { id: "optimizer", label: "Optimizer" },
  { id: "gear", label: "Gear Pool" },
  { id: "data", label: "Data" },
  { id: "help", label: "Help" },
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
      <header className="border-b border-border-default bg-bg-secondary">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <h1 className="text-lg font-bold text-accent-gold">
            Arcane Odyssey Armor Optimizer
          </h1>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="border-b border-border-default bg-bg-secondary">
        <div className="mx-auto max-w-5xl flex flex-wrap gap-1 px-4">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activePanel === tab.id}
              onSelect={setActivePanel}
            />
          ))}
        </div>
      </nav>

      {/* Panel content */}
      <main className="mx-auto max-w-5xl w-full flex-1">
        <PanelContent panel={activePanel} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border-default bg-bg-secondary py-3 text-center text-xs text-text-muted">
        <a
          href="https://github.com/gorewood/arcane-optimizer"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-accent-gold transition-colors"
        >
          GitHub
        </a>
      </footer>
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

  if (panel === "data") {
    return <DataManagementPanel />;
  }

  if (panel === "help") {
    return <HelpPanel />;
  }

  return <OptimizerPage />;
}
