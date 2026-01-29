/**
 * TierToggle — toggle between tier 1 and tier 2.
 */

import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TierToggleProps {
  readonly tier: 1 | 2;
  readonly onChange: (tier: 1 | 2) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TierToggle({
  tier,
  onChange,
}: TierToggleProps): React.JSX.Element {
  return (
    <div className="flex gap-1">
      <Button
        variant={tier === 1 ? "default" : "outline"}
        size="xs"
        onClick={() => { onChange(1); }}
        className="min-w-[48px]"
      >
        Tier 1
      </Button>
      <Button
        variant={tier === 2 ? "default" : "outline"}
        size="xs"
        onClick={() => { onChange(2); }}
        className="min-w-[48px]"
      >
        Tier 2
      </Button>
    </div>
  );
}
