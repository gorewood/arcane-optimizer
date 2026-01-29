/**
 * ItemEditorDialog — generic dialog wrapper for editing items.
 * Uses shadcn/ui Dialog component with save/cancel actions.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ItemEditorDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly children: React.ReactNode;
  readonly onSave: () => void;
  readonly onCancel: () => void;
  readonly isValid: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ItemEditorDialog({
  open,
  onOpenChange,
  title,
  children,
  onSave,
  onCancel,
  isValid,
}: ItemEditorDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-surface border-border-default max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-text-primary">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">{children}</div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onSave}
            disabled={!isValid}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
