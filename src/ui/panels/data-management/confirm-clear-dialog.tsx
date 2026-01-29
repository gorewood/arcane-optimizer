/**
 * ConfirmClearDialog — confirmation dialog for clearing all user data.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUserDataStore } from "@/stores/user-data-store";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConfirmClearDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConfirmClearDialog({
  open,
  onOpenChange,
}: ConfirmClearDialogProps): React.JSX.Element {
  const clearAllUserData = useUserDataStore((s) => s.clearAllUserData);

  const handleConfirm = (): void => {
    clearAllUserData();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-surface border-border-default">
        <DialogHeader>
          <DialogTitle className="text-text-primary">
            Clear All User Data?
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            This will permanently delete all custom items and modifications.
            Bundled data will be restored to defaults.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { onOpenChange(false); }}
          >
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleConfirm}>
            Clear All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
