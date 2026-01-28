/**
 * Search module — constraint validation, stats computation, fitness scoring,
 * and strategies.
 */

export type { ConstraintViolation, ValidationResult } from "./constraints";
export {
  computeSlotStats,
  DEFAULT_HARD_CONSTRAINTS,
  validateLoadout,
} from "./constraints";

export {
  ATLANTEAN_BONUS_VALUES,
  computeLoadoutStats,
  emptyStats,
  getValidAtlanteanChoices,
  resolveAtlanteanBonus,
  STAT_NAMES,
  sumStats,
} from "./stats";
