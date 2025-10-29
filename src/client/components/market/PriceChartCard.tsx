import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MarketSymbol, SubredditQuote } from '../../../shared/types/market';
import { SurfaceCard } from '../ui/SurfaceCard';
import { formatCurrency, formatPercent, formatTime } from '../../utils/format';
import { cn } from '../../lib/utils';
import { SymbolSelect } from './SymbolSelect';

type PriceChartCardProps = {
  quote: SubredditQuote;
  quotes: SubredditQuote[];
  onSymbolChange: (symbol: MarketSymbol) => void;
  isLoading?: boolean;
  hasError?: boolean;
};

const chartGradientId = 'karma-market-chart-gradient';

type Timeframe = '24h' | '3d' | '7d';

export const PriceChartCard = ({
  quote,
  quotes,
  onSymbolChange,
  isLoading = false,
  hasError = false,
}: PriceChartCardProps) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('24h');
  const [isCompact, setIsCompact] = useState(false);
  const [priceFlash, setPriceFlash] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const evaluate = () => setIsCompact(window.innerWidth < 640);
    evaluate();
    window.addEventListener('resize', evaluate);
    return () => window.removeEventListener('resize', evaluate);
  }, []);

  useEffect(() => {
    setPriceFlash(true);
    const timeout = setTimeout(() => setPriceFlash(false), 600);
    return () => clearTimeout(timeout);
  }, [quote.price]);

  const changeIsPositive = quote.changePercent >= 0;
  const timeframeHistory = useMemo(() => {
    if (timeframe === '24h') {
      return quote.history.slice(-24);
    }
    if (timeframe === '3d') {
      return quote.history.slice(-72);
    }
    return quote.history;
  }, [quote.history, timeframe]);
  const formattedHistory = useMemo(
    () =>
      timeframeHistory.map((point) => ({
        ...point,
        time: formatTime(point.timestamp),
      })),
    [timeframeHistory]
  );
  const rangeHigh = useMemo(
    () => Math.max(...timeframeHistory.map((point) => point.price)),
    [timeframeHistory]
  );
  const rangeLow = useMemo(
    () => Math.min(...timeframeHistory.map((point) => point.price)),
    [timeframeHistory]
  );
  const timeframeLabel =
    timeframe === '24h' ? '24h range' : timeframe === '3d' ? '3-day range' : '7-day range';
  const xAxisInterval = timeframe === '24h' ? 3 : timeframe === '3d' ? 8 : 23;

  return (
    <SurfaceCard className="col-span-full" padding="lg">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3">
          <h2 className="text-4xl font-semibold tracking-tight text-[color:var(--km-color-text-primary)] md:text-5xl">
            {quote.displayName}
          </h2>
          <div className="flex flex-wrap items-end gap-3 text-[color:var(--km-color-text-primary)]">
            <span
              className={cn(
                'text-5xl font-semibold md:text-6xl transition-colors duration-500',
                priceFlash
                  ? changeIsPositive
                    ? 'text-[color:var(--km-color-green)]'
                    : 'text-[color:var(--km-color-red)]'
                  : 'text-[color:var(--km-color-text-primary)]'
              )}
            >
              {formatCurrency(quote.price)}
            </span>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-sm font-semibold',
                changeIsPositive
                  ? 'bg-[color-mix(in_srgb,var(--km-color-green)_18%,transparent)] text-[color:var(--km-color-green)]'
                  : 'bg-[color-mix(in_srgb,var(--km-color-red)_18%,transparent)] text-[color:var(--km-color-red)]'
              )}
            >
              {changeIsPositive ? '+' : ''}
              {formatPercent(quote.changePercent)}
            </span>
          </div>
          <p className="text-sm text-[color:var(--km-color-text-secondary)]">
            {timeframeLabel} {formatCurrency(rangeLow)} – {formatCurrency(rangeHigh)}
          </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <div className="flex gap-2">
          {(['24h', '3d', '7d'] as Timeframe[]).map((option) => {
            const active = option === timeframe;
              return (
                <button
                  key={option}
                  className={cn(
                    'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors',
                    active
                      ? 'bg-[color:var(--km-color-orange)] text-white shadow-[0_12px_26px_rgba(255,69,0,0.25)]'
                      : 'bg-[color:var(--km-color-bg-secondary)] text-[color:var(--km-color-text-secondary)] hover:text-[color:var(--km-color-text-primary)]'
                  )}
                  onClick={() => setTimeframe(option)}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--km-color-text-secondary)]">
              Subreddit
            </label>
            <SymbolSelect
              value={quote.symbol}
              onValueChange={(value) => onSymbolChange(value as MarketSymbol)}
              quotes={quotes}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div
          className="mt-8 w-full animate-pulse rounded-[var(--km-radius-lg)] bg-[color-mix(in_srgb,var(--km-color-orange)_8%,transparent)]"
          style={{ height: isCompact ? 220 : 420 }}
        />
      ) : hasError ? (
        <div className="mt-8 rounded-[var(--km-radius-lg)] border border-[color:var(--km-color-border)] bg-[color-mix(in_srgb,var(--km-color-red)_10%,transparent)] p-8 text-sm text-[color:var(--km-color-red)]">
          Unable to load price history right now. Try refreshing in a moment.
        </div>
      ) : (
        <div className="mt-8 w-full" style={{ height: isCompact ? 220 : 420 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedHistory}>
              <defs>
                <linearGradient id={chartGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--km-color-orange)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--km-color-orange)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                hide={isCompact}
                tick={{ fill: 'var(--km-color-text-secondary)', fontSize: 12 }}
                interval={xAxisInterval}
              />
              <YAxis hide domain={['dataMin - 4', 'dataMax + 4']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--km-color-bg-card)',
                  border: `1px solid var(--km-color-border)`,
                  borderRadius: '14px',
                  boxShadow: '0 12px 30px rgba(15,23,42,0.16)',
                }}
                labelStyle={{ color: 'var(--km-color-text-secondary)', fontWeight: 500 }}
                formatter={(value) => [formatCurrency(value as number), 'Price']}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="var(--km-color-orange)"
                fill={`url(#${chartGradientId})`}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </SurfaceCard>
  );
};
