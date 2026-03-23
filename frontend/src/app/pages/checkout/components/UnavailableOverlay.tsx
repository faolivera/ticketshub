import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { ERROR, BADGE_DEMAND_BG, MUTED, DARK, V, VL_BORDER, S, R_CARD } from "@/lib/design-tokens";

interface UnavailableOverlayProps {
  isUnavailable: boolean;
  isExpiredOfferSoldOut: boolean;
  expiredOfferReason: string | null;
  eventSlug: string | undefined;
  eventName: string;
}

export function UnavailableOverlay({
  isUnavailable,
  isExpiredOfferSoldOut,
  expiredOfferReason,
  eventSlug,
  eventName,
}: UnavailableOverlayProps) {
  if (!isUnavailable && !isExpiredOfferSoldOut) return null;

  const subtitle = isUnavailable
    ? "Otro comprador se adelantó justo antes de que confirmaras."
    : expiredOfferReason === "buyer_no_purchase"
      ? "No confirmaste el pago a tiempo y la entrada fue vendida mientras tanto."
      : "El vendedor no respondió a tiempo y la entrada fue vendida mientras tanto.";

  return (
    <div style={{ padding: "28px 22px", textAlign: "center" }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: BADGE_DEMAND_BG,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 12px",
        }}
      >
        <X size={20} style={{ color: ERROR }} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color: DARK, marginBottom: 8 }}>
        Esta entrada ya no está disponible
      </p>
      <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, marginBottom: 22 }}>
        {subtitle} Buscá otras opciones para este evento.
      </p>
      <Link
        to={`/event/${eventSlug}`}
        style={{
          display: "block",
          padding: "12px 16px",
          borderRadius: R_CARD,
          border: `1.5px solid ${VL_BORDER}`,
          color: V,
          fontSize: 13.5,
          fontWeight: 700,
          textDecoration: "none",
          textAlign: "center",
          ...S,
        }}
      >
        Ver otras entradas para {eventName}
      </Link>
    </div>
  );
}
