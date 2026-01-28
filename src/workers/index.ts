/**
 * Web Worker module — search worker factory and message types.
 */

export type { WorkerRequest, WorkerResponse } from "./search-worker";

/** Create a new search worker instance (Vite module worker pattern). */
export function createSearchWorker(): Worker {
  return new Worker(
    new URL("./search-worker.ts", import.meta.url),
    { type: "module" },
  );
}
