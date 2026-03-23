import { Clock } from "lucide-react";
import {
  SUCCESS, SUCCESS_LIGHT, SUCCESS_BORDER,
  AMBER, AMBER_TEXT_DARK, AMBER_BG_LIGHT, ABORD, ABG,
  ERROR_DARK, BADGE_DEMAND_BG, BADGE_DEMAND_BORDER,
  R_CARD, R_HERO,
} from "@/lib/design-tokens";
import type { Offer } from "@/api/types/offers";

function formatSeconds(secs: number): string {
  if (!isFinite(secs) || secs <= 0) return "00:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}h ${String(m).padStart(2, "0")}m`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface OfferBannerProps {
  acceptedOffer: Offer | null;
  isOfferFlow: boolean;
  secondsLeft: number; // from useOfferState — single source of truth for the countdown
  expiredOffer: Offer | null;
  expiredOfferReason: string | null;
  availableCount: number;
}

export function OfferBanner({
  acceptedOffer,
  isOfferFlow,
  secondsLeft,
  expiredOffer,
  expiredOfferReason,
  availableCount,
}: OfferBannerProps) {
  // Accepted offer banner
  if (acceptedOffer) {
    return (
      <div
        style={{
          margin: "18px 18px 0",
          padding: "12px 14px",
          background: SUCCESS_LIGHT,
          border: `1px solid ${SUCCESS_BORDER}`,
          borderRadius: R_CARD,
        }}
      >
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: SUCCESS_BORDER,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 1,
              fontSize: 10,
              color: SUCCESS,
            }}
          >
            ✓
          </div>
          <div style={{ fontSize: 12, color: SUCCESS, lineHeight: 1.5 }}>
            <strong style={{ display: "block", marginBottom: 3, fontSize: 13 }}>
              El vendedor aceptó tu oferta
            </strong>
            Confirmá el pago antes de que expire el tiempo.
            {acceptedOffer.acceptedExpiresAt && (
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 11.5, color: SUCCESS }}>
                  Tiempo para completar la compra
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: secondsLeft < 3600 ? ERROR_DARK : AMBER_TEXT_DARK,
                    background: secondsLeft < 3600 ? BADGE_DEMAND_BG : AMBER_BG_LIGHT,
                    border: `1px solid ${secondsLeft < 3600 ? BADGE_DEMAND_BORDER : ABORD}`,
                    padding: "3px 10px",
                    borderRadius: R_HERO,
                  }}
                >
                  <Clock size={11} />
                  {formatSeconds(secondsLeft)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Expired offer banner (listing still available)
  if (expiredOffer && !isOfferFlow && availableCount > 0) {
    const isBuyerNoPurchase = expiredOfferReason === "buyer_no_purchase";
    return (
      <div
        style={{
          margin: "18px 18px 0",
          padding: "12px 14px",
          background: isBuyerNoPurchase ? ABG : "#f1efe8",
          border: `1px solid ${isBuyerNoPurchase ? ABORD : "#d3d1c7"}`,
          borderRadius: R_CARD,
        }}
      >
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: isBuyerNoPurchase ? "#fde68a" : "#d3d1c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 1,
              fontSize: 10,
              color: isBuyerNoPurchase ? AMBER_TEXT_DARK : "#5f5e5a",
            }}
          >
            <Clock size={10} />
          </div>
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              color: isBuyerNoPurchase ? AMBER_TEXT_DARK : "#5c5c58",
            }}
          >
            <strong style={{ display: "block", marginBottom: 2 }}>
              {isBuyerNoPurchase ? "No confirmaste el pago a tiempo" : "Tu oferta expiró"}
            </strong>
            {isBuyerNoPurchase
              ? "Tu oferta fue aceptada pero el tiempo para pagar venció. La entrada todavía está disponible."
              : "El vendedor no respondió a tiempo. La entrada todavía está disponible."}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
