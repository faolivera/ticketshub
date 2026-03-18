import { Shield } from 'lucide-react';
import { TX, txFontDisplay, txFontSans } from './tokens';
import type { EscrowCardProps } from './types';

export function EscrowCard({ message, title }: EscrowCardProps) {
  return (
    <div
      className="rounded-[14px] border p-5"
      style={{ ...txFontSans, background: TX.BLIGHT, borderColor: TX.BLUE + '40' }}
    >
      <div className="mb-2 flex items-center gap-2">
        <Shield className="h-5 w-5 shrink-0" style={{ color: TX.BLUE }} />
        <h2 className="text-base font-normal" style={{ ...txFontDisplay, color: TX.BLUE }}>
          {title}
        </h2>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: TX.DARK }}>
        {message}
      </p>
    </div>
  );
}
