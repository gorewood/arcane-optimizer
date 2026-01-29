/**
 * UIStore — manages transient UI state.
 * Tab state persists via URL hash (e.g., #gear, #data).
 */

import { create } from "zustand";

// ---------------------------------------------------------------------------
// State & Action Types
// ---------------------------------------------------------------------------

export type PanelId = "gear" | "optimizer" | "data" | "help";

export interface UIState {
  selectedResultIndex: number | null;
  expandedCardIndices: ReadonlySet<number>;
  activePanel: PanelId;
}

export interface UIActions {
  selectResult: (index: number | null) => void;
  toggleCardExpanded: (index: number) => void;
  setExpandedCards: (indices: ReadonlySet<number>) => void;
  setActivePanel: (panel: UIState["activePanel"]) => void;
}

// ---------------------------------------------------------------------------
// URL Hash Helpers
// ---------------------------------------------------------------------------

/** Type guard for valid panel IDs. */
function isValidPanel(value: string): value is PanelId {
  return value === "optimizer" || value === "gear" || value === "data" || value === "help";
}

/** Read panel from URL hash, defaulting to "optimizer". */
function getPanelFromHash(): PanelId {
  const hash = window.location.hash.slice(1); // remove #
  return isValidPanel(hash) ? hash : "optimizer";
}

/** Update URL hash without triggering navigation. */
function setHashSilently(panel: PanelId): void {
  const newHash = panel === "optimizer" ? "" : `#${panel}`;
  const url = new URL(window.location.href);
  url.hash = newHash;
  window.history.replaceState(null, "", url.toString());
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
  activePanel: getPanelFromHash(),

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

  setActivePanel: (panel: PanelId): void => {
    setHashSilently(panel);
    set({ activePanel: panel });
  },
}));

// ---------------------------------------------------------------------------
// Hash Change Listener (back/forward navigation)
// ---------------------------------------------------------------------------

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => {
    const panel = getPanelFromHash();
    const current = useUIStore.getState().activePanel;
    if (panel !== current) {
      useUIStore.setState({ activePanel: panel });
    }
  });
}
