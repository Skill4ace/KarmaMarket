import type { PortfolioPosition, PortfolioSummary } from '../../../shared/types/market';
import { SurfaceCard } from '../ui/SurfaceCard';
import { formatCurrency, formatPercent } from '../../utils/format';
import { cn } from '../../lib/utils';

type PortfolioCardProps = {
  positions: PortfolioPosition[];
  summary: PortfolioSummary;
};

export const PortfolioCard = ({ positions, summary }: PortfolioCardProps) => {
  const changePositive = summary.changePercent >= 0;

  return (
    <SurfaceCard padding="md" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-[color:var(--km-color-text-primary)]">
          Your positions
        </h3>
        <p className="text-sm text-[color:var(--km-color-text-secondary)]">
          Track holdings, market value, and running P&L for each subreddit.
        </p>
      </div>
      <div className="flex items-baseline justify-between rounded-[var(--km-radius-lg)] bg-[color-mix(in_srgb,var(--km-color-blue)_12%,transparent)] px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--km-color-text-secondary)]">
            Total portfolio
          </p>
          <p className="text-2xl font-semibold text-[color:var(--km-color-text-primary)]">
            {formatCurrency(summary.totalValue)}
          </p>
        </div>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-sm font-semibold',
            changePositive
              ? 'bg-[color-mix(in_srgb,var(--km-color-green)_18%,transparent)] text-[color:var(--km-color-green)]'
              : 'bg-[color-mix(in_srgb,var(--km-color-red)_18%,transparent)] text-[color:var(--km-color-red)]'
          )}
        >
          {changePositive ? '+' : ''}
          {formatPercent(summary.changePercent)}
        </span>
      </div>

      <div className="overflow-hidden rounded-[var(--km-radius-lg)] border border-[color:var(--km-color-border)]">
        <table className="hidden min-w-full border-collapse text-sm md:table">
          <thead className="bg-[color:var(--km-color-bg-secondary)] text-[color:var(--km-color-text-secondary)]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Symbol</th>
              <th className="px-4 py-3 text-right font-semibold">Shares</th>
              <th className="px-4 py-3 text-right font-semibold">Value</th>
              <th className="px-4 py-3 text-right font-semibold">P&L</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => {
              const positive = position.pnlPercent >= 0;
              return (
                <tr
                  key={position.symbol}
                  className="border-t border-[color:var(--km-color-border)] text-[color:var(--km-color-text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--km-color-orange)_4%,transparent)]"
                >
                  <td className="px-4 py-3 font-medium">{position.symbol}</td>
                  <td className="px-4 py-3 text-right">{position.shares.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(position.value)}</td>
                  <td
                    className={cn(
                      'px-4 py-3 text-right font-semibold',
                      positive
                        ? 'text-[color:var(--km-color-green)]'
                        : 'text-[color:var(--km-color-red)]'
                    )}
                  >
                    {positive ? '+' : ''}
                    {formatPercent(position.pnlPercent)}
                  </td>
                </tr>
              );
            })}
            {positions.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-center text-sm text-[color:var(--km-color-text-secondary)]"
                  colSpan={4}
                >
                  You have no positions yet. Make your first trade to populate this view.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="flex flex-col gap-3 p-2 md:hidden">
          {positions.map((position) => {
            const positive = position.pnlPercent >= 0;
            return (
              <div
                key={`mobile-position-${position.symbol}`}
                className="flex flex-col gap-1 rounded-[var(--km-radius-lg)] border border-[color:var(--km-color-border)] bg-[color-mix(in_srgb,var(--km-color-blue)_10%,transparent)] p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[color:var(--km-color-text-primary)]">
                    {position.symbol}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      positive
                        ? 'text-[color:var(--km-color-green)]'
                        : 'text-[color:var(--km-color-red)]'
                    )}
                  >
                    {positive ? '+' : ''}
                    {formatPercent(position.pnlPercent)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-[color:var(--km-color-text-secondary)]">
                  <span>Shares</span>
                  <span className="font-semibold text-[color:var(--km-color-text-primary)]">
                    {position.shares.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-[color:var(--km-color-text-secondary)]">
                  <span>Value</span>
                  <span className="font-semibold text-[color:var(--km-color-text-primary)]">
                    {formatCurrency(position.value)}
                  </span>
                </div>
              </div>
            );
          })}
          {positions.length === 0 ? (
            <div className="rounded-[var(--km-radius-lg)] border border-[color:var(--km-color-border)] bg-[color-mix(in_srgb,var(--km-color-blue)_10%,transparent)] p-4 text-center text-sm text-[color:var(--km-color-text-secondary)]">
              You have no positions yet. Make your first trade to populate this view.
            </div>
          ) : null}
        </div>
      </div>
    </SurfaceCard>
  );
};
