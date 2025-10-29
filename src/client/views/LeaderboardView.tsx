import type { LeaderboardEntry } from '../../shared/types/market';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { LeaderboardCard } from '../components/market/LeaderboardCard';

type LeaderboardViewProps = {
  entries?: LeaderboardEntry[] | undefined;
  isLoading?: boolean | undefined;
  hasError?: boolean | undefined;
};

export const LeaderboardView = ({
  entries,
  isLoading = false,
  hasError = false,
}: LeaderboardViewProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        {Array.from({ length: 2 }).map((_, index) => (
          <SurfaceCard
            key={`leaderboard-skeleton-${index}`}
            padding="md"
            className="animate-pulse"
          >
            <div className="h-6 w-1/4 rounded-full bg-[color-mix(in_srgb,var(--km-color-orange)_10%,transparent)]" />
            <div className="mt-4 h-24 rounded-[var(--km-radius-lg)] bg-[color-mix(in_srgb,var(--km-color-orange)_6%,transparent)]" />
          </SurfaceCard>
        ))}
      </div>
    );
  }

  if (hasError || !entries?.length) {
    return (
      <SurfaceCard padding="md" className="text-sm text-[color:var(--km-color-red)]">
        Leaderboard is unavailable right now. Try again soon.
      </SurfaceCard>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <SurfaceCard padding="md" className="text-sm text-[color:var(--km-color-text-secondary)]">
        Realised P&amp;L leaderboard, updated each tick.
      </SurfaceCard>
      <LeaderboardCard entries={entries} />
    </div>
  );
};
