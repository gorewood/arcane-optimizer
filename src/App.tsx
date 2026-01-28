import { ErrorBoundary } from "@/ui/error-boundary";
import { AppShell } from "@/ui/layout/app-shell";

export function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
