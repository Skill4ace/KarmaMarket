import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppLayout } from './components/AppLayout';
import { PrimaryNav, type PrimaryView } from './components/navigation/PrimaryNav';
import { MarketsView } from './views/MarketsView';
import { PortfolioView } from './views/PortfolioView';
import { LeaderboardView } from './views/LeaderboardView';
import type {
  MarketSymbol,
  SubredditQuote,
  PortfolioResponse,
  TradeEvent,
  TradesResponse,
} from '../shared/types/market';
import {
  canonicalSubredditSymbols,
  getQuoteBySymbol,
  mockQuotes,
  mockTrades,
  mockPortfolioSummary,
} from './data/mockMarket';
import { useLeaderboard, usePortfolio, usePrices, useTrades } from './services/api';
import { useSWRConfig } from 'swr';
import { Toaster, toast } from 'sonner';
import { formatCurrency } from './utils/format';
import { ACTIVE_USERNAME, apiUrl } from './lib/api';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { useRealtimeSync } from './hooks/useRealtimeSync';

export const App = () => {
  const [activeView, setActiveView] = useState<PrimaryView>('markets');
  const [selectedSymbol, setSelectedSymbol] = useState<MarketSymbol>(canonicalSubredditSymbols[0]!);
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const {
    data: pricesData,
    isLoading: pricesLoading,
    error: pricesError,
    mutate: mutatePrices,
  } = usePrices();
  const {
    data: portfolioData,
    isLoading: portfolioLoading,
    error: portfolioError,
    mutate: mutatePortfolio,
  } = usePortfolio();
  const {
    data: leaderboardData,
    isLoading: leaderboardLoading,
    error: leaderboardError,
    mutate: mutateLeaderboard,
  } = useLeaderboard();
  const {
    data: tradesData,
    isLoading: tradesLoading,
    error: tradesError,
    mutate: mutateTrades,
  } = useTrades();
  const { mutate: mutateGlobal } = useSWRConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tradeFeedback, setTradeFeedback] = useState<
    { type: 'success' | 'error'; message: string } | null
  >(null);
  const [confirmState, setConfirmState] = useState<{ side: 'BUY' | 'SELL'; quantity: number } | null>(
    null
  );

  const quotes = pricesData?.quotes ?? mockQuotes;
  const spotlightSymbols = pricesData?.spotlight ?? quotes.slice(0, 4).map((quote) => quote.symbol);

  useEffect(() => {
    if (!quotes.length) return;
    const exists = quotes.some((quote) => quote.symbol === selectedSymbol);
    if (!exists) {
      setSelectedSymbol(quotes[0]!.symbol);
    }
  }, [quotes, selectedSymbol]);

  const activeQuote: SubredditQuote = useMemo(() => {
    const next = quotes.find((quote) => quote.symbol === selectedSymbol);
    return next ?? getQuoteBySymbol(selectedSymbol);
  }, [quotes, selectedSymbol]);

  const availableCash = portfolioData?.summary.cash ?? mockPortfolioSummary.cash;
  const ownedShares =
    portfolioData?.positions?.find((pos) => pos.symbol === selectedSymbol)?.shares ?? 0;

  const numericQuantity = useMemo(() => {
    const parsed = parseInt(quantityInput, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }, [quantityInput]);

  const maxAffordable = useMemo(() => {
    if (activeQuote.price <= 0) return 0;
    return Math.max(0, Math.floor(availableCash / activeQuote.price));
  }, [availableCash, activeQuote.price]);

  useRealtimeSync({
    mutateTrades,
    mutatePortfolio,
    mutatePrices,
    mutateLeaderboard,
  });

  const initiateTrade = useCallback(
    (side: 'BUY' | 'SELL') => {
      if (isSubmitting) return;
      if (!numericQuantity) {
        const message = 'Enter a positive quantity.';
        setTradeFeedback({ type: 'error', message });
        toast.error(message);
        return;
      }
      if (side === 'BUY' && numericQuantity > maxAffordable) {
        const message = `You can buy at most ${maxAffordable} shares with available cash.`;
        setTradeFeedback({ type: 'error', message });
        toast.error(message);
        return;
      }
      if (side === 'SELL' && ownedShares <= 0) {
        const message = `You don't hold any shares of ${activeQuote.symbol} yet.`;
        setTradeFeedback({ type: 'error', message });
        toast.error(message);
        return;
      }
      setConfirmState({ side, quantity: numericQuantity });
    },
    [activeQuote.symbol, isSubmitting, maxAffordable, numericQuantity, ownedShares]
  );

  const handleTrade = useCallback(async () => {
    if (!confirmState) return;
    const side = confirmState.side;
    const qty = confirmState.quantity;
    setIsSubmitting(true);
    setTradeFeedback(null);
    const optimisticId = toast.loading(
      `${side === 'BUY' ? 'Buying' : 'Selling'} ${qty} ${activeQuote.symbol}...`
    );
      try {
        console.debug('[trade] submitting', { side, symbol: activeQuote.symbol, quantity: qty });
        const tradeHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (ACTIVE_USERNAME) {
          tradeHeaders['X-User-Name'] = ACTIVE_USERNAME;
        }
        const response = await fetch(apiUrl('/api/trade'), {
          method: 'POST',
          headers: tradeHeaders,
          credentials: 'include',
          body: JSON.stringify({
            symbol: activeQuote.symbol,
            side,
            quantity: qty,
            username: ACTIVE_USERNAME,
          }),
        });
        console.debug('[trade] response status', response.status);
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            (payload && typeof payload === 'object' && 'message' in payload && payload.message) ||
            'Trade failed. Please try again.';
          throw new Error(message as string);
        }
        const tradePrice =
          (payload && typeof payload === 'object' && 'trade' in payload && payload.trade?.price) ??
          activeQuote.price;
        toast.success(
          `${side === 'BUY' ? 'Bought' : 'Sold'} ${qty} ${activeQuote.symbol} @ ${formatCurrency(tradePrice)}`,
          { id: optimisticId }
        );
        const portfolioFromServer =
          payload && typeof payload === 'object' && 'portfolio' in payload
            ? (payload.portfolio as PortfolioResponse)
            : null;
        const tradeFromServer =
          payload && typeof payload === 'object' && 'trade' in payload
            ? (payload.trade as TradeEvent)
            : null;
        setTradeFeedback({
          type: 'success',
          message: `${side === 'BUY' ? 'Bought' : 'Sold'} ${qty} ${activeQuote.symbol} @ ${formatCurrency(
            tradePrice
          )}`,
        });
        setQuantityInput('1');
        if (portfolioFromServer) {
          await mutatePortfolio(portfolioFromServer, { revalidate: false });
        } else {
          await mutatePortfolio();
        }
        if (tradeFromServer) {
          await mutateTrades(
            (data?: TradesResponse) => {
              if (!data) return { trades: [tradeFromServer] };
              return { trades: [tradeFromServer, ...data.trades].slice(0, 30) };
            },
            { revalidate: false }
          );
        } else {
          await mutateTrades();
        }
        await Promise.all([mutateGlobal('/api/prices'), mutateGlobal('/api/leaderboard')]);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Trade failed.';
        setTradeFeedback({ type: 'error', message });
        toast.error(message, {
          id: optimisticId,
        });
      } finally {
        setIsSubmitting(false);
        setConfirmState(null);
      }
  }, [
    activeQuote.price,
    activeQuote.symbol,
    confirmState,
    mutateGlobal,
    mutatePortfolio,
    mutateTrades,
  ]);

  return (
    <>
      <Toaster richColors position="top-center" />
      <AppLayout
        header={
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6">
          <PrimaryNav
            activeView={activeView}
            onChange={setActiveView}
            trailing={
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--km-color-orange)] text-xl font-semibold text-white shadow-[0_18px_45px_rgba(255,69,0,0.35)]">
                ₵
              </div>
            }
          />
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 pb-20 pt-8 md:gap-10 md:pb-24 md:pt-12">
        {activeView === 'markets' ? (
          <MarketsView
            quotes={quotes}
            activeQuote={activeQuote}
            onSelectSymbol={setSelectedSymbol}
            quantityInput={quantityInput}
            numericQuantity={numericQuantity}
            onQuantityChange={setQuantityInput}
            onSubmitOrder={initiateTrade}
            trades={tradesData?.trades ?? mockTrades}
            isLoading={pricesLoading || tradesLoading}
            hasError={Boolean(pricesError) || Boolean(tradesError)}
            spotlight={spotlightSymbols}
            availableCash={availableCash}
            ownedShares={ownedShares}
            isSubmitting={isSubmitting}
            tradeFeedback={tradeFeedback}
          />
        ) : null}

        {activeView === 'portfolio' ? (
          <PortfolioView
            summary={portfolioData?.summary}
            positions={portfolioData?.positions}
            isLoading={portfolioLoading}
            hasError={Boolean(portfolioError)}
          />
        ) : null}

        {activeView === 'leaderboard' ? (
          <LeaderboardView
            entries={leaderboardData?.entries}
            isLoading={leaderboardLoading}
            hasError={Boolean(leaderboardError)}
          />
        ) : null}
      </div>
      </AppLayout>
      <ConfirmDialog
        open={Boolean(confirmState)}
        title={
          confirmState
            ? `${confirmState.side === 'BUY' ? 'Confirm Buy' : 'Confirm Sell'}`
            : ''
        }
        description={
          confirmState
            ? `Execute ${confirmState.side === 'BUY' ? 'buy' : 'sell'} order for ${
                confirmState.quantity
              } ${activeQuote.symbol} @ ${formatCurrency(activeQuote.price)}?`
            : undefined
        }
        confirmLabel={confirmState?.side === 'SELL' ? 'Sell' : 'Buy'}
        cancelLabel="Cancel"
        isDestructive={confirmState?.side === 'SELL'}
        onConfirm={handleTrade}
        onCancel={() => {
          setConfirmState(null);
        }}
      />
    </>
  );
};
