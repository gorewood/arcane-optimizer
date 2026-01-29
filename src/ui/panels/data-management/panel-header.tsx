/**
 * PanelHeader — header with add/import/export/clear actions and storage size.
 */

import { useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useUserDataStore } from "@/stores/user-data-store";
import { ConfirmClearDialog } from "./confirm-clear-dialog";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PanelHeaderProps {
  readonly onAdd: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PanelHeader({ onAdd }: PanelHeaderProps): React.JSX.Element {
  const exportData = useUserDataStore((s) => s.exportData);
  const importData = useUserDataStore((s) => s.importData);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const storageSize = useMemo(() => {
    const data = localStorage.getItem("ao-user-data");
    return data ? formatBytes(new Blob([data]).size) : "0 B";
  }, []);

  const handleExport = (): void => {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ao-user-data-${String(Date.now())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>): void => {
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
  };

  return (
    <div className="space-y-2">
      <HeaderRow
        storageSize={storageSize}
        fileInputRef={fileInputRef}
        onAdd={onAdd}
        onExport={handleExport}
        onImport={handleImport}
        onClearClick={() => { setConfirmClear(true); }}
      />
      <ConfirmClearDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// HeaderRow
// ---------------------------------------------------------------------------

function HeaderRow({
  storageSize,
  fileInputRef,
  onAdd,
  onExport,
  onImport,
  onClearClick,
}: {
  readonly storageSize: string;
  readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
  readonly onAdd: () => void;
  readonly onExport: () => void;
  readonly onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onClearClick: () => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <h2 className="text-lg font-bold text-text-primary">Game Data</h2>
      <span className="text-xs text-text-muted">Storage: {storageSize}</span>
      <div className="flex gap-1.5 ml-auto">
        <Button variant="outline" size="xs" onClick={onAdd}>
          + Add
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={onImport}
        />
        <Button
          variant="outline"
          size="xs"
          onClick={() => { fileInputRef.current?.click(); }}
        >
          Import
        </Button>
        <Button variant="outline" size="xs" onClick={onExport}>
          Export
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="text-stat-negative hover:text-stat-negative"
          onClick={onClearClick}
        >
          Clear All
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i] ?? "B"}`;
}
