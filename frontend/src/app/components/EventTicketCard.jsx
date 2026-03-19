import { Link } from "react-router-dom";
import { MapPin, Shield, CheckCircle, ArrowRight, Zap, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/app/components/UserAvatar";
import {
  V,
  BLUE,
  BLIGHT,
  DARK,
  MUTED,
  HINT,
  SURFACE,
  BORDER,
  GREEN,
  ABORD,
  AMBER_BG_LIGHT,
  AMBER,
  BLUE_BORDER_LIGHT,
} from "@/lib/design-tokens";

/**
 * Listing card for the legacy Event page (`Event.jsx`).
 * `ticket` is the mapped shape produced by `buildEventAndTickets` in that page.
 */
export function EventTicketCard({ ticket, eventSlug }) {
  const { t } = useTranslation();
  const {
    sector,
    seated,
    acceptsOffers,
    qty,
    price,
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
  const ctaLabel = seated ? (t("eventTickets.selectSeats") || "Elegir asientos") : "Comprar";
  const hasSellerReviews =
    sellerPositivePercent !== null && Number.isFinite(sellerPositivePercent) && sellerTotalReviews > 0;
  const sellerPositivePercentRounded = hasSellerReviews ? Math.round(sellerPositivePercent) : null;

  return (
    <div className="tk-card">
      <div style={{ padding: "15px 16px 0", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: DARK }}>{sector}</p>
            <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
              {qty} entrada{qty !== 1 ? "s" : ""} · comprá 1{qty > 1 ? " o más" : ""}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Desde</p>
            <p style={{ fontSize: 19, fontWeight: 800, color: V, lineHeight: 1 }}>${price}</p>
          </div>
        </div>
        <div style={{ minHeight: 24, marginBottom: 12, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {urgency === "últimas" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 100, background: AMBER_BG_LIGHT, color: AMBER, border: `1px solid ${ABORD}`, fontSize: 11, fontWeight: 700 }}>
              <Zap size={9} /> Última{qty > 1 ? "s" : ""} {qty}
            </span>
          )}
          {seated && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 100, background: BLIGHT, color: BLUE, border: `1px solid ${BLUE_BORDER_LIGHT}`, fontSize: 11, fontWeight: 600 }}>
              Numerada
            </span>
          )}
          {acceptsOffers && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 100, background: AMBER_BG_LIGHT, color: AMBER, border: `1px solid ${ABORD}`, fontSize: 11, fontWeight: 600 }}>
              <MessageCircle size={10} /> {t("eventTickets.acceptsOffers")}
            </span>
          )}
        </div>
        <Link to={`/seller/${sellerId}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", background: SURFACE, borderRadius: 9, border: `1px solid ${BORDER}`, marginBottom: 0, textDecoration: "none" }}>
          <UserAvatar name={seller} src={sellerAvatarUrl ?? undefined} className="size-10" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: DARK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{seller}</p>
            <div style={{ marginTop: 2 }}>
              {verified ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 600, color: GREEN }}>
                  <CheckCircle size={10} /> Verificado
                </span>
              ) : newSeller ? (
                <span style={{ fontSize: 10.5, color: HINT }}>Vendedor nuevo</span>
              ) : (
                <span style={{ fontSize: 10.5, color: HINT }}>No verificado</span>
              )}
            </div>
            <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 1 }}>
              {sellerTotalSales > 0 && (
                <span style={{ fontSize: 10.5, color: HINT, lineHeight: 1.3 }}>
                  {t("eventTickets.ticketsSold", { count: sellerTotalSales })}
                </span>
              )}
              {sellerTotalReviews > 0 && hasSellerReviews && (
                <span style={{ fontSize: 10.5, color: HINT, lineHeight: 1.3 }}>
                  {t("eventTickets.positiveReviews", {
                    percent: sellerPositivePercentRounded,
                    total: sellerTotalReviews,
                  })}
                </span>
              )}
              {sellerTotalSales === 0 && sellerTotalReviews === 0 && (
                <span style={{ fontSize: 10.5, color: HINT, lineHeight: 1.3 }}>Vendedor nuevo</span>
              )}
            </div>
          </div>
        </Link>
      </div>
      <div style={{ padding: "12px 16px 14px", marginTop: 12 }}>
        <Link to={`/buy/${eventSlug}/${listingId}`} className={`btn-buy${seated ? " seated" : ""}`}>
          {seated ? <MapPin size={14} /> : <ArrowRight size={14} />}
          {ctaLabel}
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <span style={{ fontSize: 11, color: HINT }}>+ 10% cargo por servicio</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: GREEN, fontWeight: 600 }}>
            <Shield size={10} style={{ color: GREEN }} /> Protegido
          </span>
        </div>
      </div>
    </div>
  );
}
