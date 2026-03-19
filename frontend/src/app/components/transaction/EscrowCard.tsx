import { Shield } from 'lucide-react';
import { BLIGHT, BLUE, DARK, E, S } from '@/lib/design-tokens';
import type { EscrowCardProps } from './types';

export function EscrowCard({ message, title }: EscrowCardProps) {
  return (
    <div
      className="rounded-[14px] border p-5"
      style={{ ...S, background: BLIGHT, borderColor: BLUE + '40' }}
    >
      <div className="mb-2 flex items-center gap-2">
        <Shield className="h-5 w-5 shrink-0" style={{ color: BLUE }} />
        <h2 className="text-base font-normal" style={{ ...E, color: BLUE }}>
          {title}
        </h2>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: DARK }}>
        {message}
      </p>
    </div>
  );
}
