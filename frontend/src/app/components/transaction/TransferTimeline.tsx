import { useTranslation } from 'react-i18next';
import { V, VLIGHT, BORD2, BORDER, GREEN, MUTED, S } from '@/lib/design-tokens';
import type { TransferTimelineProps } from './types';

function Dot({ done, active }: { done: boolean; active: boolean }) {
  return (
    <span
      className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
      style={{
        background: done || active ? V : BORD2,
        boxShadow: active ? `0 0 0 3px ${VLIGHT}` : undefined,
      }}
    />
  );
}

export function TransferTimeline({ sellerSent }: TransferTimelineProps) {
  const { t } = useTranslation();

  const lines = [
    {
      done: sellerSent,
      active: false,
      label: t('transaction.transferTimeline.sent'),
    },
    {
      done: false,
      active: false,
      label: t('transaction.transferTimeline.received'),
    },
  ];

  return (
    <ul className="mt-4 space-y-0 border-l-2 pl-4" style={{ borderColor: BORDER, ...S }}>
      {lines.map((line, i) => (
        <li key={i} className="relative -ml-[21px] flex gap-3 pb-4 last:pb-0">
          <Dot done={line.done} active={line.active} />
          <p
            className="text-sm font-semibold leading-snug"
            style={{ color: line.active ? V : line.done ? GREEN : MUTED }}
          >
            {line.label}
          </p>
        </li>
      ))}
    </ul>
  );
}
