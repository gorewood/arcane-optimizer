/**
 * useVersionCheck - Hook to detect bundled data version changes on app load.
 * Returns state for showing the version conflict dialog.
 */

import { useState } from "react";
import { useUserDataStore } from "@/stores/user-data-store";

interface UseVersionCheckResult {
  readonly showConflict: boolean;
  readonly setShowConflict: (show: boolean) => void;
}

export function useVersionCheck(): UseVersionCheckResult {
  const checkBundledUpdate = useUserDataStore((s) => s.checkBundledUpdate);
  // Initialize state based on version check - runs once on mount
  const [showConflict, setShowConflict] = useState(() => checkBundledUpdate());

  return { showConflict, setShowConflict };
}
