import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { eventsService } from "@/api/services/events.service";
import {
  V,
  V_SOFT,
  BORDER,
  S,
  E,
  SHADOW_CARD,
  SHADOW_HERO_CTA,
  TRUST_ESCROW_LIGHT,
  TRUST_VERIFIED_LIGHT,
  TRUST_SUPPORT_LIGHT,
} from "@/lib/design-tokens";
import { Lock, CheckCircle, MessageCircle, LucideIcon } from "lucide-react";
import { PublicListEventItem } from "@/api/types/events";

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Deep brand violet for the left identity panel.
 * Intentionally darker than V (#692dd4) so the panel reads as a solid surface,
 * not as a large purple button.
 */
const PANEL_BG = "#0f0825";

const ROTATE_INTERVAL_MS = 6000;
const MOBILE_MAX_WIDTH = "(max-width: 767px)";

// ─── Trust items ─────────────────────────────────────────────────────────────

interface TrustItem {
  Icon: LucideIcon;
  label: string;
  color: string;
}

const TRUST: TrustItem[] = [
  { Icon: CheckCircle,   label: "Vendedores verificados", color: TRUST_VERIFIED_LIGHT },
  { Icon: Lock,          label: "Fondos protegidos",      color: TRUST_ESCROW_LIGHT   },
  { Icon: MessageCircle, label: "Soporte por WhatsApp",       color: TRUST_SUPPORT_LIGHT  },
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
    return ev.bannerUrls?.square || ev.bannerUrls?.rectangle || ev.images?.[0]?.src || "";
  }
  return ev.bannerUrls?.rectangle || ev.bannerUrls?.square || ev.images?.[0]?.src || "";
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
    // Shimmer base and highlight as inline styles to avoid <style> tag injection issues
    const SK_BASE = "linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0.06) 75%)";
    const skStyle = {
      background: SK_BASE,
      backgroundSize: "200% 100%",
      animation: "hh-shimmer 1.4s ease-in-out infinite",
    } as const;

    return (
      <div
        style={{
          borderRadius: 20,
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
        `}</style>

        {preferSquareLayout ? (
          // Mobile skeleton
          <div>
            <div style={{ height: 200, ...skStyle }} />
            <div
              style={{
                background: PANEL_BG,
                padding: "20px 18px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {/* Headline 2 lines */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ height: 26, width: "88%", borderRadius: 6, ...skStyle }} />
                <div style={{ height: 26, width: "70%", borderRadius: 6, ...skStyle }} />
              </div>
              {/* Event context block */}
              <div style={{ height: 60, borderRadius: 12, ...skStyle }} />
              {/* Primary CTA */}
              <div style={{ height: 44, borderRadius: 12, ...skStyle }} />
              {/* Secondary CTA */}
              <div style={{ height: 38, borderRadius: 12, opacity: 0.6, ...skStyle }} />
              {/* Trust signals */}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ height: 10, width: 80, borderRadius: 100, opacity: 0.5, ...skStyle }} />
                <div style={{ height: 10, width: 90, borderRadius: 100, opacity: 0.5, ...skStyle }} />
                <div style={{ height: 10, width: 80, borderRadius: 100, opacity: 0.5, ...skStyle }} />
              </div>
            </div>
          </div>
        ) : (
          // Desktop skeleton — left panel + parallelogram image area
          <div style={{ position: "relative", height: 340, background: PANEL_BG, borderRadius: 20, overflow: "hidden" }}>
            {/* Left panel — 3 zones */}
            <div
              style={{
                position: "absolute",
                top: 0, left: 0,
                width: 370,
                height: "100%",
                padding: "28px 32px 26px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {/* Zone 1 — Headline */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ height: 26, width: "92%", borderRadius: 6, ...skStyle }} />
                <div style={{ height: 26, width: "74%", borderRadius: 6, ...skStyle }} />
              </div>
              {/* Zone 2 — Event + dots */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ height: 24, width: "65%", borderRadius: 5, ...skStyle }} />
                  <div style={{ height: 13, width: "80%", borderRadius: 4, opacity: 0.6, ...skStyle }} />
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <div style={{ height: 6, width: 22, borderRadius: 3, ...skStyle }} />
                  <div style={{ height: 6, width: 6, borderRadius: 3, opacity: 0.5, ...skStyle }} />
                  <div style={{ height: 6, width: 6, borderRadius: 3, opacity: 0.5, ...skStyle }} />
                </div>
              </div>
              {/* Zone 3 — CTAs + trust */}
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ height: 42, width: 148, borderRadius: 12, ...skStyle }} />
                  <div style={{ height: 42, width: 118, borderRadius: 12, opacity: 0.6, ...skStyle }} />
                </div>
                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{ height: 10, width: 88, borderRadius: 100, opacity: 0.5, ...skStyle }} />
                  <div style={{ height: 10, width: 96, borderRadius: 100, opacity: 0.5, ...skStyle }} />
                  <div style={{ height: 10, width: 80, borderRadius: 100, opacity: 0.5, ...skStyle }} />
                </div>
              </div>
            </div>
            {/* Parallelogram image area shimmer */}
            <div
              style={{
                position: "absolute",
                bottom: 0, right: 0,
                width: 800, height: 340,
                clipPath: "path('M 800,0 L 66,0 L 0,340 L 800,340 Z')",
                opacity: 0.5,
                ...skStyle,
              }}
            />
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
            height: 6,
            width: i === index ? 22 : 6,
            borderRadius: 4,
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

  // ── MOBILE layout ──────────────────────────────────────────────────────────

  if (preferSquareLayout) {
    return (
      <div
        style={{
          borderRadius: 20,
          overflow: "hidden",
          border: `1px solid ${BORDER}`,
          boxShadow: SHADOW_CARD,
          marginBottom: 14,
        }}
      >
        {/* Image section — clean, no text overlay */}
        <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
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

          {StockBadge}

          {/* Bottom fade into panel */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 80,
              background: `linear-gradient(to bottom, transparent 0%, ${PANEL_BG} 100%)`,
              pointerEvents: "none",
            }}
          />
          {events.length > 1 && (
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                display: "flex",
                gap: 4,
                zIndex: 3,
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
                    background: i === index ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)",
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Brand + event panel */}
        <div style={{ background: PANEL_BG, padding: "20px 18px 24px" }}>

          {/* 1 — Brand headline */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ ...S, fontSize: "clamp(14px, 4.5vw, 22px)", fontWeight: 700, color: "#fff", display: "block", lineHeight: 1.2, whiteSpace: "nowrap" }}>
              Las experiencias no se agotan,
            </span>
            <span style={{ ...E, fontSize: "clamp(15px, 4.8vw, 23px)", fontStyle: "italic", fontWeight: 400, color: V_SOFT, display: "block", lineHeight: 1.2 }}>
              Solo cambian de manos.
            </span>
          </div>

          {/* 2 — Event name + venue */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ ...S, fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 3 }}>
              {event.name}
            </div>
            <div style={{ ...S, fontSize: 11, color: "rgba(255,255,255,0.42)", lineHeight: 1.5 }}>
              {venueStr}{dateStr ? ` · ${dateStr}` : null}
            </div>
          </div>

          {/* 3 — Primary CTA: this event */}
          <Link
            to={`/event/${event.slug}`}
            style={{
              ...S,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 44,
              borderRadius: 12,
              background: "#fff",
              color: PANEL_BG,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              marginBottom: 8,
              boxShadow: SHADOW_HERO_CTA,
            }}
          >
            {isLowStock ? `Ver las ${availableCount} entradas →` : "Ver entradas →"}
          </Link>

          {/* 4 — Secondary CTAs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <Link
              to="/how-it-works"
              style={{
                ...S,
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 38,
                borderRadius: 12,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "rgba(255,255,255,0.65)",
                fontSize: 11,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              ¿Cómo funciona?
            </Link>
          </div>

          {/* 5 — Trust signals */}
          <div style={{ display: "flex", gap: 14, flexWrap: "nowrap", overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {TRUST.map(({ Icon, label, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, ...S, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap" }}>
                <Icon size={11} color={color} strokeWidth={2.2} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── DESKTOP layout — Option A ──────────────────────────────────────────────
  //
  // Layer structure (bottom → top):
  //   1. Parallelogram images  — 508×292px, bottom-flush, clip-path with single
  //                              rounded TL corner (r≈22px); right/bottom sharp.
  //                              Shape: left diagonal + straight top/right/bottom.
  //   2. Right-edge vignette   — subtle dark fade inside the parallelogram shape
  //   3. Stock badge           — absolute, top-right
  //   4. Left panel            — 370px wide, 3 zones:
  //                              Zone 1 (top)    headline brand copy
  //                              Zone 2 (middle) event name + venue + dot nav
  //                              Zone 3 (bottom) CTAs + trust signals
  //
  // Parallelogram path (508×292, lean=91px, r≈22 on TL only):
  //   M 508,0 L 114,0 Q 91,0 84,22 L 0,292 L 508,292 Z

  const PARA_CLIP =
    "path('M 800,0 L 66,0 L 0,340 L 800,340 Z')";

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 20,
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
      {/* ── LAYER 1: Parallelogram images ───────────────────────────────── */}
      {events.map((ev, i) => (
        <div
          key={ev.slug}
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 800,
            height: 340,
            clipPath: PARA_CLIP,
            zIndex: 0,
            opacity: i === index ? 1 : 0,
            transition: "opacity 0.9s ease-in-out",
          }}
        >
          <img
            src={resolveBannerSrc(ev, false)}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 10%",
              display: "block",
            }}
          />
        </div>
      ))}

      {/* ── LAYER 2: Right-edge vignette inside the parallelogram ───────── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 1016,
          height: 340,
          clipPath: PARA_CLIP,
          background: "linear-gradient(to left, rgba(11,7,30,0.28) 0%, transparent 14%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* ── LAYER 3: Stock badge ─────────────────────────────────────────── */}
      {StockBadge}

      {/* ── Dot nav — absolute bottom-right of the panel ────────────────── */}
      {DotNav && (
        <div
          style={{
            position: "absolute",
            bottom: 26,
            right: 32,
            zIndex: 3,
          }}
        >
          {DotNav}
        </div>
      )}

      {/* ── LAYER 4: Left panel — 3 zones ───────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 370,
          height: "100%",
          padding: "28px 32px 26px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          zIndex: 2,
        }}
      >
        {/* Zone 1 — Brand identity (top) */}
        <div>
          <span
            style={{
              ...S,
              fontSize: "clamp(19px, 1.8vw, 24px)",
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.2,
              display: "block",
              whiteSpace: "nowrap",
            }}
          >
            Las experiencias no se agotan,
          </span>
          <span
            style={{
              ...E,
              fontSize: "clamp(20px, 1.9vw, 25px)",
              fontStyle: "italic",
              fontWeight: 400,
              color: V_SOFT,
              lineHeight: 1.2,
              display: "block",
            }}
          >
            Solo cambian de manos.
          </span>
        </div>

        {/* Zone 2 — spacer */}
        <div />

        {/* Zone 3 — Event content + action + trust (bottom) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {/* Event name + venue */}
          <div>
            <div
              style={{
                ...S,
                fontSize: "clamp(17px, 1.6vw, 21px)",
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                marginBottom: 3,
              }}
            >
              {event.name}
            </div>
            <div
              style={{
                ...S,
                fontSize: 11,
                color: "rgba(255,255,255,0.42)",
                lineHeight: 1.5,
              }}
            >
              {venueStr}
              {dateStr ? ` · ${dateStr}` : null}
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              to={`/event/${event.slug}`}
              style={{
                ...S,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 42,
                padding: "0 20px",
                borderRadius: 12,
                background: "#fff",
                color: PANEL_BG,
                fontSize: 12.5,
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
            <Link
              to="/how-it-works"
              style={{
                ...S,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 42,
                padding: "0 16px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.055)",
                border: "1px solid rgba(255,255,255,0.13)",
                color: "rgba(255,255,255,0.58)",
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
                    fontSize: 11,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.55)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}