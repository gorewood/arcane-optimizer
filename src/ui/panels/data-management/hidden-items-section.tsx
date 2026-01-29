/**
 * HiddenItemsSection — collapsible section showing deleted bundled items.
 */

import { useState } from "react";
import type { MergedItem } from "@/data/user-data-types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HiddenItemsSectionProps<T> {
  readonly items: readonly MergedItem<T>[];
  readonly onRestore: (id: string) => void;
  readonly renderRow: (item: MergedItem<T>) => React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HiddenItemsSection<T extends { id: string }>({
  items,
  renderRow,
}: HiddenItemsSectionProps<T>): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border-subtle rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => { setExpanded((p) => !p); }}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-text-muted bg-bg-elevated hover:bg-bg-surface"
      >
        <span className="text-xs">{expanded ? "\u25BC" : "\u25B6"}</span>
        <span>Hidden Items</span>
        <span className="text-xs">({items.length})</span>
      </button>
      {expanded && (
        <div className="divide-y divide-border-subtle">
          {items.map((item) => (
            <div key={item.item.id}>{renderRow(item)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
