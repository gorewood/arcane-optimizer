import { ErrorBoundary } from "@/ui/error-boundary";
import { AppShell } from "@/ui/layout/app-shell";
import { VersionConflictDialog } from "@/ui/panels/data-management";
import { useVersionCheck } from "@/hooks/use-version-check";

export function App(): React.JSX.Element {
  const { showConflict, setShowConflict } = useVersionCheck();

  return (
    <ErrorBoundary>
      <AppShell />
      <VersionConflictDialog open={showConflict} onOpenChange={setShowConflict} />
    </ErrorBoundary>
  );
}
