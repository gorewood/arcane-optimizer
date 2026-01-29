/**
 * AtlanteanBehaviorEditor — collapsible section for atlantean modifier config.
 */

import { useState } from "react";
import type { Modifier, AtlanteanConfig } from "@/models/types";
import { AtlanteanFields } from "./atlantean-fields";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AtlanteanBehaviorEditorProps {
  readonly modifier: Modifier;
  readonly onChange: (modifier: Modifier) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AtlanteanBehaviorEditor({
  modifier,
  onChange,
}: AtlanteanBehaviorEditorProps): React.JSX.Element {
  const hasAtlantean = modifier.atlanteanBehavior !== undefined;
  const [expanded, setExpanded] = useState(hasAtlantean);

  const toggleAtlantean = (): void => {
    if (hasAtlantean) {
      const { atlanteanBehavior: _, ...rest } = modifier;
      onChange(rest as Modifier);
      setExpanded(false);
    } else {
      const config: AtlanteanConfig = { insanity: 0, possibleBonusStats: [] };
      onChange({ ...modifier, atlanteanBehavior: config });
      setExpanded(true);
    }
  };

  const handleClick = (): void => {
    if (hasAtlantean) {
      setExpanded((p) => !p);
    } else {
      toggleAtlantean();
    }
  };

  return (
    <div className="border border-border-subtle rounded-md overflow-hidden">
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-text-muted bg-bg-elevated hover:bg-bg-surface"
      >
        <span className="text-xs">{expanded ? "\u25BC" : "\u25B6"}</span>
        <span>Atlantean Behavior</span>
        <span className="text-xs text-text-muted">
          {hasAtlantean ? "(enabled)" : "(disabled)"}
        </span>
      </button>
      {expanded && modifier.atlanteanBehavior !== undefined && (
        <AtlanteanFields
          config={modifier.atlanteanBehavior}
          onChange={(config) => { onChange({ ...modifier, atlanteanBehavior: config }); }}
          onRemove={toggleAtlantean}
        />
      )}
    </div>
  );
}
