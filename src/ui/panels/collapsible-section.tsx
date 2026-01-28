/**
 * CollapsibleSection — reusable Radix Collapsible wrapper with header summary.
 *
 * Shows a clickable header with chevron indicator. Content collapses/expands.
 * Accepts a summary slot for inline display when collapsed.
 */

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CollapsibleSectionProps {
  readonly title: string;
  readonly summary?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly defaultOpen?: boolean;
}

export function CollapsibleSection({
  title,
  summary,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md border border-border-default bg-bg-surface px-4 py-3 text-left transition-colors hover:bg-bg-elevated"
        >
          <ChevronRight
            className={`h-4 w-4 text-text-muted transition-transform ${
              open ? "rotate-90" : ""
            }`}
          />
          <span className="text-sm font-semibold text-accent-gold">{title}</span>
          {!open && summary != null && (
            <span className="ml-auto text-xs text-text-secondary truncate max-w-[60%]">
              {summary}
            </span>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-x border-b border-border-default rounded-b-md bg-bg-surface px-4 py-3">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
