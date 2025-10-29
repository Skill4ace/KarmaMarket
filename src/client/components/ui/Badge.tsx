import type { PropsWithChildren } from 'react';
import { cn } from '../../lib/utils';

type BadgeProps = PropsWithChildren<{
  className?: string;
  tone?: 'neutral' | 'positive' | 'accent';
}>;

export const Badge = ({ className, children, tone = 'neutral' }: BadgeProps) => {
  const toneClass =
    tone === 'positive'
      ? 'bg-[color-mix(in_srgb,var(--km-color-green)_18%,transparent)] text-[color:var(--km-color-green)]'
      : tone === 'accent'
      ? 'bg-[color-mix(in_srgb,var(--km-color-orange)_18%,transparent)] text-[color:var(--km-color-orange)]'
      : 'bg-[color:var(--km-color-bg-secondary)] text-[color:var(--km-color-text-secondary)]';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]',
        toneClass,
        className
      )}
    >
      {children}
    </span>
  );
};
