/**
 * PanelHeader — header with add button.
 *
 * Import/Export/Clear All controls have moved to the global tab bar (DataControls).
 */

import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PanelHeaderProps {
  readonly onAdd: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PanelHeader({ onAdd }: PanelHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <h2 className="text-lg font-bold text-text-primary">Game Data</h2>
      <div className="flex-1" />
      <Button variant="outline" size="xs" onClick={onAdd}>
        + Add
      </Button>
    </div>
  );
}
