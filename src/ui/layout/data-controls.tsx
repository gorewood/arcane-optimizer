/**
 * DataControls — unified Import/Export/Clear All controls for user data.
 *
 * Lives in the tab bar area so it's accessible from any tab.
 */

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useUserDataStore } from "@/stores/user-data-store";
import { ConfirmClearDialog } from "@/ui/panels/data-management/confirm-clear-dialog";

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useDataImportExport(): {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleExport: () => void;
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
} {
  const exportData = useUserDataStore((s) => s.exportData);
  const importData = useUserDataStore((s) => s.importData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback((): void => {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ao-user-data-${String(Date.now())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportData]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev): void => {
      const text = ev.target?.result;
      if (typeof text === "string") {
        const result = importData(text);
        if (result.errors.length > 0) {
          alert(`Import errors: ${result.errors.join(", ")}`);
        } else {
          alert(`Imported ${String(result.imported)} items`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [importData]);

  return { fileInputRef, handleExport, handleImport };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataControls(): React.JSX.Element {
  const { fileInputRef, handleExport, handleImport } = useDataImportExport();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1.5">
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        <Button variant="outline" size="xs" onClick={() => { fileInputRef.current?.click(); }}>Import</Button>
        <Button variant="outline" size="xs" onClick={handleExport}>Export</Button>
        <Button variant="outline" size="xs" className="text-stat-negative hover:text-stat-negative" onClick={() => { setConfirmClear(true); }}>Clear All</Button>
      </div>
      <ConfirmClearDialog open={confirmClear} onOpenChange={setConfirmClear} />
    </>
  );
}
