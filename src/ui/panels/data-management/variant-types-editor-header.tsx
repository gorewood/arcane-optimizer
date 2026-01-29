/**
 * VariantTypesEditorHeader — header with title and add button.
 */

import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VariantTypesEditorHeaderProps {
  readonly count: number;
  readonly onAddNew: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VariantTypesEditorHeader({
  count,
  onAddNew,
}: VariantTypesEditorHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-accent-gold">
        Variant Types
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
