import { SurfaceCard } from '../ui/SurfaceCard';
import { Avatar } from '../ui/Avatar';
import type { LeaderboardEntry } from '../../../shared/types/market';
import { formatCurrency, formatPercent } from '../../utils/format';
import { cn } from '../../lib/utils';

type LeaderboardCardProps = {
  entries: LeaderboardEntry[];
};

export const LeaderboardCard = ({ entries }: LeaderboardCardProps) => {
  return (
    <SurfaceCard padding="md" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-[color:var(--km-color-text-primary)]">
          Top traders
        </h3>
        <p className="text-sm text-[color:var(--km-color-text-secondary)]">
          Realised P&amp;L leaderboard, updated each tick.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {entries.map((entry) => {
          const positive = entry.changePercent >= 0;
          return (
            <div
              key={entry.rank}
              className={cn(
                'flex items-center gap-4 rounded-[var(--km-radius-lg)] border border-transparent px-4 py-3 transition-colors',
                entry.isSelf
                  ? 'bg-[color-mix(in_srgb,var(--km-color-orange)_12%,transparent)] border-[color:var(--km-color-orange)]'
                  : 'hover:bg-[color-mix(in_srgb,var(--km-color-blue)_8%,transparent)]'
              )}
            >
              <span className="text-sm font-semibold text-[color:var(--km-color-text-secondary)]">
                #{entry.rank}
              </span>
              <Avatar color={entry.avatarColor} initials={entry.user.slice(0, 2)} />
              <div className="flex-1">
                <p className="text-sm font-semibold capitalize text-[color:var(--km-color-text-primary)]">
                  {entry.user}
                </p>
                <p className="text-xs text-[color:var(--km-color-text-secondary)]">Total value</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[color:var(--km-color-text-primary)]">
                  {formatCurrency(entry.totalValue)}
                </p>
                <p
                  className={cn(
                    'text-xs font-semibold',
                    positive
                      ? 'text-[color:var(--km-color-green)]'
                      : 'text-[color:var(--km-color-red)]'
                  )}
                >
                  {positive ? '+' : ''}
                  {formatPercent(entry.changePercent)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </SurfaceCard>
  );
};
