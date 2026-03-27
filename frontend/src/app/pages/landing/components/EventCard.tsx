import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Zap, TrendingUp, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import {
  V,
  DARK,
  MUTED,
  CARD,
  BORDER,
  BORD2,
  AMBER,
  ABORD,
  AMBER_BG_LIGHT,
  ERROR_DARK,
  BADGE_DEMAND_BG,
  BADGE_DEMAND_BORDER,
  SHADOW_CARD_HOVER,
  SHADOW_CARD_SM,
  GRADIENT_CARD_TOP,
  OVERLAY_V_STRONG,
  OVERLAY_DARK_45,
  R_BUTTON,
  R_CARD,
  V_SOFT,
} from "@/lib/design-tokens";
import type { CardShape } from "../types";

interface EventCardProps {
  event: CardShape;
  index: number;
  hovered: boolean;
  onHover: (id: string | null) => void;
}

function useMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < breakpoint
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

export function EventCard({ event, index: _index, hovered, onHover }: EventCardProps) {
  const { t } = useTranslation();
  const isMobile = useMobile();
  const dates = event.dates || [];
  const multi = dates.length > 1;
  const S2: CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

  // datesLabel: coma-separated, usado en desktop (title attr + texto)
  const datesLabel = dates.length === 0 ? "" : dates.join(", ");
  // datesMobile: · separated, muestra todas las fechas en mobile
  const datesMobile = dates.length === 0 ? t("landing.dateTBD") : dates.join(" · ");

  const urgBadge = (type: string): { bg?: string; color?: string; border?: string } => {
    if (type === "últimas")
      return { bg: AMBER_BG_LIGHT, color: AMBER, border: `1px solid ${ABORD}` };
    if (type === "demanda")
      return { bg: BADGE_DEMAND_BG, color: ERROR_DARK, border: `1px solid ${BADGE_DEMAND_BORDER}` };
    return {};
  };

  // ─── MOBILE HORIZONTAL CARD ────────────────────────────────────────────────
  //
  // Layout: imagen izquierda (38%, clip diagonal ~8°) | body derecha
  //
  // Body tiene dos grupos:
  //   [1] nombre + venue + fechas — agrupados con gap pequeño (visualmente juntos)
  //   [2] precio — anclado al fondo via space-between
  //
  // minHeight en lugar de height fijo para que el card crezca si el nombre
  // ocupa 2 líneas Y las fechas ocupan 2 líneas, sin clipear contenido.
  //
  const mobileCard = (
    <div
      onMouseEnter={() => onHover(event.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        background: CARD,
        borderRadius: R_CARD,
        overflow: "hidden",
        border: `1px solid ${BORDER}`,
        boxShadow: hovered ? SHADOW_CARD_HOVER : SHADOW_CARD_SM,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "row",
        minHeight: 104,
        position: "relative",
      }}
    >
      {/* ── Imagen con corte diagonal ~8° ── */}
      <div
        style={{
          width: "38%",
          flexShrink: 0,
          alignSelf: "stretch",
          position: "relative",
          overflow: "hidden",
          clipPath: "polygon(0 0, 100% 0, 86% 100%, 0 100%)",
        }}
      >
        <img
          src={event.img}
          alt={event.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
            display: "block",
            transform: hovered ? "scale(1.06)" : "scale(1)",
            transition: "transform 0.38s ease",
          }}
        />
        <div style={{ position: "absolute", inset: 0, background: GRADIENT_CARD_TOP }} />

        {/* Badge urgencia — top-left, fuera del área del corte diagonal */}
        {event.badge && (
          <div style={{ position: "absolute", top: 7, left: 7, zIndex: 2 }}>
            <span
              style={{
                padding: "2px 7px",
                borderRadius: 100,
                fontSize: 9,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 3,
                ...S2,
                background: urgBadge(event.badge).bg,
                border: urgBadge(event.badge).border,
                color: urgBadge(event.badge).color,
              }}
            >
              {event.badge === "últimas" ? (
                <><Zap size={8} /> Últimas {event.available}</>
              ) : (
                <><TrendingUp size={8} /> Alta demanda</>
              )}
            </span>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div
        style={{
          flex: 1,
          padding: "10px 12px 10px 6px",
          marginLeft: -4,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minWidth: 0,
          zIndex: 1,
        }}
      >
        {/* Grupo [1]: nombre + venue + fechas — visualmente juntos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>

          {/* Fila: nombre + badge N fechas */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 6,
              minWidth: 0,
            }}
          >
            <h3
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: DARK,
                margin: 0,
                lineHeight: 1.25,
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {event.name}
            </h3>

            {multi && (
              <span
                style={{
                  background: OVERLAY_V_STRONG,
                  padding: "2px 7px",
                  borderRadius: 100,
                  fontSize: 9,
                  fontWeight: 700,
                  color: "white",
                  flexShrink: 0,
                  marginTop: 1,
                  ...S2,
                }}
              >
                {t("landing.cardDatesCount", { count: dates.length })}
              </span>
            )}
          </div>

          {/* Venue */}
          <p
            style={{
              color: MUTED,
              fontSize: 10,
              margin: 0,
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {event.venue}
          </p>

          {/* Fechas: todas, separadas por ·, hasta 2 líneas */}
          <p
            style={{
              color: MUTED,
              fontSize: 10,
              margin: 0,
              lineHeight: 1.4,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              ...S2,
            }}
            title={datesLabel}
          >
            {datesMobile}
          </p>
        </div>

        {/* Grupo [2]: precio — anclado al fondo */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            paddingTop: 6,
          }}
        >
          {event.price != null ? (
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 8,
                  color: MUTED,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                  marginBottom: 1,
                  ...S2,
                }}
              >
                {t("landing.cardPriceFrom")}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: V, lineHeight: 1, ...S2 }}>
                ${event.price}
                <span style={{ fontSize: 9, fontWeight: 500, color: MUTED, marginLeft: 2 }}>
                  {event.priceCurrency || "ARS"}
                </span>
              </div>
            </div>
          ) : (
            <span
              style={{
                fontSize: 10,
                color: MUTED,
                fontStyle: "italic",
                ...S2,
              }}
            >
              {t("landing.priceTBD", { defaultValue: "Precio a confirmar" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // ─── DESKTOP VERTICAL CARD ─────────────────────────────────────────────────
  // Idéntico al componente original — no se modifica ningún estilo ni lógica.
  //
  const desktopCard = (
    <div
      onMouseEnter={() => onHover(event.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        background: CARD,
        borderRadius: R_CARD,
        overflow: "hidden",
        border: `1px solid ${BORDER}`,
        boxShadow: hovered ? SHADOW_CARD_HOVER : SHADOW_CARD_SM,
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        cursor: "pointer",
      }}
    >
      <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", overflow: "hidden" }}>
        <img
          src={event.img}
          alt={event.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
            display: "block",
            transform: hovered ? "scale(1.05)" : "scale(1)",
            transition: "transform 0.38s ease",
          }}
        />
        <div style={{ position: "absolute", inset: 0, background: GRADIENT_CARD_TOP }} />

        {event.badge && (
          <div style={{ position: "absolute", top: 9, left: 9 }}>
            <span
              style={{
                ...urgBadge(event.badge),
                padding: "3px 9px",
                borderRadius: 100,
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 4,
                ...S2,
                background: urgBadge(event.badge).bg,
                border: urgBadge(event.badge).border,
                color: urgBadge(event.badge).color,
              }}
            >
              {event.badge === "últimas" ? (
                <><Zap size={9} /> Últimas {event.available}</>
              ) : (
                <><TrendingUp size={9} /> Alta demanda</>
              )}
            </span>
          </div>
        )}

        {multi && (
          <div
            style={{
              position: "absolute",
              top: 9,
              right: 9,
              background: OVERLAY_V_STRONG,
              backdropFilter: "blur(6px)",
              padding: "3px 9px",
              borderRadius: 100,
              fontSize: 11,
              fontWeight: 700,
              color: "white",
              ...S2,
            }}
          >
            {t("landing.cardDatesCount", { count: dates.length })}
          </div>
        )}

        {!event.badge && event.available != null && (
          <div
            style={{
              position: "absolute",
              bottom: 8,
              right: 9,
              background: OVERLAY_DARK_45,
              backdropFilter: "blur(6px)",
              padding: "3px 9px",
              borderRadius: 100,
              fontSize: 11,
              fontWeight: 600,
              color: "white",
              ...S2,
            }}
          >
            {t("landing.cardAvailable", { count: event.available })}
          </div>
        )}
      </div>

      <div style={{ padding: "12px 13px 13px" }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: DARK,
            marginBottom: 1,
            lineHeight: 1.25,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {event.name}
        </h3>
        <p
          style={{
            color: MUTED,
            fontSize: 12,
            marginBottom: 9,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {event.venue}
        </p>

        <div style={{ marginBottom: 11, display: "flex", alignItems: "center", gap: 6, minHeight: 20 }}>
          <Calendar size={13} style={{ color: MUTED, flexShrink: 0 }} strokeWidth={2} />
          <span
            style={{
              fontSize: 12,
              color: MUTED,
              lineHeight: 1.4,
              ...S2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={datesLabel}
          >
            {dates.length === 0 ? t("landing.dateTBD") : datesLabel}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: event.price != null ? "space-between" : "flex-end",
          }}
        >
          {event.price != null && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: MUTED,
                  fontWeight: 500,
                  marginBottom: 1,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {t("landing.cardPriceFrom")}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: V, lineHeight: 1, ...S2 }}>
                ${event.price}
                <span style={{ fontSize: 10, fontWeight: 500, color: MUTED, marginLeft: 3 }}>
                  {" "}{event.priceCurrency || "ARS"}
                </span>
              </div>
            </div>
          )}
          <span
            className="th-card-btn"
            style={{
              padding: "7px 12px",
              borderRadius: R_BUTTON,
              background: "white",
              border: `1.5px solid ${BORD2}`,
              color: DARK,
              fontSize: 12,
              fontWeight: 600,
              transition: "all 0.16s",
              ...S2,
            }}
          >
            {t("landing.cardView")} →
          </span>
        </div>
      </div>
    </div>
  );

  const cardContent = isMobile ? mobileCard : desktopCard;

  if (!event.slug) return cardContent;
  return (
    <Link
      to={`/event/${event.slug}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      {cardContent}
    </Link>
  );
}