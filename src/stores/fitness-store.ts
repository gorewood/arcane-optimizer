/**
 * FitnessStore — manages the fitness function configuration
 * (soft constraints and presets). Persisted to localStorage.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SoftConstraint } from "@/models/types";

// ---------------------------------------------------------------------------
// State & Action Types
// ---------------------------------------------------------------------------

export interface FitnessState {
  constraints: readonly SoftConstraint[];
  activePresetName: string | null;
}

export interface FitnessActions {
  setConstraints: (constraints: readonly SoftConstraint[]) => void;
  addConstraint: (constraint: SoftConstraint) => void;
  removeConstraint: (index: number) => void;
  updateConstraint: (index: number, constraint: SoftConstraint) => void;
  loadPreset: (name: string, constraints: readonly SoftConstraint[]) => void;
  clearPreset: () => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_MAGE_CONSTRAINTS: SoftConstraint[] = [
  { stat: "defense", type: "atLeast", value: 700, weight: 100 },
  { stat: "power", type: "atLeast", value: 100, weight: 90 },
  { stat: "dexterity", type: "target", value: 300, weight: 80, hardCap: 330 },
  { stat: "size", type: "target", value: 300, weight: 70, hardCap: 330 },
  { stat: "insanity", type: "atMost", value: 1, weight: 100 },
  { stat: "drawback", type: "atMost", value: 2, weight: 100 },
];

const INITIAL_STATE: FitnessState = {
  constraints: DEFAULT_MAGE_CONSTRAINTS,
  activePresetName: "Mage Build",
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useFitnessStore = create<FitnessState & FitnessActions>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setConstraints: (constraints: readonly SoftConstraint[]): void => {
        set({ constraints, activePresetName: null });
      },

      addConstraint: (constraint: SoftConstraint): void => {
        set((s) => ({
          constraints: [...s.constraints, constraint],
          activePresetName: null,
        }));
      },

      removeConstraint: (index: number): void => {
        set((s) => ({
          constraints: s.constraints.filter((_, i) => i !== index),
          activePresetName: null,
        }));
      },

      updateConstraint: (index: number, constraint: SoftConstraint): void => {
        set((s) => ({
          constraints: s.constraints.map((c, i) => (i === index ? constraint : c)),
          activePresetName: null,
        }));
      },

      loadPreset: (name: string, constraints: readonly SoftConstraint[]): void => {
        set({ constraints, activePresetName: name });
      },

      clearPreset: (): void => {
        set({ constraints: [], activePresetName: null });
      },
    }),
    {
      name: "ao-fitness",
    },
  ),
);
