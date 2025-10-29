import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { SubredditQuote } from '../../../shared/types/market';
import { cn } from '../../lib/utils';
import { formatCurrency, formatPercent } from '../../utils/format';

type SymbolSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  quotes: SubredditQuote[];
  disabled?: boolean;
};

const SelectItem = ({ className, ...props }: Select.SelectItemProps) => (
  <Select.Item
    className={cn(
      'relative flex cursor-pointer select-none items-center justify-between rounded-[var(--km-radius-md)] px-3 py-2 text-sm font-medium text-[color:var(--km-color-text-primary)] outline-none data-[highlighted]:bg-[color-mix(in_srgb,var(--km-color-orange)_12%,transparent)]',
      className
    )}
    {...props}
  >
    <Select.ItemText>{props.children}</Select.ItemText>
    <Select.ItemIndicator className="absolute right-4 inline-flex items-center">
      <Check size={16} className="text-[color:var(--km-color-orange)]" />
    </Select.ItemIndicator>
  </Select.Item>
);

export const SymbolSelect = ({ value, onValueChange, quotes, disabled = false }: SymbolSelectProps) => (
  <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
    <Select.Trigger
      className={cn(
        'inline-flex w-full min-w-[0] items-center justify-between rounded-[var(--km-radius-md)] border border-[color:var(--km-color-border)] sm:w-auto sm:min-w-[240px]',
        'bg-[color:var(--km-color-bg-secondary)] px-4 py-3 text-sm font-semibold text-[color:var(--km-color-text-primary)] shadow-inner shadow-black/5 transition-colors hover:border-[color:var(--km-color-orange)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--km-color-orange)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--km-color-bg-card)]',
        disabled && 'cursor-not-allowed opacity-60 hover:border-[color:var(--km-color-border)]'
      )}
      aria-label="Select subreddit"
    >
      <Select.Value />
      <Select.Icon>
        <ChevronDown size={18} className="text-[color:var(--km-color-text-secondary)]" />
      </Select.Icon>
    </Select.Trigger>
    <Select.Content
      className="z-50 overflow-hidden rounded-[var(--km-radius-lg)] border border-[color:var(--km-color-border)] bg-[color:var(--km-color-bg-card)] shadow-[0_24px_60px_rgba(15,23,42,0.2)]"
      position="popper"
      sideOffset={8}
    >
      <Select.ScrollUpButton className="flex items-center justify-center py-1 text-[color:var(--km-color-text-secondary)]">
        <ChevronUp size={16} />
      </Select.ScrollUpButton>
      <Select.Viewport className="p-2">
        {quotes.map((quote) => {
          const positive = quote.changePercent >= 0;
          return (
            <SelectItem key={quote.symbol} value={quote.symbol}>
              <div className="flex w-full items-center justify-between gap-4">
                <span>{quote.displayName}</span>
                <span className="flex items-center gap-2 text-xs font-semibold text-[color:var(--km-color-text-secondary)]">
                  {formatCurrency(quote.price)}
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5',
                      positive
                        ? 'bg-[color-mix(in_srgb,var(--km-color-green)_18%,transparent)] text-[color:var(--km-color-green)]'
                        : 'bg-[color-mix(in_srgb,var(--km-color-red)_18%,transparent)] text-[color:var(--km-color-red)]'
                    )}
                  >
                    {positive ? '+' : ''}
                    {formatPercent(quote.changePercent)}
                  </span>
                </span>
              </div>
            </SelectItem>
          );
        })}
      </Select.Viewport>
      <Select.ScrollDownButton className="flex items-center justify-center py-1 text-[color:var(--km-color-text-secondary)]">
        <ChevronDown size={16} />
      </Select.ScrollDownButton>
    </Select.Content>
  </Select.Root>
);
