import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { eventsService } from "@/api/services/events.service";
import {
  V,
  BORDER,
  S,
  E,
  TRUST_ESCROW,
  TRUST_VERIFIED,
  AMBER_c1,
  SHADOW_CARD,
  SHADOW_HERO_CTA,
  OVERLAY_DARK_45,
  V_SOFT,
} from "@/lib/design-tokens";
import { Lock, CheckCircle, RefreshCw, LucideIcon } from "lucide-react";
import { PublicListEventItem } from "@/api/types/events";

interface TrustItem {
  Icon: LucideIcon;
  title: string;
  color: string;
}

const TRUST: TrustItem[] = [
  { Icon: Lock, title: "Fondos protegidos", color: TRUST_ESCROW },
  { Icon: CheckCircle, title: "Vendedores verificados", color: TRUST_VERIFIED },
  { Icon: RefreshCw, title: "Garantía total", color: AMBER_c1 },
];


// Left-to-right scrim: protects the copy column regardless of the artist photo
const SCRIM_HERO =
  "linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.72) 40%, rgba(0,0,0,0.30) 65%, rgba(0,0,0,0) 100%)";

const ROTATE_INTERVAL_MS = 6000;
const DEFAULT_IMAGE = "https://picsum.photos/seed/event/1400/400";

/**
 * Featured-events hero for the home page; admin preview reuses this component.
 *
 * Expected event fields (in addition to existing ones):
 *   - lowestListingPriceWithFees?: { amount: number; currency: string }  — cheapest listing with max commission applied (in cents)
 *   - availableCount?: number  — total tickets in stock (not yet in API response; drives CTA label)
 */
const MOBILE_MAX_WIDTH = "(max-width: 767px)";

// Extend PublicListEventItem with the availableCount field that is not yet in the API
interface HeroEvent extends PublicListEventItem {
  availableCount?: number;
}

function resolveBannerSrc(ev: HeroEvent, preferSquare: boolean): string {
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

interface HighlightedEventsHeroProps {
  onLoad?: () => void;
}

export function HighlightedEventsHero({ onLoad }: HighlightedEventsHeroProps): JSX.Element | null {
  const [events, setEvents] = useState<HeroEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [index, setIndex] = useState<number>(0);
  const [preferSquareLayout, setPreferSquareLayout] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_MAX_WIDTH).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MAX_WIDTH);
    const onChange = (): void => setPreferSquareLayout(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchFeatured(): Promise<void> {
      try {
        const data = await eventsService.getHighlightedEvents();
        if (!cancelled && Array.isArray(data)) {
          setEvents(data.filter((e) => e.slug && (e.bannerUrls?.rectangle || e.bannerUrls?.square || e.images?.[0]?.src)));
          setIndex(0);
        }
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          onLoad?.();
        }
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

  if (loading) return (
    <div style={{ background: "white", borderRadius: 20, overflow: "hidden", border: `1px solid ${BORDER}`, boxShadow: SHADOW_CARD, marginBottom: 14 }}>
      <style>{`
        @keyframes hh-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .hh-sk { background: linear-gradient(90deg, #e8e5e2 25%, #f2efec 50%, #e8e5e2 75%); background-size: 200% 100%; animation: hh-shimmer 1.4s ease-in-out infinite; }
      `}</style>
      <div style={{ position: "relative", aspectRatio: preferSquareLayout ? "1 / 1" : "1400 / 400", minHeight: preferSquareLayout ? undefined : 280, overflow: "hidden" }}>
        {/* Full-area shimmer */}
        <div className="hh-sk" style={{ position: "absolute", inset: 0 }} />
        {/* Copy area placeholders — bottom left */}
        <div style={{ position: "absolute", bottom: 0, left: 0, padding: "clamp(20px,3vw,44px)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="hh-sk" style={{ height: 14, width: 72, borderRadius: 100, opacity: 0.55 }} />
          <div className="hh-sk" style={{ height: 30, width: 240, borderRadius: 7, opacity: 0.55 }} />
          <div className="hh-sk" style={{ height: 13, width: 160, borderRadius: 5, opacity: 0.55 }} />
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <div className="hh-sk" style={{ height: 48, width: 152, borderRadius: 10, opacity: 0.55 }} />
            <div className="hh-sk" style={{ height: 48, width: 112, borderRadius: 10, opacity: 0.55 }} />
          </div>
        </div>
      </div>
    </div>
  );

  if (events.length === 0) return null;

  const event = events[index];

  // availableCount: not yet present in API — when added, drives CTA label
  const availableCount = event.availableCount;
  const isLowStock = typeof availableCount === "number" && availableCount <= 5;

  return (
    <div
      style={{
        background: "white",
        borderRadius: 20,
        overflow: "hidden",
        border: `1px solid ${BORDER}`,
        boxShadow: SHADOW_CARD,
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

        {/* Bottom-to-top gradient: photo visible at top, copy lives on dark base */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: SCRIM_HERO,
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
            justifyContent: "flex-end",
          }}
        >
          {/* Primary content: all copy lives at the bottom on the dark gradient */}
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
                marginBottom: 4,
              }}
            >
              {event.venue}
              {event.location?.city ? ` · ${event.location.city}` : ""}
            </p>

            {/* Value proposition — static, not event-specific */}
            <p
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.72)",
                lineHeight: 1.5,
                marginBottom: 16,
                ...S,
              }}
            >
              Entradas para shows agotados, de{" "}
              <span style={{ color: V_SOFT, fontWeight: 600 }}>
                vendedores verificados
              </span>
              .
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Link
                to={`/event/${event.slug}`}
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 20px",
                  minHeight: 48,
                  minWidth: 160,
                  borderRadius: 10,
                  background: V,
                  color: "white",
                  lineHeight: 1.3,
                  cursor: "pointer",
                  textDecoration: "none",
                  ...S,
                  boxShadow: SHADOW_HERO_CTA,
                }}
              >
                {isLowStock ? (
                  <span style={{ fontSize: 15, fontWeight: 600 }}>
                    Ver las {availableCount} entradas →
                  </span>
                ) : (
                  <>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>Ver entradas →</span>
                    {event.lowestListingPriceWithFees && (
                      <span style={{ fontSize: 11, opacity: 0.8 }}>
                        precio final desde ${Math.round(event.lowestListingPriceWithFees!.amount / 100).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </>
                )}
              </Link>

              <Link
                to="/how-it-works"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 20px",
                  height: 48,
                  borderRadius: 10,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  textDecoration: "none",
                  ...S,
                }}
              >
                ¿Cómo funciona?
              </Link>
            </div>
          </div>

          {/* Secondary trust row — existing, kept as-is */}
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
                backgroundColor: OVERLAY_DARK_45,
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
