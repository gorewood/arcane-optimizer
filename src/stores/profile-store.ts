/**
 * ProfileStore — manages user fitness profiles.
 *
 * Merges default profiles from JSON config with user overrides from localStorage.
 * Provides CRUD operations and export/import functionality.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SoftConstraint, StatName } from "@/models/types";
import type { DefaultProfile, Profile, ProfileConfig, UserProfile } from "@/data/profile-types";
import { loadDefaultProfiles } from "@/data/loaders";
import { userProfilesStorageSchema } from "@/data/schemas";
import type { ScoringMode } from "@/search/scoring-mode";
import { DEFAULT_STAT_WEIGHTS } from "@/search/scoring-mode";

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

const DEFAULT_PROFILE_CONFIG: ProfileConfig = {
  scoringMode: "linear",
  constraints: [],
  statWeights: DEFAULT_STAT_WEIGHTS,
  enabledVariants: [],
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

function mergeProfileConfig(
  base: ProfileConfig,
  override: Partial<ProfileConfig>,
): ProfileConfig {
  return {
    scoringMode: override.scoringMode ?? base.scoringMode,
    constraints: override.constraints ?? base.constraints,
    statWeights: override.statWeights ?? base.statWeights,
    enabledVariants: override.enabledVariants ?? base.enabledVariants,
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

    if (user && !user.deleted) {
      result.push({
        id: def.id,
        name: user.name,
        scoringMode: user.scoringMode,
        constraints: user.constraints,
        statWeights: user.statWeights,
        enabledVariants: user.enabledVariants,
        isDefault: true,
        isModified: true,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } else {
      result.push({
        id: def.id,
        name: def.name,
        scoringMode: def.scoringMode,
        constraints: def.constraints,
        statWeights: def.statWeights,
        enabledVariants: def.enabledVariants,
        isDefault: true,
        isModified: false,
        createdAt: 0,
        updatedAt: 0,
      });
    }
  }

  const defaultIds = new Set(defaults.map((d) => d.id));
  for (const user of userProfiles) {
    if (!defaultIds.has(user.id) && !user.deleted) {
      result.push({
        id: user.id,
        name: user.name,
        scoringMode: user.scoringMode,
        constraints: user.constraints,
        statWeights: user.statWeights,
        enabledVariants: user.enabledVariants,
        isDefault: false,
        isModified: false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
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
  const errors: string[] = [];
  let imported = 0;

  try {
    const data = userProfilesStorageSchema.safeParse(JSON.parse(json));
    if (!data.success) {
      return { profiles: [...existingProfiles], imported: 0, errors: ["Invalid profile format"] };
    }

    const now = Date.now();
    const newProfiles: UserProfile[] = [];

    for (const p of data.data.profiles) {
      newProfiles.push({
        id: p.id,
        name: p.name,
        scoringMode: p.scoringMode,
        constraints: p.constraints,
        statWeights: p.statWeights,
        enabledVariants: p.enabledVariants,
        createdAt: now,
        updatedAt: now,
      });
      imported++;
    }

    const existingIds = new Set(existingProfiles.map((p) => p.id));
    const merged = [...existingProfiles];

    for (const np of newProfiles) {
      if (existingIds.has(np.id)) {
        const idx = merged.findIndex((p) => p.id === np.id);
        if (idx >= 0) merged[idx] = np;
      } else {
        merged.push(np);
      }
    }

    return { profiles: merged, imported, errors };
  } catch (e) {
    errors.push(`Parse error: ${e instanceof Error ? e.message : String(e)}`);
    return { profiles: [...existingProfiles], imported: 0, errors };
  }
}

// ---------------------------------------------------------------------------
// CRUD Helpers
// ---------------------------------------------------------------------------

function createUserProfile(
  name: string,
  config: Partial<ProfileConfig>,
): UserProfile {
  const now = Date.now();
  const merged = mergeProfileConfig(DEFAULT_PROFILE_CONFIG, config);
  return {
    id: generateId(),
    name,
    scoringMode: merged.scoringMode,
    constraints: merged.constraints,
    statWeights: merged.statWeights,
    enabledVariants: merged.enabledVariants,
    createdAt: now,
    updatedAt: now,
  };
}

function updateUserProfileConfig(
  profiles: readonly UserProfile[],
  id: string,
  config: Partial<ProfileConfig>,
): readonly UserProfile[] {
  const now = Date.now();
  const existing = profiles.find((p) => p.id === id);

  if (existing) {
    const merged = mergeProfileConfig(existing, config);
    return profiles.map((p) =>
      p.id === id
        ? {
            ...p,
            scoringMode: merged.scoringMode,
            constraints: merged.constraints,
            statWeights: merged.statWeights,
            enabledVariants: merged.enabledVariants,
            updatedAt: now,
          }
        : p,
    );
  }

  const defaultProfile = getDefaultProfiles().find((d) => d.id === id);
  if (defaultProfile) {
    const merged = mergeProfileConfig(defaultProfile, config);
    const newOverride: UserProfile = {
      id,
      name: defaultProfile.name,
      scoringMode: merged.scoringMode,
      constraints: merged.constraints,
      statWeights: merged.statWeights,
      enabledVariants: merged.enabledVariants,
      baseVersion: defaultProfile.version,
      createdAt: now,
      updatedAt: now,
    };
    return [...profiles, newOverride];
  }

  return profiles;
}

function deleteUserProfile(
  profiles: readonly UserProfile[],
  id: string,
): readonly UserProfile[] {
  const isDefault = getDefaultProfiles().some((d) => d.id === id);
  const now = Date.now();

  if (isDefault) {
    const existing = profiles.find((p) => p.id === id);
    if (existing) {
      return profiles.map((p) => (p.id === id ? { ...p, deleted: true, updatedAt: now } : p));
    }
    const defaultProfile = getDefaultProfiles().find((d) => d.id === id);
    const marker: UserProfile = {
      id,
      name: "",
      scoringMode: defaultProfile?.scoringMode ?? "linear",
      constraints: [],
      statWeights: DEFAULT_STAT_WEIGHTS,
      enabledVariants: [],
      deleted: true,
      createdAt: now,
      updatedAt: now,
    };
    return [...profiles, marker];
  }

  return profiles.filter((p) => p.id !== id);
}

// ---------------------------------------------------------------------------
// Migration — v1 -> v2: add new ProfileConfig fields
// ---------------------------------------------------------------------------

interface LegacyUserProfile {
  readonly id: string;
  readonly name: string;
  readonly constraints: readonly SoftConstraint[];
  readonly baseVersion?: number | undefined;
  readonly deleted?: boolean | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;
  // New fields (may be present if partially migrated)
  readonly scoringMode?: ScoringMode | undefined;
  readonly statWeights?: Readonly<Record<StatName, number>> | undefined;
  readonly enabledVariants?: readonly string[] | undefined;
}

interface PersistedState {
  userProfiles: readonly LegacyUserProfile[];
  selectedProfileId: string | null;
}

function isPersistedState(value: unknown): value is PersistedState {
  if (value == null || typeof value !== "object") return false;
  if (!("userProfiles" in value) || !("selectedProfileId" in value)) return false;
  const obj = value as { userProfiles: unknown; selectedProfileId: unknown };
  return Array.isArray(obj.userProfiles) &&
    (obj.selectedProfileId === null || typeof obj.selectedProfileId === "string");
}

function migrateV1ToV2(persisted: PersistedState): ProfileState {
  const migratedProfiles = persisted.userProfiles.map((p): UserProfile => ({
    id: p.id,
    name: p.name,
    scoringMode: p.scoringMode ?? "linear",
    constraints: p.constraints,
    statWeights: p.statWeights ?? DEFAULT_STAT_WEIGHTS,
    enabledVariants: p.enabledVariants ?? [],
    baseVersion: p.baseVersion,
    deleted: p.deleted,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  return {
    userProfiles: migratedProfiles,
    selectedProfileId: persisted.selectedProfileId,
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useProfileStore = create<ProfileState & ProfileActions>()(
  persist(
    (set, get) => ({
      userProfiles: [],
      selectedProfileId: null,

      getProfiles: () => mergeProfiles(getDefaultProfiles(), get().userProfiles),

      getProfile: (id) => get().getProfiles().find((p) => p.id === id),

      createProfile: (name, config) => {
        const newProfile = createUserProfile(name, config);
        set((s) => ({
          userProfiles: [...s.userProfiles, newProfile],
          selectedProfileId: newProfile.id,
        }));
        return newProfile.id;
      },

      updateProfile: (id, config) => {
        set((s) => ({ userProfiles: updateUserProfileConfig(s.userProfiles, id, config) }));
      },

      renameProfile: (id, name) => {
        const now = Date.now();
        set((s) => {
          const existing = s.userProfiles.find((p) => p.id === id);
          if (existing) {
            return { userProfiles: s.userProfiles.map((p) => (p.id === id ? { ...p, name, updatedAt: now } : p)) };
          }
          const defaultProfile = getDefaultProfiles().find((d) => d.id === id);
          if (defaultProfile) {
            const newOverride: UserProfile = {
              id,
              name,
              scoringMode: defaultProfile.scoringMode,
              constraints: defaultProfile.constraints,
              statWeights: defaultProfile.statWeights,
              enabledVariants: defaultProfile.enabledVariants,
              baseVersion: defaultProfile.version,
              createdAt: now,
              updatedAt: now,
            };
            return { userProfiles: [...s.userProfiles, newOverride] };
          }
          return s;
        });
      },

      deleteProfile: (id) => {
        set((s) => ({
          userProfiles: deleteUserProfile(s.userProfiles, id),
          selectedProfileId: s.selectedProfileId === id ? null : s.selectedProfileId,
        }));
      },

      resetToDefault: (id) => {
        set((s) => ({ userProfiles: s.userProfiles.filter((p) => p.id !== id) }));
      },

      selectProfile: (id) => { set({ selectedProfileId: id }); },

      exportProfiles: () => doExportProfiles(get().getProfiles()),

      importProfiles: (json) => {
        const result = doImportProfiles(json, get().userProfiles);
        if (result.imported > 0) {
          set({ userProfiles: result.profiles });
        }
        return { imported: result.imported, errors: result.errors };
      },
    }),
    {
      name: "ao-profiles",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userProfiles: state.userProfiles,
        selectedProfileId: state.selectedProfileId,
      }),
      migrate: (persisted, version) => {
        if (version < 2 && isPersistedState(persisted)) {
          return migrateV1ToV2(persisted);
        }
        if (isPersistedState(persisted)) {
          return { userProfiles: persisted.userProfiles, selectedProfileId: persisted.selectedProfileId };
        }
        return { userProfiles: [], selectedProfileId: null };
      },
    },
  ),
);
