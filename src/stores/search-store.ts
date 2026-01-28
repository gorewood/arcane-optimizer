/**
 * SearchStore — manages search execution state.
 * Transient (no localStorage persistence).
 */

import { create } from "zustand";
import type { EnhancementMode, SearchResult } from "@/models/types";

// ---------------------------------------------------------------------------
// State & Action Types
// ---------------------------------------------------------------------------

export type SearchStatus = "idle" | "running" | "complete" | "error";
export type Algorithm = "exhaustive" | "genetic";

export interface SearchState {
  status: SearchStatus;
  progress: number;
  results: readonly SearchResult[];
  error: string | null;
  algorithm: Algorithm;
  enhancementMode: EnhancementMode;
}

export interface SearchActions {
  startSearch: () => void;
  setProgress: (progress: number) => void;
  setResults: (results: readonly SearchResult[]) => void;
  setError: (error: string) => void;
  reset: () => void;
  setAlgorithm: (algorithm: Algorithm) => void;
  setEnhancementMode: (mode: EnhancementMode) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const INITIAL_STATE: SearchState = {
  status: "idle",
  progress: 0,
  results: [],
  error: null,
  algorithm: "exhaustive",
  enhancementMode: "budget-aware",
};

export const useSearchStore = create<SearchState & SearchActions>()((set) => ({
  ...INITIAL_STATE,

  startSearch: (): void => {
    set({ status: "running", progress: 0, results: [], error: null });
  },

  setProgress: (progress: number): void => {
    set({ progress });
  },

  setResults: (results: readonly SearchResult[]): void => {
    set({ status: "complete", results });
  },

  setError: (error: string): void => {
    set({ status: "error", error });
  },

  reset: (): void => {
    set(INITIAL_STATE);
  },

  setAlgorithm: (algorithm: Algorithm): void => {
    set({ algorithm });
  },

  setEnhancementMode: (mode: EnhancementMode): void => {
    set({ enhancementMode: mode });
  },
}));
