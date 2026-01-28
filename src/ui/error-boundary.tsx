import * as React from "react";

import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Top-level error boundary that catches rendering errors and displays
 * a dark-fantasy-themed fallback card with a reload action.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return <ErrorFallback error={this.state.error} />;
  }
}

// ---------------------------------------------------------------------------
// Fallback UI (extracted to stay under 60-line function limit)
// ---------------------------------------------------------------------------

function ErrorFallback({
  error,
}: {
  error: Error | null;
}): React.JSX.Element {
  const message = error?.message ?? "An unexpected error occurred.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary p-6">
      <div className="card-game max-w-md space-y-4 p-8 text-center">
        <h1 className="text-xl font-bold text-accent-gold">
          Something went wrong
        </h1>
        <p className="text-sm text-text-secondary">{message}</p>
        <Button
          variant="default"
          onClick={() => {
            window.location.reload();
          }}
        >
          Reload
        </Button>
      </div>
    </div>
  );
}
