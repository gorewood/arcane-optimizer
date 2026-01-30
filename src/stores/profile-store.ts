/**
 * ProfileStore — manages user fitness profiles.
 *
 * Merges default profiles from JSON config with user overrides from localStorage.
 * Provides CRUD operations and export/import functionality.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  DefaultProfile,
  Profile,
  ProfileConfig,
  UserProfile,
  ConstraintsModeConfig,
  WeightsModeConfig,
} from "@/data/profile-types";
import { loadDefaultProfiles } from "@/data/loaders";
import { userProfilesStorageSchema } from "@/data/schemas";
import { DEFAULT_STAT_WEIGHTS, DEFAULT_LIMITS, DEFAULT_MINIMUMS } from "@/search/scoring-mode";
import { migrateProfileState } from "./profile-store-migrations";

// ---------------------------------------------------------------------------
// State & Action Types
// ---------------------------------------------------------------------------

export interface ProfileState {
  userProfiles: readonly UserProfile[];
  selectedProfileId: string | null;
}

export interface ProfileActions {
  getProfiles: () => readonly Profile[];
  getProfile: (id: string) => Profile | undefined;
  createProfile: (name: string, config: Partial<ProfileConfig>) => string;
  updateProfile: (id: string, config: Partial<ProfileConfig>) => void;
  renameProfile: (id: string, name: string) => void;
  deleteProfile: (id: string) => void;
  resetToDefault: (id: string) => void;
  selectProfile: (id: string | null) => void;
  exportProfiles: () => string;
  importProfiles: (json: string) => { imported: number; errors: string[] };
}

// ---------------------------------------------------------------------------
// Default Config Values
// ---------------------------------------------------------------------------

const DEFAULT_CONSTRAINTS_CONFIG: ConstraintsModeConfig = { constraints: [] };

const DEFAULT_WEIGHTS_CONFIG: WeightsModeConfig = {
  limits: DEFAULT_LIMITS,
  minimums: DEFAULT_MINIMUMS,
  weights: DEFAULT_STAT_WEIGHTS,
};

const DEFAULT_PROFILE_CONFIG: ProfileConfig = {
  scoringMode: "linear",
  enabledVariants: [],
  constraintsConfig: DEFAULT_CONSTRAINTS_CONFIG,
  efficiencyConfig: DEFAULT_WEIGHTS_CONFIG,
  multiplierConfig: DEFAULT_WEIGHTS_CONFIG,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let cachedDefaults: readonly DefaultProfile[] | null = null;

function getDefaultProfiles(): readonly DefaultProfile[] {
  cachedDefaults ??= loadDefaultProfiles();
  return cachedDefaults;
}

function generateId(): string {
  return `profile-${String(Date.now())}-${Math.random().toString(36).slice(2, 9)}`;
}

function mergeProfileConfig(base: ProfileConfig, override: Partial<ProfileConfig>): ProfileConfig {
  return {
    scoringMode: override.scoringMode ?? base.scoringMode,
    enabledVariants: override.enabledVariants ?? base.enabledVariants,
    constraintsConfig: override.constraintsConfig ?? base.constraintsConfig,
    efficiencyConfig: override.efficiencyConfig ?? base.efficiencyConfig,
    multiplierConfig: override.multiplierConfig ?? base.multiplierConfig,
  };
}

function buildProfileFromDefault(def: DefaultProfile): Profile {
  return {
    id: def.id,
    name: def.name,
    scoringMode: def.scoringMode,
    enabledVariants: def.enabledVariants,
    constraintsConfig: def.constraintsConfig,
    efficiencyConfig: def.efficiencyConfig,
    multiplierConfig: def.multiplierConfig,
    isDefault: true,
    isModified: false,
    createdAt: 0,
    updatedAt: 0,
  };
}

function buildProfileFromUser(user: UserProfile, isDefault: boolean): Profile {
  return {
    id: user.id,
    name: user.name,
    scoringMode: user.scoringMode,
    enabledVariants: user.enabledVariants,
    constraintsConfig: user.constraintsConfig,
    efficiencyConfig: user.efficiencyConfig,
    multiplierConfig: user.multiplierConfig,
    isDefault,
    isModified: isDefault,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function mergeProfiles(
  defaults: readonly DefaultProfile[],
  userProfiles: readonly UserProfile[],
): readonly Profile[] {
  const userMap = new Map(userProfiles.map((p) => [p.id, p]));
  const result: Profile[] = [];

  for (const def of defaults) {
    const user = userMap.get(def.id);
    if (user?.deleted) continue;
    result.push(user && !user.deleted ? buildProfileFromUser(user, true) : buildProfileFromDefault(def));
  }

  const defaultIds = new Set(defaults.map((d) => d.id));
  for (const user of userProfiles) {
    if (!defaultIds.has(user.id) && !user.deleted) {
      result.push(buildProfileFromUser(user, false));
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Import/Export Helpers
// ---------------------------------------------------------------------------

function doExportProfiles(profiles: readonly Profile[]): string {
  const exportable = profiles.filter((p) => !p.isDefault || p.isModified);
  return JSON.stringify({ version: 1, profiles: exportable }, null, 2);
}

function doImportProfiles(
  json: string,
  existingProfiles: readonly UserProfile[],
): { profiles: UserProfile[]; imported: number; errors: string[] } {
  try {
    const data = userProfilesStorageSchema.safeParse(JSON.parse(json));
    if (!data.success) return { profiles: [...existingProfiles], imported: 0, errors: ["Invalid profile format"] };

    const now = Date.now();
    const newProfiles = data.data.profiles.map((p): UserProfile => ({
      id: p.id, name: p.name, scoringMode: p.scoringMode, enabledVariants: p.enabledVariants,
      constraintsConfig: p.constraintsConfig, efficiencyConfig: p.efficiencyConfig,
      multiplierConfig: p.multiplierConfig, createdAt: now, updatedAt: now,
    }));

    const existingIds = new Set(existingProfiles.map((p) => p.id));
    const merged = [...existingProfiles];
    for (const np of newProfiles) {
      if (existingIds.has(np.id)) {
        const idx = merged.findIndex((p) => p.id === np.id);
        if (idx >= 0) merged[idx] = np;
      } else merged.push(np);
    }
    return { profiles: merged, imported: newProfiles.length, errors: [] };
  } catch (e) {
    return { profiles: [...existingProfiles], imported: 0, errors: [`Parse error: ${e instanceof Error ? e.message : String(e)}`] };
  }
}

// ---------------------------------------------------------------------------
// CRUD Helpers
// ---------------------------------------------------------------------------

function createUserProfile(name: string, config: Partial<ProfileConfig>): UserProfile {
  const now = Date.now();
  const merged = mergeProfileConfig(DEFAULT_PROFILE_CONFIG, config);
  return {
    id: generateId(), name, scoringMode: merged.scoringMode, enabledVariants: merged.enabledVariants,
    constraintsConfig: merged.constraintsConfig, efficiencyConfig: merged.efficiencyConfig,
    multiplierConfig: merged.multiplierConfig, createdAt: now, updatedAt: now,
  };
}

function updateUserProfileConfig(
  profiles: readonly UserProfile[], id: string, config: Partial<ProfileConfig>,
): readonly UserProfile[] {
  const now = Date.now();
  const existing = profiles.find((p) => p.id === id);
  if (existing) {
    const merged = mergeProfileConfig(existing, config);
    return profiles.map((p) => p.id === id ? {
      ...p, scoringMode: merged.scoringMode, enabledVariants: merged.enabledVariants,
      constraintsConfig: merged.constraintsConfig, efficiencyConfig: merged.efficiencyConfig,
      multiplierConfig: merged.multiplierConfig, updatedAt: now,
    } : p);
  }

  const defaultProfile = getDefaultProfiles().find((d) => d.id === id);
  if (defaultProfile) {
    const merged = mergeProfileConfig(defaultProfile, config);
    return [...profiles, {
      id, name: defaultProfile.name, scoringMode: merged.scoringMode, enabledVariants: merged.enabledVariants,
      constraintsConfig: merged.constraintsConfig, efficiencyConfig: merged.efficiencyConfig,
      multiplierConfig: merged.multiplierConfig, baseVersion: defaultProfile.version, createdAt: now, updatedAt: now,
    }];
  }
  return profiles;
}

function deleteUserProfile(profiles: readonly UserProfile[], id: string): readonly UserProfile[] {
  const isDefault = getDefaultProfiles().some((d) => d.id === id);
  const now = Date.now();
  if (isDefault) {
    const existing = profiles.find((p) => p.id === id);
    if (existing) return profiles.map((p) => p.id === id ? { ...p, deleted: true, updatedAt: now } : p);
    const defaultProfile = getDefaultProfiles().find((d) => d.id === id);
    return [...profiles, {
      id, name: "", scoringMode: defaultProfile?.scoringMode ?? "linear", enabledVariants: [],
      constraintsConfig: DEFAULT_CONSTRAINTS_CONFIG, efficiencyConfig: DEFAULT_WEIGHTS_CONFIG,
      multiplierConfig: DEFAULT_WEIGHTS_CONFIG, deleted: true, createdAt: now, updatedAt: now,
    }];
  }
  return profiles.filter((p) => p.id !== id);
}

function renameUserProfile(
  profiles: readonly UserProfile[], id: string, name: string,
): readonly UserProfile[] {
  const now = Date.now();
  const existing = profiles.find((p) => p.id === id);
  if (existing) return profiles.map((p) => p.id === id ? { ...p, name, updatedAt: now } : p);

  const defaultProfile = getDefaultProfiles().find((d) => d.id === id);
  if (defaultProfile) {
    return [...profiles, {
      id, name, scoringMode: defaultProfile.scoringMode, enabledVariants: defaultProfile.enabledVariants,
      constraintsConfig: defaultProfile.constraintsConfig, efficiencyConfig: defaultProfile.efficiencyConfig,
      multiplierConfig: defaultProfile.multiplierConfig, baseVersion: defaultProfile.version, createdAt: now, updatedAt: now,
    }];
  }
  return profiles;
}

// ---------------------------------------------------------------------------
// Store Actions
// ---------------------------------------------------------------------------

type SetFn = (partial: Partial<ProfileState> | ((s: ProfileState) => Partial<ProfileState>)) => void;
type GetFn = () => ProfileState & ProfileActions;

function createProfileActions(set: SetFn, get: GetFn): ProfileActions {
  return {
    getProfiles: () => mergeProfiles(getDefaultProfiles(), get().userProfiles),
    getProfile: (id) => get().getProfiles().find((p) => p.id === id),
    createProfile: (name, config) => {
      const newProfile = createUserProfile(name, config);
      set((s) => ({ userProfiles: [...s.userProfiles, newProfile], selectedProfileId: newProfile.id }));
      return newProfile.id;
    },
    updateProfile: (id, config) => { set((s) => ({ userProfiles: updateUserProfileConfig(s.userProfiles, id, config) })); },
    renameProfile: (id, name) => { set((s) => ({ userProfiles: renameUserProfile(s.userProfiles, id, name) })); },
    deleteProfile: (id) => {
      set((s) => ({
        userProfiles: deleteUserProfile(s.userProfiles, id),
        selectedProfileId: s.selectedProfileId === id ? null : s.selectedProfileId,
      }));
    },
    resetToDefault: (id) => { set((s) => ({ userProfiles: s.userProfiles.filter((p) => p.id !== id) })); },
    selectProfile: (id) => { set({ selectedProfileId: id }); },
    exportProfiles: () => doExportProfiles(get().getProfiles()),
    importProfiles: (json) => {
      const result = doImportProfiles(json, get().userProfiles);
      if (result.imported > 0) set({ userProfiles: result.profiles });
      return { imported: result.imported, errors: result.errors };
    },
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const INITIAL_STATE: ProfileState = { userProfiles: [], selectedProfileId: null };

export const useProfileStore = create<ProfileState & ProfileActions>()(
  persist(
    (set, get) => ({ ...INITIAL_STATE, ...createProfileActions(set, get) }),
    {
      name: "ao-profiles",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ userProfiles: state.userProfiles, selectedProfileId: state.selectedProfileId }),
      migrate: migrateProfileState,
    },
  ),
);
