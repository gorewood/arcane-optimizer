/**
 * EquipmentEditorHeader — header with title and add button.
 */

import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EquipmentEditorHeaderProps {
  readonly count: number;
  readonly onAddNew: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EquipmentEditorHeader({
  count,
  onAddNew,
}: EquipmentEditorHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-accent-gold">
        Equipment
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
