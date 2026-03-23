import { useEffect, useMemo, useRef, useState } from 'react';
import type { SelectOption } from '../../../types/common';
import AppIcon from '../icons/AppIcon';

interface FilterSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

function FilterSelect({
  value,
  options,
  onChange,
  disabled = false,
}: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={['relative', isOpen ? 'z-[70]' : 'z-10'].join(' ')}
    >
      <button
        type="button"
        className={[
          'inline-flex min-h-[46px] w-full items-center justify-between gap-3 rounded-xl border border-border-soft bg-background-elevated px-4 text-left',
          'text-sm font-medium text-text-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.02)] outline-none transition duration-fast',
          'hover:border-border-accent hover:bg-surface-card focus-visible:border-border-accent focus-visible:ring-4 focus-visible:ring-primary/10',
          'disabled:cursor-not-allowed disabled:opacity-60',
        ].join(' ')}
        onClick={() => setIsOpen((current) => !current)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{selectedOption?.label ?? 'Select'}</span>
        <AppIcon
          name="chevron-down"
          className={[
            'h-4 w-4 shrink-0 text-text-muted transition duration-fast',
            isOpen ? 'rotate-180 text-text-secondary' : '',
          ].join(' ')}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 top-[calc(100%+8px)] z-[80] w-full overflow-hidden rounded-xl border border-border-accent/70 bg-surface-card p-1.5 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.58)]"
          role="listbox"
        >
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={[
                    'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition duration-fast',
                    isSelected
                      ? 'bg-primary/16 text-text-primary'
                      : 'text-text-secondary hover:bg-background-subtle hover:text-text-primary',
                  ].join(' ')}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? (
                    <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default FilterSelect;
