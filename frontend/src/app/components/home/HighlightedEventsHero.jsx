import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { eventsService } from "@/api/services/events.service";
import { V, BORDER, S, E } from "@/lib/design-tokens";
import { ArrowRight, Lock, CheckCircle, RefreshCw } from "lucide-react";

const TRUST = [
  { Icon: Lock, title: "Pago en escrow", color: "#4f46e5" },
  { Icon: CheckCircle, title: "Entradas verificadas", color: "#0f766e" },
  { Icon: RefreshCw, title: "Garantía total", color: "#b45309" },
];

const ROTATE_INTERVAL_MS = 6000;
const DEFAULT_IMAGE = "https://picsum.photos/seed/event/1400/400";

/**
 * Featured-events hero for the home page; admin preview reuses this component.
 */
const MOBILE_MAX_WIDTH = "(max-width: 767px)";

function resolveBannerSrc(ev, preferSquare) {
  if (preferSquare) {
    return (
      ev.bannerUrls?.square ||
      ev.bannerUrls?.rectangle ||
      ev.images?.[0]?.src ||
      DEFAULT_IMAGE
    );
  }
  return (
    ev.bannerUrls?.rectangle ||
    ev.bannerUrls?.square ||
    ev.images?.[0]?.src ||
    DEFAULT_IMAGE
  );
}

export function HighlightedEventsHero() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [preferSquareLayout, setPreferSquareLayout] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_MAX_WIDTH).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MAX_WIDTH);
    const onChange = () => setPreferSquareLayout(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
    return () => {
      cancelled = true;
    };
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
          aspectRatio: preferSquareLayout ? "1 / 1" : "1400 / 400",
          minHeight: preferSquareLayout ? undefined : 280,
        }}
      >
        {events.map((ev, i) => {
          const src = resolveBannerSrc(ev, preferSquareLayout);
          return (
            <img
              key={ev.slug}
              src={src}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center 35%",
                opacity: i === index ? 1 : 0,
                transition: "opacity 0.9s ease-in-out",
              }}
            />
          );
        })}
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
            padding: preferSquareLayout ? "20px 14px 14px 14px" : "44px 44px 20px 44px",
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
              justifyContent: preferSquareLayout ? "center" : "flex-end",
              width: preferSquareLayout ? "100%" : "50%",
              marginLeft: preferSquareLayout ? 0 : "auto",
              marginTop: preferSquareLayout ? 10 : 16,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: preferSquareLayout ? "nowrap" : "wrap",
                gap: preferSquareLayout ? 10 : 18,
                justifyContent: preferSquareLayout ? "center" : "flex-end",
                alignItems: "center",
                padding: preferSquareLayout ? "8px 10px" : "12px 16px",
                borderRadius: 12,
                backgroundColor: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(6px)",
                maxWidth: "100%",
                overflowX: preferSquareLayout ? "auto" : undefined,
                WebkitOverflowScrolling: preferSquareLayout ? "touch" : undefined,
                scrollbarWidth: preferSquareLayout ? "none" : undefined,
                msOverflowStyle: preferSquareLayout ? "none" : undefined,
              }}
              className={preferSquareLayout ? "highlighted-events-hero-trust-scroll" : undefined}
            >
              {TRUST.map(({ Icon, title, color }) => (
                <div
                  key={title}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0,
                    gap: preferSquareLayout ? 4 : 6,
                    fontSize: preferSquareLayout ? 10 : 12.5,
                    color: "rgba(255,255,255,0.95)",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    letterSpacing: preferSquareLayout ? "-0.02em" : undefined,
                    ...S,
                  }}
                >
                  <Icon size={preferSquareLayout ? 11 : 14} color={color} strokeWidth={2.2} />
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
