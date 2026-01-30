/**
 * CollapsibleSection — reusable Radix Collapsible wrapper with header summary.
 *
 * Shows a clickable header with chevron indicator. Content collapses/expands.
 * Accepts a summary slot for inline display when collapsed.
 * Can be disabled to prevent expansion and dim content.
 */

import { useState } from "react";
import { ChevronRight, Lock } from "lucide-react";
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
  /** Controlled open state (overrides internal state when provided) */
  readonly open?: boolean;
  /** Callback when open state changes (enables controlled mode) */
  readonly onOpenChange?: (open: boolean) => void;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
}

/** Icon indicator: Lock when disabled, rotating Chevron otherwise */
function ToggleIcon({ disabled, open }: { disabled: boolean; open: boolean }): React.JSX.Element {
  if (disabled) {
    return <Lock className="h-4 w-4 text-text-muted" />;
  }
  return (
    <ChevronRight
      className={`h-4 w-4 text-text-muted transition-transform ${open ? "rotate-90" : ""}`}
    />
  );
}

/** Trailing content: summary (always visible), disabled reason when locked */
function TrailingContent({
  disabled,
  summary,
  disabledReason,
}: {
  disabled: boolean;
  summary: React.ReactNode | undefined;
  disabledReason: string | undefined;
}): React.JSX.Element | null {
  if (disabled && disabledReason != null) {
    return <span className="ml-auto text-xs text-text-muted italic">{disabledReason}</span>;
  }
  if (summary != null) {
    return <span className="ml-auto text-xs text-text-secondary truncate max-w-[60%]">{summary}</span>;
  }
  return null;
}

export function CollapsibleSection({
  title,
  summary,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  disabled = false,
  disabledReason,
}: CollapsibleSectionProps): React.JSX.Element {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const handleOpenChange = (newOpen: boolean): void => {
    if (isControlled) {
      onOpenChange?.(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };
  const effectiveOpen = disabled ? false : open;

  const roundedClass = effectiveOpen ? "rounded-t-md" : "rounded-md";
  const buttonClass = disabled
    ? `flex w-full items-center gap-2 ${roundedClass} border border-border-default bg-bg-surface px-4 py-3 text-left transition-colors opacity-60 cursor-not-allowed`
    : `flex w-full items-center gap-2 ${roundedClass} border border-border-default bg-bg-surface px-4 py-3 text-left transition-colors hover:bg-bg-elevated`;

  const contentClass = disabled
    ? "border-x border-b border-border-default rounded-b-md bg-bg-surface px-4 py-3 opacity-50 pointer-events-none"
    : "border-x border-b border-border-default rounded-b-md bg-bg-surface px-4 py-3";

  return (
    <Collapsible open={effectiveOpen} onOpenChange={(o) => { if (!disabled) handleOpenChange(o); }}>
      <CollapsibleTrigger asChild disabled={disabled}>
        <button type="button" disabled={disabled} className={buttonClass}>
          <ToggleIcon disabled={disabled} open={effectiveOpen} />
          <span className="text-sm font-semibold text-accent-gold">{title}</span>
          <TrailingContent disabled={disabled} summary={summary} disabledReason={disabledReason} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={contentClass}>{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
