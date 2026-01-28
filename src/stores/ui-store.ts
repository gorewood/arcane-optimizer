/**
 * UIStore — manages transient UI state.
 * No localStorage persistence.
 */

import { create } from "zustand";

// ---------------------------------------------------------------------------
// State & Action Types
// ---------------------------------------------------------------------------

export interface UIState {
  selectedResultIndex: number | null;
  expandedCardIndices: ReadonlySet<number>;
  activePanel: "gear" | "optimizer";
}

export interface UIActions {
  selectResult: (index: number | null) => void;
  toggleCardExpanded: (index: number) => void;
  setExpandedCards: (indices: ReadonlySet<number>) => void;
  setActivePanel: (panel: UIState["activePanel"]) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toggleNumericSetItem(set: ReadonlySet<number>, value: number): ReadonlySet<number> {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUIStore = create<UIState & UIActions>()((set) => ({
  selectedResultIndex: null,
  expandedCardIndices: new Set<number>(),
  activePanel: "optimizer" as const,

  selectResult: (index: number | null): void => {
    set({ selectedResultIndex: index });
  },

  toggleCardExpanded: (index: number): void => {
    set((s) => ({
      expandedCardIndices: toggleNumericSetItem(s.expandedCardIndices, index),
    }));
  },

  setExpandedCards: (indices: ReadonlySet<number>): void => {
    set({ expandedCardIndices: indices });
  },

  setActivePanel: (panel: UIState["activePanel"]): void => {
    set({ activePanel: panel });
  },
}));
