import { X } from 'lucide-react';
import { CARD, DARK, MUTED, E, S } from '@/lib/design-tokens';
import type { ModalOverlayProps } from './types';

export function ModalOverlay({ title, onClose, children }: ModalOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(15,15,26,0.55)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div
        className="max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-[20px] p-6 sm:p-7"
        style={{ background: CARD, ...S }}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2
            id="tx-modal-title"
            className="text-xl font-normal leading-tight"
            style={{ ...E, color: DARK }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
            style={{ color: MUTED }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
