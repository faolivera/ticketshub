import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, CheckCircle, MessageCircle, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { V, VLIGHT, DARK, MUTED, BG, S, SUCCESS } from "@/lib/design-tokens";
import { UserAvatar } from "@/app/components/UserAvatar";
import { getInitials } from "@/lib/string-utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBuyPill(qty: number): string | null {
  if (qty <= 1) return null;
  if (qty === 2) return "Comprá 1 o 2";
  return `Comprá 1 a ${qty}`;
}

function fmtWithFee(priceNum: number | undefined): string | null {
  if (!priceNum) return null;
  const total = Math.round(priceNum * 1.1);
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(total);
}

// ─── Shared style constants ────────────────────────────────────────────────────

const PILL: React.CSSProperties = {
  display: "inline-flex", alignItems: "center",
  padding: "2px 10px", borderRadius: 100,
  fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap",
};

// ─── Main component ───────────────────────────────────────────────────────────

export function EventTicketCard({ ticket, eventSlug }: { ticket: any; eventSlug: string }) {
  const { t } = useTranslation();
  const {
    sector,
    seated,
    acceptsOffers,
    qty,
    price,
    priceNum,
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
  } = ticket;

  const [hovered, setHovered] = useState(false);

  const ctaLabel = seated ? (t("eventTickets.selectSeats") || "Elegir asientos") : "Comprar";
  const hasReviews =
    sellerTotalReviews > 0 &&
    sellerPositivePercent !== null &&
    Number.isFinite(sellerPositivePercent);
  const sellerPositivePercentRounded = hasReviews ? Math.round(sellerPositivePercent) : null;
  const buyPillText = getBuyPill(qty);
  const totalWithFee = fmtWithFee(priceNum);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...S,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: "20px 20px 16px",
        boxShadow: hovered
          ? "0 10px 28px rgba(109,40,217,0.12), 0 2px 6px rgba(0,0,0,0.06)"
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
            {qty} entrada{qty !== 1 ? "s" : ""}
          </span>
          {buyPillText && (
            <span style={{ ...PILL, background: VLIGHT, color: V, border: "1.5px solid #c4b5fd" }}>
              {buyPillText}
            </span>
          )}
          {urgency === "últimas" && (
            <span style={{ ...PILL, fontSize: 11, fontWeight: 700, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
              Última{qty > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* B) Price block */}
      <div style={{ marginBottom: 4 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
          Total a pagar
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: DARK, letterSpacing: "-0.6px", lineHeight: 1 }}>
            ${totalWithFee}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>ARS</span>
        </div>
        <p style={{ fontSize: 11.5, color: MUTED, marginTop: 6 }}>
          Precio base ${price} · +10% comisión incluida
        </p>
      </div>

      {/* C) Acepta ofertas — solo si aplica */}
      {acceptsOffers && (
        <span style={{ ...PILL, marginTop: 10, alignSelf: "flex-start", background: VLIGHT, color: V, border: "1.5px solid #c4b5fd", gap: 6 }}>
          <MessageCircle size={10} />
          {t("eventTickets.acceptsOffers") || "Acepta ofertas"}
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
                <CheckCircle size={10} /> Verificado
              </span>
            )}
          </div>
          {/* Reputación: ventas · reseñas · o "Vendedor nuevo" si no hay historial */}
          {sellerTotalSales === 0 && !hasReviews ? (
            <p style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>Vendedor nuevo</p>
          ) : sellerTotalSales > 0 && !hasReviews ? (
            <p style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{sellerTotalSales} ventas</p>
          ) : hasReviews ? (
            <p style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>
              {sellerTotalSales} ventas · {sellerPositivePercentRounded}% positivas
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
          width: "100%", padding: "13px 20px", borderRadius: 10,
          fontSize: 14, fontWeight: 700,
          background: V, color: "#ffffff",
          boxShadow: "0 4px 18px rgba(109,40,217,0.28)",
          cursor: "pointer",
        }}>
          {seated && <MapPin size={14} color="#ffffff" />}
          {ctaLabel} →
        </span>
      </Link>

      {/* G) Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: MUTED }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Shield size={10} /> Compra protegida
        </span>
        <span>Comisión incluida</span>
      </div>
      </div>
    </div>
  );
}
