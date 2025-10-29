import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type PrimaryView = 'markets' | 'portfolio' | 'leaderboard';

type PrimaryNavProps = {
  activeView: PrimaryView;
  onChange: (view: PrimaryView) => void;
  trailing?: ReactNode;
};

const tabs: Array<{ id: PrimaryView; label: string; description: string }> = [
  {
    id: 'markets',
    label: 'Markets',
    description: 'Orders',
  },
  {
    id: 'portfolio',
    label: 'Account',
    description: 'Holdings',
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    description: 'Top Traders',
  },
];

export const PrimaryNav = ({ activeView, onChange, trailing }: PrimaryNavProps) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--km-color-text-primary)] md:text-[40px]">
            Karma Market
          </h1>
        </div>
        {trailing}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {tabs.map((tab) => {
          const active = tab.id === activeView;
          return (
            <button
              key={tab.id}
              className={cn(
                'flex w-full max-w-[260px] flex-col gap-1 rounded-[var(--km-radius-lg)] border px-5 py-3 text-left transition-colors sm:w-auto sm:flex-1',
                'focus:outline-none focus:ring-2 focus:ring-[color:var(--km-color-orange)] focus:ring-offset-2 focus:ring-offset-[color:var(--km-color-bg-primary)]',
                active
                  ? 'border-[color:var(--km-color-orange)] bg-[color-mix(in_srgb,var(--km-color-orange)_10%,transparent)] text-[color:var(--km-color-text-primary)] shadow-[0_12px_30px_rgba(255,69,0,0.12)]'
                  : 'border-[color:var(--km-color-border)] text-[color:var(--km-color-text-secondary)] hover:border-[color:var(--km-color-orange)] hover:text-[color:var(--km-color-text-primary)]'
              )}
              onClick={() => onChange(tab.id)}
            >
              <span className="text-sm font-semibold uppercase tracking-[0.16em]">{tab.label}</span>
              <span className="text-xs">{tab.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
