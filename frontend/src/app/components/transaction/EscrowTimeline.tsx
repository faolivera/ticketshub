import { useTranslation } from 'react-i18next';
import type { EscrowTimelineProps } from './types';
import { TimelineItem } from './TimelineItem';

export function EscrowTimeline({
  role,
  eventDateLabel,
  depositReleaseAtLabel,
}: EscrowTimelineProps) {
  const { t } = useTranslation();

  if (role === 'buyer') {
    return (
      <div style={{ marginTop: 16 }}>
        <TimelineItem state="done"    label={t('transaction.escrowTimeline.buyer1')} />
        <TimelineItem state="done"    label={t('transaction.escrowTimeline.buyer2')} />
        <TimelineItem state="waiting" label={t('transaction.escrowTimeline.buyer3', { date: eventDateLabel })} />
        <TimelineItem state="pending" label={t('transaction.escrowTimeline.buyer4')} isLast />
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <TimelineItem state="done"    label={t('transaction.escrowTimeline.seller1')} />
      <TimelineItem state="done"    label={t('transaction.escrowTimeline.seller2')} />
      <TimelineItem
        state="waiting"
        label={t('transaction.escrowTimeline.seller3', { date: eventDateLabel })}
      />
      <TimelineItem
        state="pending"
        label={t('transaction.escrowTimeline.seller4')}
        sub={depositReleaseAtLabel
          ? t('transaction.escrowTimeline.seller4Sub', { date: depositReleaseAtLabel })
          : undefined}
        isLast
      />
    </div>
  );
}
