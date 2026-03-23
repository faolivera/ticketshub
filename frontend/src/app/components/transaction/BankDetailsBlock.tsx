import { Check, Copy } from 'lucide-react';
import { CARD, BORDER, DARK, MUTED, GLIGHT, VLIGHT, GREEN, V, S } from '@/lib/design-tokens';
import type { BankDetailsBlockProps } from './types';

export function BankDetailsBlock({
  bankName,
  cbu,
  holderName,
  cuit,
  copiedCbu,
  onCopyCbu,
  labels,
}: BankDetailsBlockProps) {
  return (
    <div
      className="mt-4 space-y-2.5 rounded-card border p-4 text-sm"
      style={{ ...S, background: CARD, borderColor: BORDER }}
    >
      <Row label={labels.bank} value={bankName} />
      <Row label={labels.cbu}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="break-all font-mono font-medium" style={{ color: DARK }}>
            {cbu}
          </span>
          <button
            type="button"
            onClick={() => onCopyCbu(cbu)}
            className="inline-flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-bold"
            style={{
              background: copiedCbu ? GLIGHT : VLIGHT,
              color: copiedCbu ? GREEN : V,
            }}
          >
            {copiedCbu ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedCbu ? labels.copied : labels.copy}
          </button>
        </div>
      </Row>
      <Row label={labels.holder} value={holderName} />
      <Row label={labels.cuit} value={cuit} />
    </div>
  );
}

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 border-b pb-2 last:border-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-4"
      style={{ borderBottomColor: `${BORDER}CC` }}
    >
      <span style={{ color: MUTED }}>{label}</span>
      {children ?? (
        <span className="font-medium sm:text-right" style={{ color: DARK }}>
          {value}
        </span>
      )}
    </div>
  );
}
