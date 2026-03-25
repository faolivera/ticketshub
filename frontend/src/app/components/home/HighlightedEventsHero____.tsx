import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { eventsService } from "@/api/services/events.service";
import {
  V,
  V_SOFT,
  V_MUTED_LIGHT,
  BORDER,
  S,
  E,
  SHADOW_CARD,
  SHADOW_HERO_CTA,
  TRUST_ESCROW,
  TRUST_VERIFIED,
  AMBER_c1,
  R_HERO,
  R_BUTTON,
} from "@/lib/design-tokens";
import { Lock, CheckCircle, RefreshCw, LucideIcon } from "lucide-react";
import { PublicListEventItem } from "@/api/types/events";

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Deep brand violet for the left identity panel.
 * Intentionally darker than V (#692dd4) so the panel reads as a solid surface,
 * not as a large purple button.
 */
const PANEL_BG = "#0f0825";

const ROTATE_INTERVAL_MS = 6000;
const DEFAULT_IMAGE = "https://picsum.photos/seed/event/1400/400";
const MOBILE_MAX_WIDTH = "(max-width: 767px)";

// ─── Trust items ─────────────────────────────────────────────────────────────

interface TrustItem {
  Icon: LucideIcon;
  label: string;
  color: string;
}

const TRUST: TrustItem[] = [
  { Icon: Lock,        label: "Fondos protegidos",      color: TRUST_ESCROW  },
  { Icon: CheckCircle, label: "Vendedores verificados",  color: TRUST_VERIFIED },
  { Icon: RefreshCw,   label: "Garantía de reembolso",   color: AMBER_c1      },
];

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Extends PublicListEventItem with fields not yet present in the API response.
 * Drop the optional markers below as each field lands in the backend.
 */
interface HeroEvent extends PublicListEventItem {
  /** Total tickets available across all active listings. Drives low-stock CTA. */
  availableCount?: number;
  /** ISO date string for the primary occurrence, e.g. "2026-03-24T21:00:00". */
  startDate?: string;
  /** Category slug, e.g. "recital", "festival", "teatro". */
  category?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatPrice(cents: number): string {
  return Math.round(cents / 100).toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  });
}

function formatStartDate(iso: string): string {
  try {
    const d = new Date(iso);
    const day = d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
    const time = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    return `${day} · ${time}hs`;
  } catch {
    return "";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface HighlightedEventsHeroProps {
  onLoad?: () => void;
}

export function HighlightedEventsHero({
  onLoad,
}: HighlightedEventsHeroProps): JSX.Element | null {
  const [events, setEvents] = useState<HeroEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [index, setIndex] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(false);
  const [preferSquareLayout, setPreferSquareLayout] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia(MOBILE_MAX_WIDTH).matches
      : false
  );

  // Responsive layout detection
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MAX_WIDTH);
    const onChange = (): void => setPreferSquareLayout(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Data fetching
  useEffect(() => {
    let cancelled = false;
    async function fetchFeatured(): Promise<void> {
      try {
        const data = await eventsService.getHighlightedEvents();
        if (!cancelled && Array.isArray(data)) {
          setEvents(
            data.filter(
              (e) =>
                e.slug &&
                (e.bannerUrls?.rectangle ||
                  e.bannerUrls?.square ||
                  e.images?.[0]?.src)
            )
          );
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

  // Auto-rotation (pauses on hover)
  useEffect(() => {
    if (events.length <= 1 || paused) return;
    const t = setInterval(
      () => setIndex((i) => (i + 1) % events.length),
      ROTATE_INTERVAL_MS
    );
    return () => clearInterval(t);
  }, [events.length, paused]);

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          borderRadius: R_HERO,
          overflow: "hidden",
          border: `1px solid ${BORDER}`,
          boxShadow: SHADOW_CARD,
          marginBottom: 14,
        }}
      >
        <style>{`
          @keyframes hh-shimmer {
            0%   { background-position: -200% 0; }
            100% { background-position:  200% 0; }
          }
          .hh-sk {
            background: linear-gradient(90deg, #1a0d35 25%, #241244 50%, #1a0d35 75%);
            background-size: 200% 100%;
            animation: hh-shimmer 1.4s ease-in-out infinite;
          }
        `}</style>

        {preferSquareLayout ? (
          // Mobile skeleton
          <div>
            <div className="hh-sk" style={{ height: 220 }} />
            <div
              style={{
                background: PANEL_BG,
                padding: "20px 18px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                className="hh-sk"
                style={{ height: 26, width: "85%", borderRadius: 6, opacity: 0.4 }}
              />
              <div
                className="hh-sk"
                style={{ height: 26, width: "65%", borderRadius: 6, opacity: 0.4 }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <div
                  className="hh-sk"
                  style={{ height: 38, flex: 1, borderRadius: R_BUTTON, opacity: 0.4 }}
                />
                <div
                  className="hh-sk"
                  style={{ height: 38, flex: 1, borderRadius: R_BUTTON, opacity: 0.4 }}
                />
              </div>
            </div>
          </div>
        ) : (
          // Desktop skeleton
          <div style={{ display: "flex", height: 340 }}>
            <div
              style={{
                width: "42%",
                background: PANEL_BG,
                padding: "32px 36px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                className="hh-sk"
                style={{ height: 10, width: 160, borderRadius: 100, opacity: 0.25 }}
              />
              <div
                className="hh-sk"
                style={{ height: 30, width: "90%", borderRadius: 6, opacity: 0.25 }}
              />
              <div
                className="hh-sk"
                style={{ height: 30, width: "68%", borderRadius: 6, opacity: 0.25 }}
              />
              <div
                className="hh-sk"
                style={{
                  height: 12,
                  width: "78%",
                  borderRadius: 4,
                  opacity: 0.18,
                  marginTop: 4,
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <div
                  className="hh-sk"
                  style={{ height: 40, width: 148, borderRadius: R_BUTTON, opacity: 0.3 }}
                />
                <div
                  className="hh-sk"
                  style={{ height: 40, width: 118, borderRadius: R_BUTTON, opacity: 0.3 }}
                />
              </div>
            </div>
            <div className="hh-sk" style={{ flex: 1, opacity: 0.15 }} />
          </div>
        )}
      </div>
    );
  }

  if (events.length === 0) return null;

  const event = events[index];
  const availableCount = event.availableCount;
  const isLowStock =
    typeof availableCount === "number" && availableCount > 0 && availableCount <= 5;
  const isAgotado =
    typeof availableCount === "number" && availableCount === 0;

  const venueStr = [event.venue, event.location?.city]
    .filter(Boolean)
    .join(" · ");

  const dateStr = event.startDate ? formatStartDate(event.startDate) : "";

  const categoryLabel = event.category
    ? event.category.toUpperCase()
    : "EVENTO";

  // Watermark: first word of event name
  const watermarkWord = event.name?.split(" ")[0]?.toUpperCase() ?? "";

  // ── Stock badge (shared between layouts) ───────────────────────────────────

  const StockBadge =
    isAgotado || isLowStock ? (
      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          zIndex: 3,
          padding: "4px 10px",
          borderRadius: 9999,
          background: isAgotado
            ? "rgba(153,28,28,0.35)"
            : "rgba(180,83,9,0.35)",
          border: `1px solid ${isAgotado ? "rgba(220,60,60,0.28)" : "rgba(220,130,40,0.28)"}`,
          ...S,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.07em",
          color: isAgotado ? "#FCA5A5" : "#FCD34D",
          whiteSpace: "nowrap",
        }}
      >
        {isAgotado ? "AGOTADO OFICIAL" : `ÚLTIMAS ${availableCount}`}
      </div>
    ) : null;

  // ── Dot navigator (shared between layouts) ─────────────────────────────────

  const DotNav = events.length > 1 ? (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      {events.map((_, i) => (
        <button
          key={i}
          onClick={() => {
            setIndex(i);
            setPaused(true);
          }}
          aria-label={`Ver evento ${i + 1}`}
          style={{
            height: 5,
            width: i === index ? 20 : 5,
            borderRadius: 3,
            border: "none",
            cursor: "pointer",
            padding: 0,
            background:
              i === index ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.22)",
            transition: "all 0.3s ease",
          }}
        />
      ))}
    </div>
  ) : null;

  // ── Event overlay — Card C: text directly on image, no container ─────────────

  const EventCard = (
    <div>
      {/* Event name */}
      <div
        style={{
          ...S,
          fontSize: 17,
          fontWeight: 700,
          color: "#fff",
          marginBottom: 4,
          lineHeight: 1.2,
        }}
      >
        {event.name}
      </div>

      {/* Venue + date */}
      <div
        style={{
          ...S,
          fontSize: 11,
          color: "rgba(255,255,255,0.62)",
          marginBottom: 14,
          lineHeight: 1.5,
        }}
      >
        {venueStr}
        {dateStr ? ` · ${dateStr}` : null}
      </div>

      {/* Price + CTA */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: event.lowestListingPrice ? "space-between" : "flex-end",
        }}
      >
        {event.lowestListingPrice && (
          <div>
            <div
              style={{
                ...S,
                fontSize: 9,
                color: "rgba(255,255,255,0.50)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              Desde
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
              <span style={{ ...S, fontSize: 22, fontWeight: 700, color: "#fff" }}>
                ${formatPrice(event.lowestListingPrice.amount)}
              </span>
              <span style={{ ...S, fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 400 }}>
                ARS
              </span>
            </div>
          </div>
        )}

        <Link
          to={`/event/${event.slug}`}
          style={{
            ...S,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: 38,
            padding: "0 18px",
            borderRadius: R_BUTTON,
            background: "#fff",
            color: "#0f0825",
            fontSize: 12,
            fontWeight: 700,
            textDecoration: "none",
            whiteSpace: "nowrap",
            boxShadow: SHADOW_HERO_CTA,
          }}
        >
          {isLowStock
            ? `Ver las ${availableCount} entradas →`
            : "Ver entradas →"}
        </Link>
      </div>
    </div>
  );

  // ── MOBILE layout ──────────────────────────────────────────────────────────

  if (preferSquareLayout) {
    return (
      <div
        style={{
          borderRadius: R_HERO,
          overflow: "hidden",
          border: `1px solid ${BORDER}`,
          boxShadow: SHADOW_CARD,
          marginBottom: 14,
        }}
      >
        {/* Image section */}
        <div style={{ position: "relative", height: 220, overflow: "hidden" }}>
          {events.map((ev, i) => (
            <img
              key={ev.slug}
              src={resolveBannerSrc(ev, true)}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center 30%",
                opacity: i === index ? 1 : 0,
                transition: "opacity 0.9s ease-in-out",
              }}
            />
          ))}

          {/* Gradient: bottom blends into panel */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, transparent 30%, rgba(15,8,37,0.95) 100%)",
            }}
          />

          {StockBadge}

          {/* Dots — top right */}
          {events.length > 1 && (
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                display: "flex",
                gap: 4,
              }}
            >
              {events.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Ver evento ${i + 1}`}
                  style={{
                    height: 4,
                    width: i === index ? 16 : 4,
                    borderRadius: 2,
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    background:
                      i === index
                        ? "rgba(255,255,255,0.8)"
                        : "rgba(255,255,255,0.25)",
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
            </div>
          )}

          {/* Event name pinned to bottom of image */}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 14,
              right: 14,
            }}
          >
            <div
              style={{
                ...S,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.07em",
                color: V_SOFT,
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              {categoryLabel}
            </div>
            <div
              style={{
                ...S,
                fontSize: 18,
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.2,
              }}
            >
              {event.name}
            </div>
            {venueStr ? (
              <div
                style={{
                  ...S,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.48)",
                  marginTop: 2,
                }}
              >
                {venueStr}
              </div>
            ) : null}
          </div>
        </div>

        {/* Brand copy + CTAs panel */}
        <div style={{ background: PANEL_BG, padding: "18px 16px 22px" }}>
          {/* Headline */}
          <div style={{ marginBottom: 14 }}>
            <span
              style={{
                ...S,
                fontSize: 20,
                fontWeight: 700,
                color: "#fff",
                display: "block",
                lineHeight: 1.2,
              }}
            >
              Entradas para los shows
            </span>
            <span
              style={{
                ...E,
                fontSize: 21,
                fontStyle: "italic",
                fontWeight: 400,
                color: V_SOFT,
                display: "block",
                lineHeight: 1.2,
              }}
            >
              que ya están agotados.
            </span>
          </div>

          {/* Price + event CTA row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: event.lowestListingPrice ? "space-between" : "flex-end",
              marginBottom: 12,
            }}
          >
            {event.lowestListingPrice && (
              <div>
                <div
                  style={{
                    ...S,
                    fontSize: 9,
                    color: "rgba(255,255,255,0.28)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    marginBottom: 1,
                  }}
                >
                  Desde
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <span
                    style={{ ...S, fontSize: 18, fontWeight: 700, color: "#fff" }}
                  >
                    ${formatPrice(event.lowestListingPrice.amount)}
                  </span>
                  <span
                    style={{
                      ...S,
                      fontSize: 10,
                      color: "rgba(255,255,255,0.30)",
                    }}
                  >
                    ARS
                  </span>
                </div>
              </div>
            )}
            <Link
              to={`/event/${event.slug}`}
              style={{
                ...S,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 40,
                padding: "0 16px",
                borderRadius: R_BUTTON,
                background: V,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
                boxShadow: SHADOW_HERO_CTA,
              }}
            >
              {isLowStock ? `${availableCount} entradas →` : "Ver entradas →"}
            </Link>
          </div>

          {/* Explore + how it works */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <Link
              to="/events"
              style={{
                ...S,
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 38,
                borderRadius: R_BUTTON,
                background: "#fff",
                color: PANEL_BG,
                fontSize: 11,
                fontWeight: 700,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Explorar eventos →
            </Link>
            <Link
              to="/how-it-works"
              style={{
                ...S,
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 38,
                borderRadius: R_BUTTON,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "rgba(255,255,255,0.70)",
                fontSize: 11,
                fontWeight: 500,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              ¿Cómo funciona?
            </Link>
          </div>

          {/* Trust signals — compact single row */}
          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "nowrap",
              overflowX: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {TRUST.map(({ Icon, label, color }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  flexShrink: 0,
                  ...S,
                  fontSize: 10,
                  color: "rgba(255,255,255,0.38)",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon size={11} color={color} strokeWidth={2.2} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── DESKTOP layout ─────────────────────────────────────────────────────────
  //
  // Layer structure (bottom → top):
  //   1. Image          — right-aligned, covers right ~70%
  //   2. Dark tint      — 20% opacity over image area only
  //   3. Bottom scrim   — vertical gradient for event card legibility
  //   4. Diagonal mask  — solid PANEL_BG, clip-path polygon for diagonal cut
  //   5. Diagonal feather — soft gradient to blur the diagonal edge
  //   6. Watermark      — low-opacity text in image area
  //   7. Stock badge    — top-right corner
  //   8. Content        — brand copy left + event card right

  return (
    <div
      style={{
        position: "relative",
        borderRadius: R_HERO,
        overflow: "hidden",
        border: `1px solid ${BORDER}`,
        boxShadow: SHADOW_CARD,
        marginBottom: 14,
        height: 340,
        background: PANEL_BG,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── LAYER 1: Image — right-aligned, ~70% width ──────────────────── */}
      {events.map((ev, i) => (
        <img
          key={ev.slug}
          src={resolveBannerSrc(ev, false)}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "80%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 35%",
            opacity: i === index ? 1 : 0,
            transition: "opacity 0.9s ease-in-out",
            zIndex: 0,
          }}
        />
      ))}

      {/* ── LAYER 2: Dark tint over image area ──────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "80%",
          height: "100%",
          background: "rgba(10,4,25,0.20)",
          zIndex: 1,
        }}
      />

      {/* ── LAYER 3: Bottom scrim — only bottom 40% for card legibility ──── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.50) 32%, transparent 52%)",
          zIndex: 2,
        }}
      />

      {/* ── LAYER 4: Diagonal fade — solid PANEL_BG left → transparent right */}
      {/* 105deg tilts the gradient so top fades at ~32%, bottom fades at ~46% */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(105deg, ${PANEL_BG} 0%, ${PANEL_BG} 24%, rgba(15,8,37,0.85) 32%, rgba(15,8,37,0.30) 40%, rgba(15,8,37,0.0) 50%)`,
          zIndex: 3,
        }}
      />

      {/* ── LAYER 5: Watermark ───────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: "8%",
          transform: "translateY(-50%)",
          fontSize: 88,
          fontWeight: 900,
          color: "rgba(255,255,255,0.05)",
          letterSpacing: "-0.03em",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 4,
          ...S,
        }}
      >
        {watermarkWord}
      </div>

      {/* ── LAYER 6: Stock badge ─────────────────────────────────────────── */}
      {StockBadge}

      {/* ── LAYER 7: Content ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          zIndex: 5,
        }}
      >
        {/* Brand copy — Panel A: no eyebrow, headline, CTAs, trust, dots */}
        <div
          style={{
            width: "40%",
            padding: "0 36px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flexShrink: 0,
            gap: 18,
          }}
        >
          {/* Headline */}
          <div>
            <span
              style={{
                ...S,
                fontSize: "clamp(20px, 2vw, 27px)",
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.2,
                display: "block",
              }}
            >
              Entradas para los shows
            </span>
            <span
              style={{
                ...E,
                fontSize: "clamp(22px, 2.2vw, 29px)",
                fontStyle: "italic",
                fontWeight: 400,
                color: V_SOFT,
                lineHeight: 1.2,
                display: "block",
              }}
            >
              que ya están agotados.
            </span>
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              to="/events"
              style={{
                ...S,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 42,
                padding: "0 20px",
                borderRadius: R_BUTTON,
                background: "#fff",
                color: PANEL_BG,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
                boxShadow: SHADOW_HERO_CTA,
              }}
            >
              Explorar eventos →
            </Link>
            <Link
              to="/how-it-works"
              style={{
                ...S,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 42,
                padding: "0 16px",
                borderRadius: R_BUTTON,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.17)",
                color: "rgba(255,255,255,0.68)",
                fontSize: 12,
                fontWeight: 500,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              ¿Cómo funciona?
            </Link>
          </div>

          {/* Trust signals */}
          <div style={{ display: "flex", gap: 14, flexWrap: "nowrap" }}>
            {TRUST.map(({ Icon, label, color }) => (
              <div
                key={label}
                style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}
              >
                <Icon size={11} color={color} strokeWidth={2.2} />
                <span
                  style={{
                    ...S,
                    fontSize: 10,
                    color: "rgba(255,255,255,0.38)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Dots — own row */}
          {DotNav}
        </div>

        {/* Event area — right side, text directly on image */}
        <div style={{ flex: 1, position: "relative" }}>
          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: 20,
              right: 20,
              zIndex: 1,
            }}
          >
            {EventCard}
          </div>
        </div>
      </div>
    </div>
  );
}
