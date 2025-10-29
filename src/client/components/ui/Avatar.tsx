import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type AvatarProps = HTMLAttributes<HTMLDivElement> & {
  color?: string;
  initials?: string;
};

export const Avatar = ({ color, initials, className, ...props }: AvatarProps) => {
  return (
    <div
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold uppercase text-white shadow-[0_6px_18px_rgba(15,23,42,0.16)]',
        className
      )}
      style={{ backgroundColor: color ?? 'var(--km-color-orange)' }}
      {...props}
    >
      {initials ?? 'KM'}
    </div>
  );
};
