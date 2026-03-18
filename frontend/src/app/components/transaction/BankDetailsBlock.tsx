import { Check, Copy } from 'lucide-react';
import { TX, txFontSans } from './tokens';
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
      className="mt-4 space-y-2.5 rounded-xl border p-4 text-sm"
      style={{ ...txFontSans, background: TX.CARD, borderColor: TX.BORDER }}
    >
      <Row label={labels.bank} value={bankName} />
      <Row label={labels.cbu}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="break-all font-mono font-medium" style={{ color: TX.DARK }}>
            {cbu}
          </span>
          <button
            type="button"
            onClick={() => onCopyCbu(cbu)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold"
            style={{
              background: copiedCbu ? TX.GLIGHT : TX.VLIGHT,
              color: copiedCbu ? TX.GREEN : TX.V,
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
    <div className="flex flex-col gap-0.5 border-b border-[#e5e7eb]/80 pb-2 last:border-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-4">
      <span style={{ color: TX.MUTED }}>{label}</span>
      {children ?? (
        <span className="font-medium sm:text-right" style={{ color: TX.DARK }}>
          {value}
        </span>
      )}
    </div>
  );
}
