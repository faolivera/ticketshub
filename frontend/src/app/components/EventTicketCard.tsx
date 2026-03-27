import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, CheckCircle, MessageCircle, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { V, VLIGHT, DARK, MUTED, BG, S, SUCCESS, INFO, R_CARD, R_BUTTON } from "@/lib/design-tokens";
import { UserAvatar } from "@/app/components/UserAvatar";
import { getInitials } from "@/lib/string-utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBuyPill(qty: number, sellTogether: boolean, t: (key: string, opts?: Record<string, unknown>) => string): string | null {
  if (qty <= 1) return null;
  if (sellTogether) return t("eventTickets.soldAsBundle");
  if (qty === 2) return t("eventTickets.buyOneOrTwo");
  return t("eventTickets.buyOneToN", { n: qty });
}

function fmtWithFee(priceNum: number | undefined, commissionPercent: number): string | null {
  if (!priceNum) return null;
  const total = Math.round(priceNum * (1 + commissionPercent / 100));
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(total);
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

// ─── Shared style constants ────────────────────────────────────────────────────

const PILL: React.CSSProperties = {
  display: "inline-flex", alignItems: "center",
  padding: "2px 10px", borderRadius: 100,
  fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap",
};

// Mobile pills: mismos colores y lógica, padding más compacto
const PILL_SM: React.CSSProperties = {
  display: "inline-flex", alignItems: "center",
  padding: "2px 7px", borderRadius: 100,
  fontSize: 10, fontWeight: 600, whiteSpace: "nowrap",
};

// ─── Main component ───────────────────────────────────────────────────────────

export function EventTicketCard({ ticket, eventSlug }: { ticket: any; eventSlug: string }) {
  const { t } = useTranslation();
  const isMobile = useMobile();
  const {
    sector,
    seated,
    acceptsOffers,
    qty,
    price,
    priceNum,
    maxTotalCommissionPercent,
    seller,
    sellerId,
    sellerAvatarUrl,
    sellerTotalSales,
    sellerTotalReviews,
    sellerPositivePercent,
    verified,
    newSeller,
    urgency,
    listingId,
    sellTogether,
  } = ticket;

  const [hovered, setHovered] = useState(false);

  const ctaLabel = seated ? t("eventTickets.selectSeats") : t("eventTickets.buy");
  const hasReviews =
    sellerTotalReviews > 0 &&
    sellerPositivePercent !== null &&
    Number.isFinite(sellerPositivePercent);
  const sellerPositivePercentRounded = hasReviews ? Math.round(sellerPositivePercent) : null;
  const buyPillText = getBuyPill(qty, sellTogether, t);
  const totalWithFee = fmtWithFee(priceNum, maxTotalCommissionPercent ?? 10);

  // ─── MOBILE CARD ────────────────────────────────────────────────────────────
  //
  // Tres bandas separadas por border-bottom:
  //   [1] Sector + pills (qty, buyPill, urgency)
  //   [2] Precio (label + número + desglose) + botón CTA
  //   [3] Vendedor (avatar + nombre + verificado + reputación) + acepta ofertas
  //
  // Diferencias vs desktop:
  //   - Sin height: 100% — es lista, no grilla
  //   - Sin hovered state — no hay cursor en touch
  //   - Footer ("Compra protegida" / "Comisión incluida") eliminado:
  //       · "Compra protegida" vive en el header de la sección (opción 2)
  //       · "Comisión incluida" ya está expresado en el desglose de precio
  //   - "Acepta ofertas" se mueve al slot derecho de la banda del vendedor,
  //     fuera del Link del perfil del vendedor
  //
  const mobileCard = (
    <div
      style={{
        ...S,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: R_CARD,
        overflow: "hidden",
      }}
    >
      {/* ── Banda 1: sector + pills ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 12px",
          borderBottom: "1px solid #f0f0ee",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: MUTED,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            flexShrink: 0,
          }}
        >
          {sector}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span style={{ ...PILL_SM, background: BG, color: MUTED, border: "1px solid #d1d5db" }}>
            {t("eventTickets.ticketsCount", { count: qty })}
          </span>
          {buyPillText && (
            <span style={{ ...PILL_SM, background: sellTogether ? "#eff6ff" : VLIGHT, color: sellTogether ? INFO : V, border: `1px solid ${sellTogether ? "#bfdbfe" : "#c4b5fd"}` }}>
              {buyPillText}
            </span>
          )}
          {urgency === "últimas" && (
            <span style={{ ...PILL_SM, fontWeight: 700, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
              {t("eventTickets.lastTicket", { count: qty })}
            </span>
          )}
        </div>
      </div>

      {/* ── Banda 2: precio + botón CTA ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          borderBottom: "1px solid #f0f0ee",
          gap: 12,
        }}
      >
        {/* Bloque de precio */}
        <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: 8.5,
              fontWeight: 700,
              color: MUTED,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {t("eventTickets.totalToPay")}
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span
              style={{
                fontSize: 21,
                fontWeight: 800,
                color: DARK,
                letterSpacing: "-0.5px",
                lineHeight: 1,
              }}
            >
              ${totalWithFee}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: MUTED }}>ARS</span>
          </div>
          <span style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>
            {t("eventTickets.priceWithCommission", { price, commission: maxTotalCommissionPercent ?? 10 })}
          </span>
        </div>

        {/* Botón CTA */}
        <Link
          to={`/buy/${eventSlug}/${listingId}`}
          style={{ textDecoration: "none", flexShrink: 0 }}
        >
          <span
            style={{
              ...S,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "10px 14px",
              borderRadius: R_BUTTON,
              fontSize: 13,
              fontWeight: 700,
              background: V,
              color: "#ffffff",
              boxShadow: "0 4px 14px rgba(105,45,212,0.28)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {seated && <MapPin size={13} color="#ffffff" />}
            {ctaLabel} →
          </span>
        </Link>
      </div>

      {/* ── Banda 3: vendedor + acepta ofertas ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 12px",
          gap: 8,
        }}
      >
        {/* Seller: Link ocupa el espacio disponible */}
        <Link
          to={`/seller/${sellerId}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            flex: 1,
            minWidth: 0,
            textDecoration: "none",
          }}
        >
          <UserAvatar
            name={seller}
            src={sellerAvatarUrl ?? undefined}
            className="h-7 w-7 shrink-0"
          />
          <div style={{ minWidth: 0 }}>
            {/* Nombre + verificado */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden" }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: DARK,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                  margin: 0,
                }}
              >
                {seller}
              </p>
              {verified && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 2,
                    fontSize: 10,
                    fontWeight: 600,
                    color: SUCCESS,
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle size={9} /> {t("eventTickets.verified")}
                </span>
              )}
            </div>
            {/* Reputación — misma lógica condicional que desktop */}
            {sellerTotalSales === 0 && !hasReviews ? (
              <p style={{ fontSize: 10, color: MUTED, margin: 0 }}>{t("eventTickets.newSeller")}</p>
            ) : sellerTotalSales > 0 && !hasReviews ? (
              <p style={{ fontSize: 10, color: MUTED, margin: 0 }}>{t("eventTickets.sellerSales", { count: sellerTotalSales })}</p>
            ) : hasReviews ? (
              <p style={{ fontSize: 10, color: MUTED, margin: 0 }}>
                {t("eventTickets.sellerSalesAndReviews", { count: sellerTotalSales, percent: sellerPositivePercentRounded })}
              </p>
            ) : null}
          </div>
        </Link>

        {/* Acepta ofertas — fuera del Link, slot derecho */}
        {acceptsOffers && (
          <span
            style={{
              ...PILL_SM,
              gap: 4,
              background: "#e1f5ee",
              color: "#0F6E56",
              border: "1px solid #9FE1CB",
              flexShrink: 0,
            }}
          >
            <MessageCircle size={9} />
            {t("eventTickets.acceptsOffers")}
          </span>
        )}
      </div>
    </div>
  );

  // ─── DESKTOP CARD ──────────────────────────────────────────────────────────
  // Idéntico al componente original — no se modifica ningún estilo ni lógica.
  //
  const desktopCard = (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...S,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: R_CARD,
        padding: "20px 20px 16px",
        boxShadow: hovered
          ? "0 10px 28px rgba(105,45,212,0.12), 0 2px 6px rgba(0,0,0,0.06)"
          : "0 2px 8px rgba(0,0,0,0.08)",
        display: "flex", flexDirection: "column",
        height: "100%",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >

      {/* A) Top row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {sector}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span style={{ ...PILL, background: BG, color: MUTED, border: "1.5px solid #d1d5db" }}>
            {t("eventTickets.ticketsCount", { count: qty })}
          </span>
          {buyPillText && (
            <span style={{ ...PILL, background: sellTogether ? "#eff6ff" : VLIGHT, color: sellTogether ? INFO : V, border: `1.5px solid ${sellTogether ? "#bfdbfe" : "#c4b5fd"}` }}>
              {buyPillText}
            </span>
          )}
          {urgency === "últimas" && (
            <span style={{ ...PILL, fontSize: 11, fontWeight: 700, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
              {t("eventTickets.lastTicket", { count: qty })}
            </span>
          )}
        </div>
      </div>

      {/* B) Price block */}
      <div style={{ marginBottom: 4 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
          {t("eventTickets.totalToPay")}
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: DARK, letterSpacing: "-0.6px", lineHeight: 1 }}>
            ${totalWithFee}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>ARS</span>
        </div>
        <p style={{ fontSize: 11.5, color: MUTED, marginTop: 6 }}>
          {t("eventTickets.priceWithCommission", { price, commission: maxTotalCommissionPercent ?? 10 })}
        </p>
      </div>

      {/* C) Acepta ofertas — solo si aplica */}
      {acceptsOffers && (
        <span style={{ ...PILL, marginTop: 10, alignSelf: "flex-start", background: VLIGHT, color: V, border: "1.5px solid #c4b5fd", gap: 6 }}>
          <MessageCircle size={10} />
          {t("eventTickets.acceptsOffers")}
        </span>
      )}

      {/* D+E) Divider + seller — flex: 1 absorbs available space */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div style={{ borderTop: "1px solid #e5e7eb", margin: "14px 0" }} />

      {/* E) Seller row */}
      <Link
        to={`/seller/${sellerId}`}
        style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, textDecoration: "none" }}
      >
        <UserAvatar name={seller} src={sellerAvatarUrl ?? undefined} className="h-9 w-9 shrink-0" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: DARK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
              {seller}
            </p>
            {verified && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: SUCCESS, flexShrink: 0 }}>
                <CheckCircle size={10} /> {t("eventTickets.verified")}
              </span>
            )}
          </div>
          {/* Reputación: ventas · reseñas · o "Vendedor nuevo" si no hay historial */}
          {sellerTotalSales === 0 && !hasReviews ? (
            <p style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{t("eventTickets.newSeller")}</p>
          ) : sellerTotalSales > 0 && !hasReviews ? (
            <p style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{t("eventTickets.sellerSales", { count: sellerTotalSales })}</p>
          ) : hasReviews ? (
            <p style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>
              {t("eventTickets.sellerSalesAndReviews", { count: sellerTotalSales, percent: sellerPositivePercentRounded })}
            </p>
          ) : null}
        </div>
      </Link>
      </div>

      {/* F) CTA + footer anchored to bottom */}
      <div>
      <Link
        to={`/buy/${eventSlug}/${listingId}`}
        style={{ display: "block", textDecoration: "none", marginBottom: 12 }}
      >
        <span style={{
          ...S,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", padding: "13px 20px", borderRadius: R_BUTTON,
          fontSize: 14, fontWeight: 700,
          background: V, color: "#ffffff",
          boxShadow: "0 4px 18px rgba(105,45,212,0.28)",
          cursor: "pointer",
        }}>
          {seated && <MapPin size={14} color="#ffffff" />}
          {ctaLabel} →
        </span>
      </Link>

      {/* G) Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: MUTED }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Shield size={10} /> {t("eventTickets.protectedPurchase")}
        </span>
        <span>{t("eventTickets.commissionIncluded")}</span>
      </div>
      </div>
    </div>
  );

  return isMobile ? mobileCard : desktopCard;
}