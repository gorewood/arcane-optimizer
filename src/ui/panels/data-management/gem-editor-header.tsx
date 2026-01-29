/**
 * GemEditorHeader — header with title and add button.
 */

import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GemEditorHeaderProps {
  readonly count: number;
  readonly onAddNew: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GemEditorHeader({
  count,
  onAddNew,
}: GemEditorHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-accent-gold">
        Gems
        <span className="ml-2 text-xs text-text-muted font-normal">
          ({String(count)} items)
        </span>
      </h3>
      <Button variant="outline" size="xs" onClick={onAddNew}>
        + Add New
      </Button>
    </div>
  );
}
