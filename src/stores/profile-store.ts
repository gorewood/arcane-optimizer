/**
 * ProfileStore — manages user fitness profiles.
 *
 * Merges default profiles from JSON config with user overrides from localStorage.
 * Provides CRUD operations and export/import functionality.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SoftConstraint } from "@/models/types";
import type { DefaultProfile, Profile, UserProfile } from "@/data/profile-types";
import { loadDefaultProfiles } from "@/data/loaders";
import { userProfilesStorageSchema } from "@/data/schemas";

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
  createProfile: (name: string, constraints: readonly SoftConstraint[]) => string;
  updateProfile: (id: string, constraints: readonly SoftConstraint[]) => void;
  renameProfile: (id: string, name: string) => void;
  deleteProfile: (id: string) => void;
  resetToDefault: (id: string) => void;
  selectProfile: (id: string | null) => void;
  exportProfiles: () => string;
  importProfiles: (json: string) => { imported: number; errors: string[] };
}

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
        constraints: user.constraints,
        isDefault: true,
        isModified: true,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } else {
      result.push({
        id: def.id,
        name: def.name,
        constraints: def.constraints,
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
        constraints: user.constraints,
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
        constraints: p.constraints,
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
  constraints: readonly SoftConstraint[],
): UserProfile {
  const now = Date.now();
  return { id: generateId(), name, constraints, createdAt: now, updatedAt: now };
}

function updateUserProfileConstraints(
  profiles: readonly UserProfile[],
  id: string,
  constraints: readonly SoftConstraint[],
): readonly UserProfile[] {
  const now = Date.now();
  const existing = profiles.find((p) => p.id === id);

  if (existing) {
    return profiles.map((p) => (p.id === id ? { ...p, constraints, updatedAt: now } : p));
  }

  const defaultProfile = getDefaultProfiles().find((d) => d.id === id);
  if (defaultProfile) {
    const newOverride: UserProfile = {
      id,
      name: defaultProfile.name,
      constraints,
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
    const marker: UserProfile = {
      id, name: "", constraints: [], deleted: true, createdAt: now, updatedAt: now,
    };
    return [...profiles, marker];
  }

  return profiles.filter((p) => p.id !== id);
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

      createProfile: (name, constraints) => {
        const newProfile = createUserProfile(name, constraints);
        set((s) => ({
          userProfiles: [...s.userProfiles, newProfile],
          selectedProfileId: newProfile.id,
        }));
        return newProfile.id;
      },

      updateProfile: (id, constraints) => {
        set((s) => ({ userProfiles: updateUserProfileConstraints(s.userProfiles, id, constraints) }));
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
              id, name, constraints: defaultProfile.constraints,
              baseVersion: defaultProfile.version, createdAt: now, updatedAt: now,
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
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userProfiles: state.userProfiles,
        selectedProfileId: state.selectedProfileId,
      }),
    },
  ),
);
