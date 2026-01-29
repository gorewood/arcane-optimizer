/**
 * VersionConflictDialog - Prompts user when bundled data version changes.
 * Shows expandable summary of bundled changes and user items.
 */

import { useState } from "react";
import { ChevronRight, Package, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { useUserDataStore } from "@/stores/user-data-store";
import type { SyncSummary } from "@/stores/user-data-store";
import dataManifest from "@/data/data-manifest.json";

interface VersionConflictDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

interface SummaryRowProps {
  readonly label: string;
  readonly count: number;
  readonly details?: readonly string[];
  readonly suffix?: string;
}

/** A single expandable row showing count and optional detail list. */
function SummaryRow({ label, count, details, suffix }: SummaryRowProps): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const hasDetails = details !== undefined && details.length > 0;
  const canExpand = hasDetails && count > 0;

  if (count === 0 && !hasDetails) {
    return (
      <div className="flex items-center gap-2 py-1 text-sm text-text-muted">
        <span className="w-4" />
        <span>{count} {label}</span>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className="flex w-full items-center gap-2 py-1 text-sm text-text-secondary hover:text-text-primary disabled:cursor-default"
        disabled={!canExpand}
      >
        {canExpand ? (
          <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
        ) : (
          <span className="w-4" />
        )}
        <span>{count} {label}</span>
        {suffix !== undefined && <span className="text-text-muted text-xs">{suffix}</span>}
      </CollapsibleTrigger>
      {canExpand && (
        <CollapsibleContent>
          <ul className="ml-6 space-y-0.5 py-1 text-xs text-text-muted">
            {details.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

interface SectionProps {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly children: React.ReactNode;
}

/** Section with icon header. */
function Section({ icon, title, children }: SectionProps): React.JSX.Element {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
        {icon}
        <span>{title}</span>
      </div>
      <div className="ml-1">{children}</div>
    </div>
  );
}

interface SyncContentProps {
  readonly summary: SyncSummary;
}

/** Content showing bundled changes and user items summary. */
function SyncContent({ summary }: SyncContentProps): React.JSX.Element {
  const { bundledChanges, userItems, changelog } = summary;

  return (
    <div className="space-y-4">
      <Section icon={<Package className="h-4 w-4 text-accent-gold" />} title="Bundled Changes">
        <SummaryRow label="new items" count={bundledChanges.added} details={changelog?.added} />
        <SummaryRow label="modified items" count={bundledChanges.modified} details={changelog?.modified} />
        <SummaryRow label="removed items" count={bundledChanges.removed} details={changelog?.removed} />
      </Section>

      <Section icon={<Trash2 className="h-4 w-4 text-accent-gold" />} title="Your Items">
        <SummaryRow label="duplicates" count={userItems.duplicates} suffix="(will be removed)" />
        <SummaryRow label="orphan contributions" count={userItems.orphanContributions} suffix="(kept)" />
        <SummaryRow label="custom items" count={userItems.customItems} suffix="(always kept)" />
      </Section>

      {changelog?.summary !== undefined && (
        <>
          <Separator />
          <p className="text-sm text-text-muted italic">"{changelog.summary}"</p>
        </>
      )}
    </div>
  );
}

export function VersionConflictDialog({
  open,
  onOpenChange,
}: VersionConflictDialogProps): React.JSX.Element {
  const bundledVersion = useUserDataStore((s) => s.bundledVersion);
  const getSyncSummary = useUserDataStore((s) => s.getSyncSummary);
  const performSync = useUserDataStore((s) => s.performSync);

  const summary = getSyncSummary();
  const currentVersion = dataManifest.version;

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleAcceptSync = () => {
    performSync();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => { e.preventDefault(); }}
        onEscapeKeyDown={(e) => { e.preventDefault(); }}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Game Data Updated (v{bundledVersion} → v{currentVersion})</DialogTitle>
          <DialogDescription>
            Review the changes below and choose how to proceed.
          </DialogDescription>
        </DialogHeader>

        <SyncContent summary={summary} />

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleAcceptSync}>Accept & Sync</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
