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
  BORDER,
  GREEN,
  ABORD,
  AMBER_BG_LIGHT,
  AMBER,
  BLUE_BORDER_LIGHT,
} from "@/lib/design-tokens";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBuyPill(qty) {
  if (qty <= 1) return null;
  if (qty === 2) return "Comprá 1 o 2";
  return `Comprá 1 a ${qty}`;
}

function fmtWithFee(priceNum) {
  if (!priceNum) return null;
  const total = Math.round(priceNum * 1.1);
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(total);
}

// ─── Seller meta — four reputation cases ─────────────────────────────────────

function SellerMeta({
  verified,
  newSeller,
  sellerTotalSales,
  sellerTotalReviews,
  hasSellerReviews,
  sellerPositivePercentRounded,
  t,
}) {
  const metaStyle = { fontSize: 12, color: HINT, lineHeight: 1.4 };

  const reputationLine = (() => {
    if (sellerTotalSales === 0 && sellerTotalReviews === 0)
      return <span style={metaStyle}>Vendedor nuevo</span>;
    if (sellerTotalSales > 0 && sellerTotalReviews === 0)
      return <span style={metaStyle}>{t("eventTickets.ticketsSold", { count: sellerTotalSales })}</span>;
    if (sellerTotalSales > 0 && hasSellerReviews)
      return (
        <span style={metaStyle}>
          {t("eventTickets.ticketsSold", { count: sellerTotalSales })}
          {" · "}
          {t("eventTickets.positiveReviews", { percent: sellerPositivePercentRounded, total: sellerTotalReviews })}
        </span>
      );
    return null;
  })();

  return (
    <div style={{ marginTop: 3, display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Verified badge — never removed, always first */}
      {verified ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11.5, fontWeight: 700, color: GREEN }}>
          <CheckCircle size={11} /> Verificado
        </span>
      ) : newSeller ? (
        <span style={{ fontSize: 11.5, color: HINT }}>Vendedor nuevo</span>
      ) : (
        <span style={{ fontSize: 11.5, color: HINT }}>No verificado</span>
      )}
      {reputationLine}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
// Add `display: flex; flex-direction: column;` to `.tk-card` in your global CSS
// so Zone 2 (seller) grows and Zone 3 (CTA) stays anchored to the bottom.

export function EventTicketCard({ ticket, eventSlug }) {
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

  const ctaLabel = seated ? t("eventTickets.selectSeats") || "Elegir asientos" : "Comprar";

  const hasSellerReviews =
    sellerPositivePercent !== null &&
    Number.isFinite(sellerPositivePercent) &&
    sellerTotalReviews > 0;

  const sellerPositivePercentRounded = hasSellerReviews ? Math.round(sellerPositivePercent) : null;
  const buyPillText = getBuyPill(qty);
  const totalWithFee = fmtWithFee(priceNum);

  return (
    <div className="tk-card">

      {/* ── Zone 1: left violet stripe + section / price / pills ── */}
      <div style={{ borderLeft: `4px solid ${V}`, padding: "16px 16px 14px" }}>

        {/* Section name + price */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: DARK, letterSpacing: "-.01em", lineHeight: 1.2 }}>
            {sector}
          </p>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 2 }}>
              Precio por entrada
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, color: V, lineHeight: 1, letterSpacing: "-.02em" }}>
              ${price}
            </p>
            {totalWithFee && (
              <p style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>
                Total con cargo:{" "}
                <strong style={{ color: DARK, fontWeight: 600 }}>${totalWithFee}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Pills — minHeight reserves space for 2 rows so all cards in a row align */}
        <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap", minHeight: 60 }}>
          <span style={{
            fontSize: 12, fontWeight: 600, padding: "4px 11px", borderRadius: 100,
            background: "#f3f3f0", color: MUTED, border: "1.5px solid #d1d5db", whiteSpace: "nowrap",
          }}>
            {qty} entrada{qty !== 1 ? "s" : ""}
          </span>

          {buyPillText && (
            <span style={{
              fontSize: 12, fontWeight: 600, padding: "4px 11px", borderRadius: 100,
              background: "#f0ebff", color: V, border: `1.5px solid ${V}`, whiteSpace: "nowrap",
            }}>
              {buyPillText}
            </span>
          )}

          {seated && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 11px", borderRadius: 100,
              background: BLIGHT, color: BLUE, border: `1px solid ${BLUE_BORDER_LIGHT}`,
              fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
            }}>
              Numerada
            </span>
          )}

          {urgency === "últimas" && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 11px", borderRadius: 100,
              background: AMBER_BG_LIGHT, color: AMBER, border: `1px solid ${ABORD}`,
              fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
            }}>
              <Zap size={10} /> Última{qty > 1 ? "s" : ""}
            </span>
          )}

          {acceptsOffers && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 11px", borderRadius: 100,
              background: AMBER_BG_LIGHT, color: AMBER, border: `1px solid ${ABORD}`,
              fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
            }}>
              <MessageCircle size={10} /> {t("eventTickets.acceptsOffers")}
            </span>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: BORDER }} />

      {/* ── Zone 2: seller — bare row, no background box ── */}
      {/* flex:1 absorbs remaining height so the CTA stays at the bottom */}
      <div style={{ padding: "14px 16px", flex: 1 }}>
        <Link
          to={`/seller/${sellerId}`}
          style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}
        >
          <UserAvatar name={seller} src={sellerAvatarUrl ?? undefined} className="size-10" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 14, fontWeight: 700, color: DARK,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {seller}
            </p>
            <SellerMeta
              verified={verified}
              newSeller={newSeller}
              sellerTotalSales={sellerTotalSales}
              sellerTotalReviews={sellerTotalReviews}
              hasSellerReviews={hasSellerReviews}
              sellerPositivePercentRounded={sellerPositivePercentRounded}
              t={t}
            />
          </div>
        </Link>
      </div>

      {/* ── Zone 3: CTA + trust bar ── */}
      <div style={{ padding: "0 16px 14px" }}>
        <Link
          to={`/buy/${eventSlug}/${listingId}`}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%",
            background: V,
            color: "#fff",
            borderRadius: 10,
            padding: "13px 16px",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
            letterSpacing: ".01em",
            boxShadow: "0 4px 18px rgba(109,40,217,0.32)",
          }}
        >
          {seated ? <MapPin size={14} /> : <ArrowRight size={14} />}
          {ctaLabel}
        </Link>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 9 }}>
          <span style={{ fontSize: 11, color: HINT }}>+ 10% cargo por servicio</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: GREEN, fontWeight: 600 }}>
            <Shield size={10} style={{ color: GREEN }} /> Protegido
          </span>
        </div>
      </div>

    </div>
  );
}