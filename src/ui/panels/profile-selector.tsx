/**
 * ProfileSelector — dropdown for managing user fitness profiles.
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProfileStore } from "@/stores/profile-store";
import { useFitnessStore } from "@/stores/fitness-store";
import type { Profile, ProfileConfig } from "@/data/profile-types";
import { Trash2, RotateCcw, Download, Upload } from "lucide-react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProfileSelectorProps {
  readonly onApplyProfile: (id: string, config: ProfileConfig) => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProfileDropdown({
  profiles,
  selectedId,
  onSelect,
  onSaveNew,
}: {
  readonly profiles: readonly Profile[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
  readonly onSaveNew: () => void;
}): React.JSX.Element {
  return (
    <Select
      value={selectedId ?? ""}
      onValueChange={(v) => {
        if (v === "__save_new__") {
          onSaveNew();
        } else {
          onSelect(v || null);
        }
      }}
    >
      <SelectTrigger size="sm" className="w-52">
        <SelectValue placeholder="Select profile..." />
      </SelectTrigger>
      <SelectContent>
        {profiles.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            <span className="flex items-center gap-2">
              {p.name}
              {p.isDefault && p.isModified && (
                <span className="text-xs text-text-muted">(modified)</span>
              )}
            </span>
          </SelectItem>
        ))}
        <SelectItem value="__save_new__" className="text-accent-gold">
          + Save as new...
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

function SaveDialog({
  open,
  onOpenChange,
  onSave,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (name: string) => void;
}): React.JSX.Element {
  const [name, setName] = useState("");

  const handleSave = (): void => {
    if (name.trim()) {
      onSave(name.trim());
      setName("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Profile name..."
            value={name}
            onChange={(e) => { setName(e.target.value); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); }}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  onImport,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onImport: (json: string) => { imported: number; errors: string[] };
}): React.JSX.Element {
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleImport = (): void => {
    setError(null);
    const result = onImport(json);
    if (result.errors.length > 0) {
      setError(result.errors.join("; "));
    } else {
      onOpenChange(false);
      setJson("");
      alert(`Imported ${String(result.imported)} profile(s)`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Profiles</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Paste JSON here..."
            value={json}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { setJson(e.target.value); }}
            rows={10}
            className="font-mono text-xs"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); }}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!json.trim()}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Profile Secondary Actions
// ---------------------------------------------------------------------------

function ProfileSecondaryActions({
  profile,
  profileId,
  onReset,
  onDelete,
}: {
  readonly profile: Profile | undefined;
  readonly profileId: string | null;
  readonly onReset: () => void;
  readonly onDelete: () => void;
}): React.JSX.Element | null {
  const showReset = profile?.isDefault && profile.isModified;
  const showDelete = profileId && !profile?.isDefault;

  if (!showReset && !showDelete) return null;

  return (
    <div className="flex items-center gap-2">
      {showReset && (
        <Button variant="ghost" size="xs" onClick={onReset} className="text-text-muted hover:text-accent-gold" title="Reset to default">
          <RotateCcw className="w-3 h-3 mr-1" />Reset
        </Button>
      )}
      {showDelete && (
        <Button variant="ghost" size="xs" onClick={onDelete} className="text-text-muted hover:text-red-400" title="Delete profile">
          <Trash2 className="w-3 h-3 mr-1" />Delete
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProfileSelector
// ---------------------------------------------------------------------------

export function ProfileSelector({ onApplyProfile }: ProfileSelectorProps): React.JSX.Element {
  const userProfiles = useProfileStore((s) => s.userProfiles);
  const getProfiles = useProfileStore((s) => s.getProfiles);
  // Memoize profiles to avoid infinite re-render loop
  const profiles = useMemo(() => getProfiles(), [userProfiles, getProfiles]);
  const selectedProfileId = useProfileStore((s) => s.selectedProfileId);
  const selectProfile = useProfileStore((s) => s.selectProfile);
  const createProfile = useProfileStore((s) => s.createProfile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const deleteProfile = useProfileStore((s) => s.deleteProfile);
  const resetToDefault = useProfileStore((s) => s.resetToDefault);
  const exportProfiles = useProfileStore((s) => s.exportProfiles);
  const importProfiles = useProfileStore((s) => s.importProfiles);
  const getCurrentConfig = useFitnessStore((s) => s.getCurrentConfig);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  const handleApply = (): void => {
    if (selectedProfile) {
      onApplyProfile(selectedProfile.id, {
        scoringMode: selectedProfile.scoringMode,
        enabledVariants: selectedProfile.enabledVariants,
        constraintsConfig: selectedProfile.constraintsConfig,
        efficiencyConfig: selectedProfile.efficiencyConfig,
        multiplierConfig: selectedProfile.multiplierConfig,
      });
    }
  };
  const handleSave = (): void => {
    if (selectedProfileId) {
      updateProfile(selectedProfileId, getCurrentConfig());
    }
  };
  const handleSaveAsNew = (name: string): void => {
    selectProfile(createProfile(name, getCurrentConfig()));
    setSaveDialogOpen(false);
  };
  const handleDelete = (): void => { if (selectedProfileId && confirm("Delete this profile?")) deleteProfile(selectedProfileId); };
  const handleReset = (): void => { if (selectedProfileId && selectedProfile?.isDefault && confirm("Reset to default?")) resetToDefault(selectedProfileId); };
  const handleExport = (): void => { navigator.clipboard.writeText(exportProfiles()).then(() => { alert("Copied"); }, () => { /* ignore */ }); };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-text-secondary">Profile:</span>
        <ProfileDropdown profiles={profiles} selectedId={selectedProfileId} onSelect={selectProfile} onSaveNew={() => { setSaveDialogOpen(true); }} />
        <Button variant="outline" size="xs" onClick={handleApply} disabled={!selectedProfile}>Apply</Button>
        <Button variant="outline" size="xs" onClick={handleSave} disabled={!selectedProfileId}>Save</Button>
        <div className="flex-1" />
        <Button variant="ghost" size="xs" onClick={handleExport} className="text-text-muted hover:text-accent-gold" title="Export profiles">
          <Download className="w-3 h-3 mr-1" />Export
        </Button>
        <Button variant="ghost" size="xs" onClick={() => { setImportDialogOpen(true); }} className="text-text-muted hover:text-accent-gold" title="Import profiles">
          <Upload className="w-3 h-3 mr-1" />Import
        </Button>
      </div>
      <ProfileSecondaryActions profile={selectedProfile} profileId={selectedProfileId} onReset={handleReset} onDelete={handleDelete} />
      <SaveDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} onSave={handleSaveAsNew} />
      <ImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} onImport={importProfiles} />
    </div>
  );
}
