/**
 * Search module — constraint validation, fitness scoring, and strategies.
 */

export type { ConstraintViolation, ValidationResult } from "./constraints";
export {
  computeSlotStats,
  DEFAULT_HARD_CONSTRAINTS,
  validateLoadout,
} from "./constraints";
