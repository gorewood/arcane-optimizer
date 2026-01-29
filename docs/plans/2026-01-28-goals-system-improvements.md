# Goals System Improvements Plan

## Current State Analysis

### Constraint Types (6 operators)

| Type | Scoring | value | hardCap | Weight Used |
|------|---------|-------|---------|-------------|
| `minimize` | `-(val × weight)` | ignored | N/A | ✓ linear |
| `maximize` | `val × weight` | ignored | N/A | ✓ linear |
| `atLeast` | below: `-(value-val) × weight × 10`; above: `(val-value) × weight × 0.1` | required | N/A | ✓ asymmetric |
| `atMost` | within: `0`; above: `-(val-value) × weight × 10` | required | disqualify | ✓ asymmetric |
| `target` | `-(|val-value| × weight)` | required | disqualify | ✓ linear distance |
| `exactly` | match: `0`; else: disqualify | required | N/A | ✗ ignored |

---

## Issues Identified

### 1. Input Validation Gaps

**No normalization on blur:**
- Leading zeros displayed (e.g., "007" stays as "007")
- Should auto-correct to clean integer format

**No bounds enforcement:**
- Values can be negative (some stats can't be negative)
- No practical upper bounds (e.g., 99999 defense doesn't exist)

**No type-specific validation:**
- Stats like `insanity` and `drawback` are typically small integers (0-5)
- Others like `defense` are large (500-2000)

### 2. Linked Caps Not Enforced

**Logical inconsistency allowed:**

```
target: 300, hardCap: 100  ← impossible to hit target
atMost: 5, hardCap: 3     ← hardCap makes the value meaningless
```

**Required invariants:**
- For `target`: `hardCap >= value` (target must be reachable)
- For `atMost`: `hardCap >= value` (cap should be the outer limit)

### 3. Operator Gaps

**Missing: Range constraint (`between`)**

Common use case: "dexterity should be 280-320"

Currently requires:
```
dexterity ≥ 280  (atLeast)
dexterity ≤ 320  (atMost, hardCap optional)
```

Could be single constraint:
```
dexterity ∈ [280, 320]  (between)
```

### 4. Scoring Soundness Issues

**`atLeast` gives unbounded bonus:**
```typescript
// Above threshold: keeps adding score forever
return (val - value) * weight * 0.1;
// If val=2000, value=500, weight=100 → score = +150
```
This can dominate other constraints unexpectedly.

**`exactly` ignores weight:**
```typescript
// Weight has no effect - just 0 or disqualify
return val === value ? 0 : null;
```
For tie-breaking between "exactly" constraints of different importance, weight should matter.

**Asymmetric penalties vary wildly:**
- `atLeast` below: 10× penalty, above: 0.1× bonus
- `atMost` below: 0, above: 10× penalty
- Ratio is 100:1 for atLeast (penalty:bonus)

---

## Proposed Changes

### Phase 1: Input Validation & Auto-Correction

**A. Normalize on blur:**
```typescript
// Strip leading zeros, format as integer
onBlur={() => {
  const normalized = Math.round(value);
  if (normalized !== value) onChange(normalized);
}}
```

**B. Enforce hardCap ≥ value:**

When `value` changes:
- If `hardCap` is defined and `hardCap < newValue`, set `hardCap = newValue`

When `hardCap` changes:
- If `newHardCap < value`, set `value = newHardCap`

**C. Add min/max bounds to inputs:**
- `value`: min 0, max 9999
- `hardCap`: min 0, max 9999
- Show stat-specific hints (e.g., "typical: 0-5" for insanity)

### Phase 2: Add `between` Operator

**Type definition:**
```typescript
type ConstraintType = ... | "between";
```

**Scoring function:**
```typescript
function scoreBetween(
  val: number,
  weight: number,
  min: number,      // reuse 'value' field
  max: number | undefined,  // reuse 'hardCap' field
): number | null {
  const effectiveMax = max ?? Infinity;
  if (val < min) {
    return -((min - val) * weight * 10);  // penalty for below range
  }
  if (val > effectiveMax) {
    return -((val - effectiveMax) * weight * 10);  // penalty for above range
  }
  return 0;  // in range = no penalty
}
```

**UI changes:**
- Show both `value` (as "min") and `hardCap` (as "max") for `between`
- Label changes: "min: [__]  max: [__]"
- Enforce `max >= min`

### Phase 3: Scoring Refinements (Optional)

**A. Cap the `atLeast` bonus:**
```typescript
// Instead of unbounded bonus above threshold:
const bonus = Math.min((val - value) * weight * 0.1, weight);
// Caps bonus at 1× weight
```

**B. Make `exactly` use weight for tie-breaking:**
```typescript
// Instead of just 0 on match:
return val === value ? weight * 0.01 : null;
// Exact matches with higher weight score slightly better
```

---

## Implementation Order

1. **Phase 1A**: Add onBlur normalization to ValueInput and HardCapInput
2. **Phase 1B**: Enforce hardCap ≥ value invariant in constraint row
3. **Phase 1C**: Add validation visual feedback (optional warning styling)
4. **Phase 2**: Add `between` operator (type, scorer, UI)
5. **Phase 3**: Scoring refinements (evaluate if needed after testing)

---

## Questions for Review

1. **Should `between` disqualify outside range or just penalize heavily?**
   - Option A: Heavy penalty (10×), never disqualify
   - Option B: Add optional hard floor/ceiling that disqualifies
   - Recommend: Option A (consistent with atLeast/atMost soft behavior)

2. **Should we cap the `atLeast` bonus?**
   - Current: unbounded (val - value) × weight × 0.1
   - Proposed: cap at 1× weight
   - Risk: may change behavior of existing presets

3. **Stat-specific bounds - how much validation?**
   - Minimal: just min ≥ 0
   - Moderate: reasonable maxes per stat (defense ≤ 5000, insanity ≤ 10)
   - Aggressive: enforce game-accurate ranges
   - Recommend: Minimal for now, add hints as tooltips

4. **Should we rename `value` → `target` for clarity?**
   - Would make code clearer
   - Breaking change for stored presets (needs migration)
   - Recommend: No, too much churn for modest benefit
