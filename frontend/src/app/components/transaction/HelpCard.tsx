import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { CARD, BORDER, DARK, MUTED, E, S } from '@/lib/design-tokens';
import type { HelpCardProps } from './types';

export function HelpCard({ title, body, supportLabel, supportTo }: HelpCardProps) {
  return (
    <div
      className="rounded-[14px] border p-5"
      style={{ ...S, background: CARD, borderColor: BORDER }}
    >
      <h2 className="mb-2 text-base font-normal" style={{ ...E, color: DARK }}>
        {title}
      </h2>
      <p className="mb-4 text-sm leading-relaxed" style={{ color: MUTED }}>
        {body}
      </p>
      <Link
        to={supportTo}
        className="flex w-full items-center justify-center gap-2 rounded-[10px] py-3 text-sm font-bold text-white no-underline"
        style={{ background: DARK, ...S }}
      >
        <Mail className="h-4 w-4" />
        {supportLabel}
      </Link>
    </div>
  );
}
