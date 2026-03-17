import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { eventsService } from "@/api/services/events.service";
import { V, VLIGHT, BORDER, S, E } from "@/lib/design-tokens";
import { ArrowRight, Lock, CheckCircle, RefreshCw } from "lucide-react";

const TRUST = [
  { Icon: Lock, title: "Pago en escrow", color: "#4f46e5" },
  { Icon: CheckCircle, title: "Entradas verificadas", color: "#0f766e" },
  { Icon: RefreshCw, title: "Garantía total", color: "#b45309" },
];

const ROTATE_INTERVAL_MS = 6000;
const DEFAULT_IMAGE = "https://picsum.photos/seed/event/1400/400";

/**
 * Hero with same dimensions as the landing hero. Rotates through featured events,
 * shows rectangle banner, "Ver Entradas" button (links to event page), and trust messages bottom-right.
 */
export function HighlightedEventsHero() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchFeatured() {
      try {
        const data = await eventsService.listEvents({
          highlighted: true,
          limit: 20,
        });
        if (!cancelled && Array.isArray(data)) {
          setEvents(data.filter((e) => e.slug && (e.bannerUrls?.rectangle || e.bannerUrls?.square || e.images?.[0]?.src)));
          setIndex(0);
        }
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchFeatured();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (events.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % events.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [events.length]);

  if (loading || events.length === 0) return null;

  const event = events[index];
  const img =
    event.bannerUrls?.rectangle ||
    event.bannerUrls?.square ||
    event.images?.[0]?.src ||
    DEFAULT_IMAGE;

  return (
    <div
      style={{
        background: "white",
        borderRadius: 20,
        overflow: "hidden",
        border: `1px solid ${BORDER}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          aspectRatio: "1400/400",
          minHeight: 280,
        }}
      >
        <img
          src={img}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 35%",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(105deg, rgba(15,15,26,0.88) 0%, rgba(15,15,26,0.72) 40%, rgba(15,15,26,0.25) 75%, rgba(15,15,26,0.1) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            padding: "44px 44px 20px 44px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ flex: "0 0 auto", maxWidth: 520 }}>
            <h2
              style={{
                ...E,
                fontSize: "clamp(22px, 2.8vw, 36px)",
                color: "white",
                lineHeight: 1.2,
                marginBottom: 8,
                letterSpacing: "-0.5px",
              }}
            >
              {event.name}
            </h2>
            <p
              style={{
                fontSize: 14.5,
                color: "rgba(255,255,255,0.75)",
                lineHeight: 1.5,
                marginBottom: 20,
              }}
            >
              {event.venue}
              {event.location?.city ? ` · ${event.location.city}` : ""}
            </p>
            <Link
              to={`/event/${event.slug}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 22px",
                borderRadius: 10,
                background: V,
                border: "none",
                color: "white",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                textDecoration: "none",
                ...S,
                boxShadow: "0 4px 18px rgba(109,40,217,0.4)",
              }}
            >
              Ver Entradas <ArrowRight size={14} />
            </Link>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              width: "50%",
              marginLeft: "auto",
              marginTop: 16,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                flexWrap: "wrap",
                gap: 18,
                justifyContent: "flex-end",
                padding: "12px 16px",
                borderRadius: 12,
                backgroundColor: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(6px)",
              }}
            >
            {TRUST.map(({ Icon, title, color }) => (
              <div
                key={title}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12.5,
                  color: "rgba(255,255,255,0.95)",
                  fontWeight: 500,
                  ...S,
                }}
              >
                <Icon size={14} color={color} strokeWidth={2.2} />
                {title}
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
