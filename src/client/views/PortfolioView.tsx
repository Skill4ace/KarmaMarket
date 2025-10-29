import type { PortfolioPosition, PortfolioSummary } from '../../shared/types/market';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { PortfolioCard } from '../components/market/PortfolioCard';
import { formatCurrency, formatPercent } from '../utils/format';

type PortfolioViewProps = {
  summary?: PortfolioSummary | undefined;
  positions?: PortfolioPosition[] | undefined;
  isLoading?: boolean | undefined;
  hasError?: boolean | undefined;
};

export const PortfolioView = ({
  summary,
  positions,
  isLoading = false,
  hasError = false,
}: PortfolioViewProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <SurfaceCard
            key={`portfolio-skeleton-${index}`}
            padding="md"
            className="animate-pulse"
          >
            <div className="h-6 w-1/3 rounded-full bg-[color-mix(in_srgb,var(--km-color-orange)_10%,transparent)]" />
            <div className="mt-4 h-32 rounded-[var(--km-radius-lg)] bg-[color-mix(in_srgb,var(--km-color-orange)_6%,transparent)]" />
          </SurfaceCard>
        ))}
      </div>
    );
  }

  if (hasError || !summary || !positions) {
    return (
      <SurfaceCard padding="md" className="text-sm text-[color:var(--km-color-red)]">
        Unable to retrieve portfolio data right now. Please refresh later.
      </SurfaceCard>
    );
  }

  const changeIsPositive = summary.changePercent >= 0;

  const holdingsTotal = positions.reduce((acc, pos) => acc + pos.value, 0);
  const topHolding = [...positions].sort((a, b) => b.value - a.value)[0];

  return (
    <div className="flex flex-col gap-8">
      <SurfaceCard padding="md" className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--km-color-text-secondary)]">
            Account overview
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[color:var(--km-color-text-primary)] md:text-[36px]">
            {formatCurrency(summary.totalValue)}
          </h2>
          <p className="text-sm text-[color:var(--km-color-text-secondary)]">
            total equity (cash + holdings)
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 rounded-[var(--km-radius-lg)] bg-[color-mix(in_srgb,var(--km-color-blue)_12%,transparent)] px-4 py-4 text-sm text-[color:var(--km-color-blue)] md:max-w-[280px]">
          <div className="flex items-center justify-between text-[color:var(--km-color-text-primary)]">
            <span>Available cash</span>
            <span className="font-semibold">{formatCurrency(summary.cash)}</span>
          </div>
          <div className="flex items-center justify-between text-[color:var(--km-color-text-primary)]">
            <span>Invested</span>
            <span className="font-semibold">{formatCurrency(holdingsTotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Daily change</span>
            <span
              className="rounded-full px-2 py-1 font-semibold"
              style={{
                backgroundColor: `color-mix(in srgb, var(${
                  changeIsPositive ? '--km-color-green' : '--km-color-red'
                }) 18%, transparent)`,
                color: `var(${changeIsPositive ? '--km-color-green' : '--km-color-red'})`,
              }}
            >
              {changeIsPositive ? '+' : ''}
              {formatPercent(summary.changePercent)}
            </span>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard padding="md" className="flex flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--km-color-text-secondary)]">
          Holding insights
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[var(--km-radius-lg)] border border-[color:var(--km-color-border)] bg-[color-mix(in_srgb,var(--km-color-green)_12%,transparent)] px-4 py-4 text-sm text-[color:var(--km-color-green)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">Best performer</p>
            <p className="mt-2 text-lg font-semibold text-[color:var(--km-color-text-primary)]">
              {topHolding?.symbol}
            </p>
            <p className="text-xs text-[color:var(--km-color-text-secondary)]">
              {formatCurrency(topHolding?.value ?? 0)} ·{' '}
              {topHolding ? `${topHolding.shares} shares` : '—'}
            </p>
          </div>
          <div className="rounded-[var(--km-radius-lg)] border border-[color:var(--km-color-border)] bg-[color:var(--km-color-bg-secondary)] px-4 py-4 text-sm text-[color:var(--km-color-text-secondary)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">Allocation</p>
            <p className="mt-2 text-lg font-semibold text-[color:var(--km-color-text-primary)]">
              {positions.length} active subreddits
            </p>
            <p className="text-xs">Diversify across activity clusters to reduce volatility.</p>
          </div>
        </div>
      </SurfaceCard>

      <PortfolioCard positions={positions} summary={summary} />
    </div>
  );
};
