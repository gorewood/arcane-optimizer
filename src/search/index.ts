/**
 * Search module — constraint validation, stats computation, fitness scoring,
 * enhancement assignment, and strategies.
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

export {
  computeFitness,
  FITNESS_PRESETS,
  PRESET_NAMES,
} from "./fitness";

export { ExhaustiveSearch } from "./exhaustive";
export { GeneticSearch } from "./genetic";

export type { EnhancementMode, EnhancedLoadoutResult } from "./enhance";
export { greedyAssignEnhancements, budgetAwareAssign } from "./enhance";
