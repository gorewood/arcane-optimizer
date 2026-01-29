/**
 * SearchInput — filter input for data management.
 */

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SearchInput({
  value,
  onChange,
}: SearchInputProps): React.JSX.Element {
  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none">
        Search
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        placeholder="Filter by name..."
        className="w-full rounded-md border border-border-default bg-bg-surface px-2 py-1.5 pl-16 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-gold focus:outline-none focus:ring-1 focus:ring-accent-gold"
      />
    </div>
  );
}
