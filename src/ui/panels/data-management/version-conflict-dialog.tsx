/**
 * VersionConflictDialog - Prompts user when bundled data version changes.
 * Offers choice to keep user modifications or reset to fresh bundled data.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUserDataStore } from "@/stores/user-data-store";

interface VersionConflictDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function VersionConflictDialog({
  open,
  onOpenChange,
}: VersionConflictDialogProps): React.JSX.Element {
  const updateStoredVersion = useUserDataStore((s) => s.updateStoredVersion);
  const clearAllUserData = useUserDataStore((s) => s.clearAllUserData);

  const handleKeepChanges = () => {
    updateStoredVersion();
    onOpenChange(false);
  };

  const handleResetToDefaults = () => {
    clearAllUserData();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => { e.preventDefault(); }}
        onEscapeKeyDown={(e) => { e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>Game Data Updated</DialogTitle>
          <DialogDescription>
            The bundled game data has been updated to a newer version. You have custom
            modifications saved. How would you like to proceed?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleResetToDefaults}>
            Reset to Defaults
          </Button>
          <Button onClick={handleKeepChanges}>Keep My Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
