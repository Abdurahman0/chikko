import AppIcon from '../icons/AppIcon';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  disabled = false,
}: SearchInputProps) {
  return (
    <div className="search-input relative max-w-full flex-1 basis-full min-[640px]:basis-72 min-[640px]:max-w-[360px]">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
        <AppIcon name="search" className="h-4 w-4" aria-hidden="true" />
      </span>
      <input
        type="search"
        className={[
          'search-input__field min-h-[46px] w-full appearance-none rounded-xl border border-border-soft bg-background-elevated pl-10 pr-4',
          '[-webkit-appearance:none] text-sm text-text-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.02)] outline-none transition',
          'duration-fast placeholder:text-text-muted focus:border-border-accent focus:bg-surface-card focus:ring-4 focus:ring-primary/10',
          'disabled:cursor-not-allowed disabled:opacity-60',
        ].join(' ')}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

export default SearchInput;
