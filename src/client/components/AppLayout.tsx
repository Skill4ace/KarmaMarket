import type { PropsWithChildren, ReactNode } from 'react';
import { cn } from '../lib/utils';

type AppLayoutProps = PropsWithChildren<{
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}>;

export const AppLayout = ({ header, footer, className, children }: AppLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--km-color-bg-primary)] text-[color:var(--km-color-text-primary)] transition-colors duration-300">
      {header ? <header className="border-b border-[color:var(--km-color-border)]">{header}</header> : null}
      <main className={cn('flex-1', className)}>{children}</main>
      {footer ? (
        <footer className="border-t border-[color:var(--km-color-border)] bg-[color:var(--km-color-bg-secondary)]">
          {footer}
        </footer>
      ) : null}
    </div>
  );
};
