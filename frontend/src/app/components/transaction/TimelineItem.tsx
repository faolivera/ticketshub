import type { CSSProperties } from 'react';
import { GREEN, WARN_SOLID, ABG, V, VLIGHT, VL_BORDER, GBORD, ABORD, BORDER, BORD2, MUTED, HINT, S } from '@/lib/design-tokens';
import type { TimelineItemState } from './types';

export const TIMELINE_DOT_STYLE: Record<TimelineItemState, CSSProperties> = {
  done:    { background: GREEN },
  current: { background: WARN_SOLID, boxShadow: `0 0 0 3px ${ABG}` },
  waiting: { background: V,          boxShadow: `0 0 0 3px ${VLIGHT}` },
  pending: { background: 'transparent', border: `2px solid ${BORD2}` },
};

export const TIMELINE_LINE_COLOR: Record<TimelineItemState, string> = {
  done:    GBORD,
  current: ABORD,
  waiting: VL_BORDER,
  pending: BORDER,
};

export const TIMELINE_LABEL_STYLE: Record<TimelineItemState, CSSProperties> = {
  done:    { color: GREEN,     fontWeight: 600 },
  current: { color: '#92400e', fontWeight: 700 },
  waiting: { color: V,         fontWeight: 600 },
  pending: { color: HINT,      fontWeight: 500 },
};

export function TimelineItem({
  state,
  label,
  sub,
  isLast = false,
}: {
  state: TimelineItemState;
  label: string;
  sub?: string;
  isLast?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 14, ...S }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
        <div
          style={{
            width: 14, height: 14, borderRadius: '50%', flexShrink: 0, zIndex: 1, marginTop: 3,
            boxSizing: 'border-box',
            ...TIMELINE_DOT_STYLE[state],
          }}
        />
        {!isLast && (
          <div style={{ width: 2, flex: 1, minHeight: 20, marginTop: 2, marginBottom: 2, background: TIMELINE_LINE_COLOR[state] }} />
        )}
      </div>

      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
        <p style={{ fontSize: 13.5, margin: 0, marginBottom: sub ? 2 : 0, ...TIMELINE_LABEL_STYLE[state] }}>
          {label}
        </p>
        {sub && (
          <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{sub}</p>
        )}
      </div>
    </div>
  );
}
