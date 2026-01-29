/**
 * FormField — labeled form field wrapper.
 */

import { Label } from "@/components/ui/label";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FormFieldProps {
  readonly label: string;
  readonly children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FormField({ label, children }: FormFieldProps): React.JSX.Element {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-text-muted">{label}</Label>
      {children}
    </div>
  );
}
