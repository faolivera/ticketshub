import { CARD, BORDER, V, S, R_CARD, R_BUTTON } from '@/lib/design-tokens';
import type { EventCardProps } from './types';

export function EventCard({
  eventName,
  eventDateLabel,
  venue,
  ticketTypeLabel,
  sectorLabel,
  squareUrl,
  rectangleUrl,
  quantity,
}: EventCardProps) {
  const bgImage = rectangleUrl || squareUrl;

  return (
    <div
      style={{
        ...S,
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: R_CARD,
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* Hero banner */}
      <div className="h-44 sm:h-52 md:h-56" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Blurred background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            backgroundImage: bgImage ? `url(${bgImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(12px) brightness(0.6) saturate(1.2)',
            transform: 'scale(1.1)',
            backgroundColor: '#262626',
          }}
        />
        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background:
              'linear-gradient(to right, rgba(38,38,38,0.65) 0%, rgba(38,38,38,0.38) 45%, rgba(38,38,38,0.05) 100%)',
          }}
        />
        {/* Content row */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            height: '100%',
            display: 'flex',
            alignItems: 'flex-end',
            gap: 14,
            padding: '0 20px 18px',
          }}
        >
          {/* Square image */}
          <div
            style={{
              height: 'calc(100% - 28px)',
              aspectRatio: '1 / 1',
              borderRadius: R_BUTTON,
              background: V,
              flexShrink: 0,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            {squareUrl ? (
              <img src={squareUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              '🎫'
            )}
          </div>
          {/* Text details */}
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {eventName}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>
              {eventDateLabel}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
              {venue}
            </p>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.9)',
                  background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 100,
                  padding: '2px 8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {ticketTypeLabel}
              </span>
              {sectorLabel && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.85)',
                    background: 'rgba(255,255,255,0.13)',
                    borderRadius: 100,
                    padding: '2px 8px',
                  }}
                >
                  {sectorLabel}
                </span>
              )}
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.85)',
                  background: 'rgba(255,255,255,0.13)',
                  borderRadius: 100,
                  padding: '2px 8px',
                }}
              >
                ×{quantity}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
