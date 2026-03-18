import { useTranslation } from 'react-i18next';
import { TX, txFontSans } from './tokens';
import type { EscrowTimelineProps } from './types';

function Dot({ done, active }: { done: boolean; active: boolean }) {
  return (
    <span
      className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
      style={{
        background: done || active ? TX.V : TX.BORD2,
        boxShadow: active ? `0 0 0 3px ${TX.VLIGHT}` : undefined,
      }}
    />
  );
}

export function EscrowTimeline({
  role,
  eventDateLabel,
  depositReleaseAtLabel,
}: EscrowTimelineProps) {
  const { t } = useTranslation();
  const lines =
    role === 'buyer'
      ? [
          { done: true, active: false, label: t('transaction.escrowTimeline.buyer1') },
          { done: true, active: false, label: t('transaction.escrowTimeline.buyer2') },
          {
            done: false,
            active: true,
            label: t('transaction.escrowTimeline.buyer3', { date: eventDateLabel }),
          },
          { done: false, active: false, label: t('transaction.escrowTimeline.buyer4') },
        ]
      : [
          { done: true, active: false, label: t('transaction.escrowTimeline.seller1') },
          { done: true, active: false, label: t('transaction.escrowTimeline.seller2') },
          {
            done: false,
            active: true,
            label: t('transaction.escrowTimeline.seller3', { date: eventDateLabel }),
          },
          {
            done: false,
            active: false,
            label: depositReleaseAtLabel
              ? t('transaction.escrowTimeline.seller4WithDate', { date: depositReleaseAtLabel })
              : t('transaction.escrowTimeline.seller4'),
          },
        ];

  return (
    <ul className="mt-4 space-y-0 border-l-2 pl-4" style={{ borderColor: TX.BORDER, ...txFontSans }}>
      {lines.map((line, i) => (
        <li key={i} className="relative -ml-[21px] flex gap-3 pb-4 last:pb-0">
          <Dot done={line.done} active={line.active} />
          <p
            className="text-sm font-semibold leading-snug"
            style={{ color: line.active ? TX.V : line.done ? TX.GREEN : TX.MUTED }}
          >
            {line.label}
          </p>
        </li>
      ))}
    </ul>
  );
}
