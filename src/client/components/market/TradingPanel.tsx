import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { MarketSymbol, SubredditQuote } from '../../../shared/types/market';
import { SurfaceCard } from '../ui/SurfaceCard';
import { SymbolSelect } from './SymbolSelect';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../lib/utils';

type TradingPanelProps = {
  quote: SubredditQuote;
  quotes: SubredditQuote[];
  quantityInput: string;
  numericQuantity: number | null;
  onQuantityChange: (quantity: string) => void;
  onSymbolChange: (symbol: MarketSymbol) => void;
  onSubmit: (side: 'BUY' | 'SELL') => void;
  isSubmitting?: boolean | undefined;
  availableCash: number;
  ownedShares: number;
  feedback?: { type: 'success' | 'error'; message: string } | null | undefined;
};

const buttonVariants = {
  initial: { scale: 1 },
  tap: { scale: 0.98 },
};

export const TradingPanel = ({
  quote,
  quotes,
  quantityInput,
  numericQuantity,
  onQuantityChange,
  onSymbolChange,
  onSubmit,
  isSubmitting = false,
  availableCash,
  ownedShares,
  feedback,
}: TradingPanelProps) => {
  const effectiveQuantity = numericQuantity ?? 0;
  const estimatedCost = useMemo(() => effectiveQuantity * quote.price, [effectiveQuantity, quote.price]);
  const maxAffordable = useMemo(() => {
    if (quote.price <= 0) return 0;
    return Math.max(0, Math.floor(availableCash / quote.price));
  }, [availableCash, quote.price]);
  const buyExceedsCash = effectiveQuantity > maxAffordable;
  const sellExceedsShares = effectiveQuantity > ownedShares;
  const buyDisabled =
    isSubmitting || maxAffordable === 0 || buyExceedsCash || effectiveQuantity <= 0 || !numericQuantity;
  const sellDisabled =
    isSubmitting || ownedShares === 0 || sellExceedsShares || effectiveQuantity <= 0 || !numericQuantity;

  return (
    <SurfaceCard padding="md" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-[color:var(--km-color-text-primary)]">
          Place instant trade
        </h3>
        <p className="text-sm text-[color:var(--km-color-text-secondary)]">
          Market orders fill immediately at the current quoted price. Prices shift every 2 minutes.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--km-color-text-secondary)]">
            Subreddit
          </label>
          <SymbolSelect
            value={quote.symbol}
            onValueChange={(value) => onSymbolChange(value as MarketSymbol)}
            quotes={quotes}
            disabled={isSubmitting}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--km-color-text-secondary)]">
            Quantity
          </label>
          <input
            className="w-full rounded-[var(--km-radius-md)] border border-[color:var(--km-color-border)] bg-[color:var(--km-color-bg-secondary)] px-4 py-3 text-base font-semibold text-[color:var(--km-color-text-primary)] shadow-inner shadow-black/5 focus:outline-none focus:ring-2 focus:ring-[color:var(--km-color-blue)] focus:ring-offset-2 focus:ring-offset-[color:var(--km-color-bg-card)]"
            type="number"
            min={1}
            step={1}
            value={quantityInput}
            disabled={isSubmitting}
            onChange={(event) => onQuantityChange(event.target.value)}
          />
        </div>
      </div>

      {feedback ? (
        <div
          className={cn(
            'rounded-[var(--km-radius-md)] border px-4 py-3 text-sm font-semibold',
            feedback.type === 'success'
              ? 'border-[color-mix(in_srgb,var(--km-color-green)_32%,transparent)] text-[color:var(--km-color-green)] bg-[color-mix(in_srgb,var(--km-color-green)_12%,transparent)]'
              : 'border-[color-mix(in_srgb,var(--km-color-red)_32%,transparent)] text-[color:var(--km-color-red)] bg-[color-mix(in_srgb,var(--km-color-red)_12%,transparent)]'
          )}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <motion.button
          variants={buttonVariants}
          initial="initial"
          whileTap="tap"
          className={cn(
            'group flex items-center justify-between rounded-[var(--km-radius-lg)] border px-5 py-4 text-left text-base font-semibold transition-colors',
            'border-[color-mix(in_srgb,var(--km-color-green)_28%,transparent)] bg-[color-mix(in_srgb,var(--km-color-green)_10%,transparent)] text-[color:var(--km-color-text-primary)]',
            'focus:outline-none focus:ring-2 focus:ring-[color:var(--km-color-green)] focus:ring-offset-2 focus:ring-offset-[color:var(--km-color-bg-card)]',
            buyDisabled && 'cursor-not-allowed opacity-60'
          )}
          disabled={buyDisabled}
          onClick={() => onSubmit('BUY')}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--km-color-green)]">
              Buy
            </span>
            <span className="rounded-full bg-[color-mix(in_srgb,var(--km-color-green)_22%,transparent)] px-2 py-0.5 text-xs font-medium text-[color:var(--km-color-green)]">
              Market
            </span>
          </div>
          <span className="text-sm font-medium text-[color:var(--km-color-text-secondary)]">
            {formatCurrency(quote.price)}
          </span>
        </motion.button>
        <motion.button
          variants={buttonVariants}
          initial="initial"
          whileTap="tap"
          className={cn(
            'group flex items-center justify-between rounded-[var(--km-radius-lg)] border px-5 py-4 text-left text-base font-semibold transition-colors',
            'border-[color-mix(in_srgb,var(--km-color-red)_28%,transparent)] bg-[color-mix(in_srgb,var(--km-color-red)_10%,transparent)] text-[color:var(--km-color-text-primary)]',
            'focus:outline-none focus:ring-2 focus:ring-[color:var(--km-color-red)] focus:ring-offset-2 focus:ring-offset-[color:var(--km-color-bg-card)]',
            sellDisabled && 'cursor-not-allowed opacity-60'
          )}
          disabled={sellDisabled}
          onClick={() => onSubmit('SELL')}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--km-color-red)]">
              Sell
            </span>
            <span className="rounded-full bg-[color-mix(in_srgb,var(--km-color-red)_22%,transparent)] px-2 py-0.5 text-xs font-medium text-[color:var(--km-color-red)]">
              Market
            </span>
          </div>
          <span className="text-sm font-medium text-[color:var(--km-color-text-secondary)]">
            {formatCurrency(quote.price)}
          </span>
        </motion.button>
      </div>

      <div className="rounded-[var(--km-radius-md)] border border-[color:var(--km-color-border)] bg-[color:var(--km-color-bg-secondary)] px-4 py-3 text-sm text-[color:var(--km-color-text-secondary)]">
        Estimated total: {formatCurrency(estimatedCost)} — You can buy up to{' '}
        <span className="font-semibold">{maxAffordable}</span> shares with current cash. You hold{' '}
        <span className="font-semibold">{ownedShares}</span> shares of this subreddit.
        {isSubmitting ? ' Submitting order…' : ''}
        {!isSubmitting && !numericQuantity ? ' Enter a quantity to trade.' : ''}
        {!isSubmitting && numericQuantity && buyExceedsCash
          ? ' Reduce quantity to fit cash balance.'
          : ''}
        {!isSubmitting && numericQuantity && sellExceedsShares
          ? ' Reduce quantity to the shares you own.'
          : ''}
      </div>
    </SurfaceCard>
  );
};
