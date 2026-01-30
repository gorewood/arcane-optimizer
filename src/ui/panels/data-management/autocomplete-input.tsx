/**
 * AutocompleteInput — text input with datalist autocomplete suggestions.
 */

import { useId } from "react";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AutocompleteInputProps {
  readonly value: string;
  readonly placeholder?: string;
  readonly options: readonly string[];
  readonly onChange: (value: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AutocompleteInput({
  value,
  placeholder,
  options,
  onChange,
}: AutocompleteInputProps): React.JSX.Element {
  const listId = useId();

  return (
    <>
      <Input
        value={value}
        placeholder={placeholder}
        list={listId}
        className="h-8 text-sm"
        onChange={(e) => { onChange(e.target.value); }}
      />
      <datalist id={listId}>
        {options.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
    </>
  );
}
