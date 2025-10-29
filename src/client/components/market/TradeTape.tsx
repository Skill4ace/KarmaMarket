import { useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import type { TradeEvent } from '../../../shared/types/market';
import { formatCurrency, formatTime } from '../../utils/format';
import { cn } from '../../lib/utils';

type TradeTapeProps = {
  trades: TradeEvent[];
};

export const TradeTape = ({ trades }: TradeTapeProps) => {
  const controls = useAnimationControls();

  useEffect(() => {
    if (trades.length <= 2) {
      controls.stop();
      controls.set({ x: '0%' });
      return;
    }
    void controls.start({
      x: ['0%', '-50%'],
      transition: {
        repeat: Infinity,
        ease: 'linear',
        duration: 140,
      },
    });
  }, [controls, trades]);

  if (!trades.length) {
    return (
      <div className="flex items-center justify-center border-t border-[color:var(--km-color-border)] bg-[color:var(--km-color-bg-secondary)] px-6 py-4 text-sm text-[color:var(--km-color-text-secondary)]">
        No recent trades.
      </div>
    );
  }

  const renderTrades = trades.length > 2 ? [...trades, ...trades] : trades;

  return (
    <div className="relative overflow-hidden border-t border-[color:var(--km-color-border)] bg-[color:var(--km-color-bg-secondary)]">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[color:var(--km-color-bg-secondary)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[color:var(--km-color-bg-secondary)] to-transparent" />
      <motion.div
        className="flex min-w-max items-center gap-6 px-6 py-4 text-sm font-medium"
        animate={controls}
      >
        {renderTrades.map((trade) => {
          const positive = trade.side === 'BUY';
          return (
            <span
              key={`${trade.id}-${trade.timestamp}-${trade.side}`}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border border-[color:var(--km-color-border)] bg-[color:var(--km-color-bg-card)] px-4 py-2 shadow-sm',
                positive
                  ? 'text-[color:var(--km-color-green)]'
                  : 'text-[color:var(--km-color-red)]'
              )}
            >
              <span className="text-xs uppercase tracking-[0.24em] text-[color:var(--km-color-text-secondary)]">
                {formatTime(trade.timestamp)}
              </span>
              <span className="text-[color:var(--km-color-text-primary)]">
                {trade.user}{' '}
                <span className="font-semibold">{positive ? 'BOUGHT' : 'SOLD'}</span>{' '}
                {trade.quantity} {trade.symbol}
              </span>
              <span> @ {formatCurrency(trade.price)}</span>
            </span>
          );
        })}
      </motion.div>
    </div>
  );
};
