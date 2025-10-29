import type { PropsWithChildren } from 'react';
import { cn } from '../../lib/utils';

type SurfaceCardProps = PropsWithChildren<{
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}>;

const paddingMap: Record<NonNullable<SurfaceCardProps['padding']>, string> = {
  sm: 'p-4 md:p-5',
  md: 'p-6 md:p-8',
  lg: 'p-8 md:p-12',
};

export const SurfaceCard = ({ className, children, padding = 'md' }: SurfaceCardProps) => {
  return (
    <section
      className={cn(
        'rounded-[var(--km-radius-xl)] border border-[color:var(--km-color-border)] bg-[color:var(--km-color-bg-card)]',
        'shadow-[0_18px_50px_0_rgba(15,23,42,0.08)] transition-colors duration-300',
        paddingMap[padding],
        className
      )}
    >
      {children}
    </section>
  );
};
