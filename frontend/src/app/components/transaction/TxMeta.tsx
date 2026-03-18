import { Check, Copy } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { TX, txFontDisplay, txFontSans } from './tokens';
import type { TxMetaProps } from './types';

export function TxMeta({
  transactionId,
  createdAtLabel,
  copied,
  onCopy,
  copyLabel,
  copiedLabel,
  idLabel,
  createdLabel,
}: TxMetaProps) {
  const short =
    transactionId.length > 16
      ? `${transactionId.slice(0, 8)}…${transactionId.slice(-8)}`
      : transactionId;

  return (
    <div
      className="rounded-[14px] border p-5"
      style={{ ...txFontSans, background: TX.CARD, borderColor: TX.BORDER }}
    >
      <h2 className="mb-3 text-base font-normal" style={{ ...txFontDisplay, color: TX.DARK }}>
        {idLabel}
      </h2>
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="font-mono text-xs font-medium"
                style={{ color: TX.DARK }}
                title={transactionId}
              >
                {short}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs break-all font-mono text-xs">
              {transactionId}
            </TooltipContent>
          </Tooltip>
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 rounded-lg p-1.5 transition-colors"
            style={{
              color: copied ? TX.GREEN : TX.MUTED,
              background: copied ? TX.GLIGHT : 'transparent',
            }}
            aria-label={copyLabel}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
          {copied && (
            <span className="text-xs font-semibold" style={{ color: TX.GREEN }}>
              {copiedLabel}
            </span>
          )}
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: TX.MUTED }}>
            {createdLabel}
          </p>
          <p className="font-semibold" style={{ color: TX.DARK }}>
            {createdAtLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
