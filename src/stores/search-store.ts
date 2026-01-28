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

export interface GAParams {
  populationSize: number;
  generations: number;
  mutationRate: number;
}

/** Exit metadata from search completion */
export interface ExitMetadata {
  reason: "complete" | "stagnation" | "cancelled" | "timeout";
  finalGeneration?: number;
  totalGenerations?: number;
}

export interface SearchState {
  status: SearchStatus;
  progress: number;
  results: readonly SearchResult[];
  /** Preview results shown during search (swapped as better ones are found) */
  previewResults: readonly SearchResult[];
  error: string | null;
  algorithm: Algorithm;
  enhancementMode: EnhancementMode;
  gaParams: GAParams;
  exitMetadata: ExitMetadata | null;
}

export interface SearchActions {
  startSearch: () => void;
  setProgress: (progress: number) => void;
  setPreviewResults: (results: readonly SearchResult[]) => void;
  setResults: (results: readonly SearchResult[], exitMetadata?: ExitMetadata) => void;
  setError: (error: string) => void;
  reset: () => void;
  setAlgorithm: (algorithm: Algorithm) => void;
  setEnhancementMode: (mode: EnhancementMode) => void;
  setGAParams: (params: Partial<GAParams>) => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_GA_PARAMS: GAParams = {
  populationSize: 200,
  generations: 1000,  // Increased from 500 for longer search
  mutationRate: 0.15,
};

const INITIAL_STATE: SearchState = {
  status: "idle",
  progress: 0,
  results: [],
  previewResults: [],
  error: null,
  algorithm: "exhaustive",
  enhancementMode: "budget-aware",
  gaParams: DEFAULT_GA_PARAMS,
  exitMetadata: null,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSearchStore = create<SearchState & SearchActions>()((set) => ({
  ...INITIAL_STATE,

  startSearch: (): void => {
    set({ status: "running", progress: 0, results: [], previewResults: [], error: null });
  },

  setProgress: (progress: number): void => {
    set({ progress });
  },

  setPreviewResults: (previewResults: readonly SearchResult[]): void => {
    // Update both previewResults and results so UI shows live updates
    set({ previewResults, results: previewResults });
  },

  setResults: (results: readonly SearchResult[], exitMetadata?: ExitMetadata): void => {
    set({ status: "complete", results, exitMetadata: exitMetadata ?? null });
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

  setGAParams: (params: Partial<GAParams>): void => {
    set((s) => ({ gaParams: { ...s.gaParams, ...params } }));
  },
}));
