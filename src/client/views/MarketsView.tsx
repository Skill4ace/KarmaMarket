import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { MarketSymbol, SubredditQuote, TradeEvent } from '../../shared/types/market';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { PriceChartCard } from '../components/market/PriceChartCard';
import { TradingPanel } from '../components/market/TradingPanel';
import { TradeTape } from '../components/market/TradeTape';
import { formatCurrency, formatPercent } from '../utils/format';
import { cn } from '../lib/utils';

type MarketsViewProps = {
  quotes: SubredditQuote[];
  activeQuote: SubredditQuote;
  onSelectSymbol: (symbol: MarketSymbol) => void;
  quantityInput: string;
  numericQuantity: number | null;
  onQuantityChange: (value: string) => void;
  onSubmitOrder: (side: 'BUY' | 'SELL') => void;
  trades: TradeEvent[];
  isLoading?: boolean | undefined;
  hasError?: boolean | undefined;
  spotlight: MarketSymbol[];
  isSubmitting?: boolean | undefined;
  availableCash: number;
  ownedShares: number;
  tradeFeedback?: { type: 'success' | 'error'; message: string } | null | undefined;
};

export const MarketsView = ({
  quotes,
  activeQuote,
  onSelectSymbol,
  quantityInput,
  numericQuantity,
  onQuantityChange,
  onSubmitOrder,
  trades,
  isLoading = false,
  hasError = false,
  spotlight,
  isSubmitting = false,
  availableCash,
  ownedShares,
  tradeFeedback,
}: MarketsViewProps) => {
  const spotlightQuotes = (spotlight.length ? spotlight : quotes.slice(0, 4).map((q) => q.symbol))
    .map((symbol) => quotes.find((quote) => quote.symbol === symbol))
    .filter((quote): quote is SubredditQuote => Boolean(quote))
    .map((quote) => ({ ...quote, positive: quote.changePercent >= 0 }));

  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-8">
        <PriceChartCard
          quote={activeQuote}
          quotes={quotes}
          onSymbolChange={onSelectSymbol}
          isLoading={isLoading}
          hasError={hasError}
        />

        <SurfaceCard padding="md" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-[color:var(--km-color-text-primary)]">
              Spotlight movers
            </h3>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--km-color-text-secondary)]">
              24H heat check
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {spotlightQuotes.length ? (
              spotlightQuotes.map((item) => (
                <button
                  key={`spotlight-${item.symbol}`}
                  className={cn(
                    'group flex items-center justify-between rounded-[var(--km-radius-lg)] border border-[color:var(--km-color-border)] px-4 py-4 text-left transition-colors',
                    'hover:border-[color:var(--km-color-orange)] hover:bg-[color-mix(in_srgb,var(--km-color-orange)_10%,transparent)]'
                  )}
                  onClick={() => onSelectSymbol(item.symbol)}
                >
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--km-color-text-primary)]">
                      {item.displayName}
                    </p>
                    <p className="text-xs text-[color:var(--km-color-text-secondary)]">
                      7d range {formatCurrency(item.dailyLow)} – {formatCurrency(item.dailyHigh)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-[color:var(--km-color-text-primary)]">
                      {formatCurrency(item.price)}
                    </p>
                    <p
                      className={cn(
                        'text-xs font-semibold',
                        item.positive
                          ? 'text-[color:var(--km-color-green)]'
                          : 'text-[color:var(--km-color-red)]'
                      )}
                    >
                      {item.positive ? '+' : ''}
                      {formatPercent(item.changePercent)}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[var(--km-radius-lg)] border border-dashed border-[color:var(--km-color-border)] px-4 py-6 text-sm text-[color:var(--km-color-text-secondary)]">
                Spotlight data unavailable.
              </div>
            )}
          </div>
        </SurfaceCard>

        <Dialog.Root open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
          <Dialog.Trigger asChild>
            <button
              className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--km-color-border)] bg-[color:var(--km-color-bg-card)] text-sm font-semibold text-[color:var(--km-color-text-secondary)] transition-colors hover:border-[color:var(--km-color-orange)] hover:text-[color:var(--km-color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--km-color-orange)] focus:ring-offset-2 focus:ring-offset-[color:var(--km-color-bg-primary)]"
              aria-label="How Karma Market works"
            >
              ?
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur" />
            <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--km-radius-xl)] border border-[color:var(--km-color-border)] bg-[color:var(--km-color-bg-card)] p-6 shadow-[0_32px_90px_rgba(15,23,42,0.45)]">
              <Dialog.Title className="text-xl font-semibold text-[color:var(--km-color-text-primary)]">
                How it works
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[color:var(--km-color-text-secondary)]">
                A quick primer on trading subreddit momentum inside Karma Market.
              </Dialog.Description>
              <div className="mt-5 grid gap-4 text-sm text-[color:var(--km-color-text-secondary)] md:grid-cols-3">
                <div className="rounded-[var(--km-radius-lg)] bg-[color-mix(in_srgb,var(--km-color-blue)_10%,transparent)] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--km-color-blue)]">
                    1. Track
                  </p>
                  <p className="mt-2 leading-relaxed">
                    Every subreddit trades like a stock. Quotes refresh every two minutes using mocked
                    Reddit activity and order flow.
                  </p>
                </div>
                <div className="rounded-[var(--km-radius-lg)] bg-[color-mix(in_srgb,var(--km-color-orange)_10%,transparent)] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--km-color-orange)]">
                    2. Trade
                  </p>
                  <p className="mt-2 leading-relaxed">
                    Submit market buys or sells. We validate balances, execute instantly, and broadcast
                    each fill to the live tape.
                  </p>
                </div>
                <div className="rounded-[var(--km-radius-lg)] bg-[color-mix(in_srgb,var(--km-color-green)_10%,transparent)] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--km-color-green)]">
                    3. Climb
                  </p>
                  <p className="mt-2 leading-relaxed">
                    Grow your equity to climb the leaderboard. Gains and losses update in real time for
                    everyone in the session.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Dialog.Close asChild>
                  <button className="rounded-full border border-[color:var(--km-color-border)] px-4 py-2 text-sm font-semibold text-[color:var(--km-color-text-secondary)] transition-colors hover:border-[color:var(--km-color-orange)] hover:text-[color:var(--km-color-text-primary)]">
                    Got it
                  </button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <TradingPanel
          quote={activeQuote}
          quotes={quotes}
          quantityInput={quantityInput}
          numericQuantity={numericQuantity}
          onQuantityChange={onQuantityChange}
          onSymbolChange={onSelectSymbol}
          onSubmit={onSubmitOrder}
          isSubmitting={isSubmitting}
          availableCash={availableCash}
          ownedShares={ownedShares}
          feedback={tradeFeedback ?? null}
        />
      </div>

      <TradeTape trades={trades} />
    </>
  );
};
