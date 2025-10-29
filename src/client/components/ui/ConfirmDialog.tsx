import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type ConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
};

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
}: ConfirmDialogProps) => {
  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center px-6">
          <Dialog.Content className="w-full max-w-md rounded-[var(--km-radius-xl)] border border-[color:var(--km-color-border)] bg-[color:var(--km-color-bg-card)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.35)]">
            <Dialog.Title className="text-lg font-semibold text-[color:var(--km-color-text-primary)]">
              {title}
            </Dialog.Title>
            {description ? (
              <Dialog.Description className="mt-2 text-sm text-[color:var(--km-color-text-secondary)]">
                {description}
              </Dialog.Description>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-[color:var(--km-color-border)] px-4 py-2 text-sm font-semibold text-[color:var(--km-color-text-secondary)] transition-colors hover:border-[color:var(--km-color-orange)] hover:text-[color:var(--km-color-text-primary)]"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors',
                  isDestructive
                    ? 'bg-[color:var(--km-color-red)] hover:brightness-110'
                    : 'bg-[color:var(--km-color-green)] hover:brightness-110'
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
