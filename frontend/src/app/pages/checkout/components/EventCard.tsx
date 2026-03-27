import { FC } from "react";
import { Check, Minus, Plus, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BuyPageData, TicketUnit } from "@/api/types";
import {
  V, VLIGHT, DARK, MUTED, HINT, CARD, BORDER, BORD2, GREEN, GLIGHT, INFO, INFO_LIGHT, INFO_BORDER, S, E, R_CARD, R_BUTTON,
} from "@/lib/design-tokens";

interface EventCardProps {
  listing: BuyPageData["listing"];
  sectorName: string;
  eventDateFormatted: string;
  isNumberedListing: boolean;
  sortedNumberedUnits: TicketUnit[];
  selectedUnitIds: string[];
  availableCount: number;
  hasAcceptedOffer: boolean;
  quantity: number;
  onToggleSeat: (unitId: string) => void;
  onClearSeats: () => void;
  onQuantityDecrease: () => void;
  onQuantityIncrease: () => void;
}

export const EventCard: FC<EventCardProps> = ({
  listing,
  sectorName,
  eventDateFormatted,
  isNumberedListing,
  sortedNumberedUnits,
  selectedUnitIds,
  availableCount,
  hasAcceptedOffer,
  quantity,
  onToggleSeat,
  onClearSeats,
  onQuantityDecrease,
  onQuantityIncrease,
}) => {
  const { t } = useTranslation();

  const card: React.CSSProperties = {
    background: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: R_CARD,
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  };
  const lbl: React.CSSProperties = {
    fontSize: 10.5,
    fontWeight: 700,
    color: MUTED,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: 10,
  };
  const hr: React.CSSProperties = {
    border: "none",
    borderTop: `1px solid ${BORDER}`,
    margin: "14px 0",
  };

  return (
    <div style={card}>
      {/* Hero banner section */}
      <div style={{ position: "relative", height: 160, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            backgroundImage: `url(${
              listing.bannerUrls?.rectangle || listing.bannerUrls?.square
            })`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(12px) brightness(0.6) saturate(1.2)",
            transform: "scale(1.1)",
            backgroundColor: "#262626",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background:
              "linear-gradient(to right, rgba(38,38,38,0.65) 0%, rgba(38,38,38,0.38) 45%, rgba(38,38,38,0.05) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 2,
            height: "100%",
            display: "flex",
            alignItems: "flex-end",
            gap: 14,
            padding: "0 20px 18px",
          }}
        >
          <div
            style={{
              height: "calc(100% - 28px)",
              aspectRatio: "1 / 1",
              borderRadius: R_BUTTON,
              background: V,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {listing.bannerUrls?.square ? (
              <img
                src={listing.bannerUrls.square}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              "🎫"
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ ...E, fontSize: 22, fontWeight: 400, color: "#fff", letterSpacing: "-0.3px", lineHeight: 1.2, marginBottom: 4 }}>
              {listing.eventName}
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>
              {listing.venue}
            </p>
            <p style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.65)" }}>
              {eventDateFormatted}
            </p>
          </div>
        </div>
      </div>

      {/* Body section */}
      <div style={{ padding: "18px 20px" }}>
        <div style={{ marginBottom: 14 }}>
          <p style={lbl}>Sector</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: DARK }}>
            {sectorName}
          </p>
        </div>
        <hr style={hr} />

        {isNumberedListing ? (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <p style={lbl}>{t("buyTicket.selectSeats")}</p>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: selectedUnitIds.length > 0 ? V : MUTED,
                }}
              >
                {selectedUnitIds.length} / {availableCount}
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {sortedNumberedUnits.map((unit) => {
                const sel = selectedUnitIds.includes(unit.id);
                const seatLabel = unit.seat
                  ? `${unit.seat.row}-${unit.seat.seatNumber}`
                  : unit.id;
                const disabled = hasAcceptedOffer || listing.sellTogether;
                return (
                  <button
                    key={unit.id}
                    type="button"
                    className={`seat-btn${sel ? " selected" : ""}`}
                    onClick={() => !disabled && onToggleSeat(unit.id)}
                    disabled={disabled}
                  >
                    {sel && (
                      <Check
                        size={10}
                        style={{
                          display: "inline",
                          marginRight: 4,
                          verticalAlign: "middle",
                        }}
                      />
                    )}
                    {seatLabel}
                  </button>
                );
              })}
            </div>
            {listing.sellTogether && (
              <p style={{ fontSize: 11.5, color: INFO, fontWeight: 600, marginTop: 8 }}>
                {t("eventTickets.soldAsBundle")}
              </p>
            )}
            {selectedUnitIds.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <p style={{ fontSize: 12, color: MUTED }}>
                  <strong style={{ color: DARK, fontWeight: 600 }}>
                    {selectedUnitIds.length} asiento
                    {selectedUnitIds.length > 1 ? "s" : ""} seleccionado
                    {selectedUnitIds.length > 1 ? "s" : ""}
                  </strong>
                </p>
                {!hasAcceptedOffer && !listing.sellTogether && (
                  <button
                    type="button"
                    onClick={onClearSeats}
                    style={{
                      fontSize: 11.5,
                      color: V,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                      padding: 0,
                      ...S,
                    }}
                  >
                    Limpiar
                  </button>
                )}
              </div>
            )}
            {!hasAcceptedOffer && !listing.sellTogether && (
              <p style={{ fontSize: 11.5, color: HINT, marginTop: 6, lineHeight: 1.4 }}>
                Podés elegir cualquier combinación. El precio se actualiza al
                seleccionar.
              </p>
            )}
          </div>
        ) : (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <p style={lbl}>{t("buyTicket.quantity")}</p>
                <p style={{ fontSize: 11.5, color: HINT }}>
                  {availableCount} {t("buyTicket.available")}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <button
                  type="button"
                  className="qty-btn"
                  disabled={
                    quantity <= 1 || hasAcceptedOffer || listing.sellTogether
                  }
                  onClick={onQuantityDecrease}
                >
                  <Minus size={13} />
                </button>
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: DARK,
                    minWidth: 36,
                    textAlign: "center",
                  }}
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  className="qty-btn"
                  disabled={
                    quantity >= availableCount ||
                    hasAcceptedOffer ||
                    listing.sellTogether
                  }
                  onClick={onQuantityIncrease}
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
            {listing.sellTogether && (
              <p style={{ fontSize: 11.5, color: INFO, fontWeight: 600, marginTop: 8 }}>
                {t("eventTickets.soldAsBundle")}
              </p>
            )}
          </div>
        )}

        <hr style={hr} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 12.5,
            color: MUTED,
            lineHeight: 1.4,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: R_BUTTON,
              background: GLIGHT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Mail size={13} style={{ color: GREEN }} />
          </div>
          <span>
            {listing.type === "Physical" ? (
              <>
                <strong style={{ color: DARK, fontWeight: 600 }}>
                  Acordás con el vendedor
                </strong>
                {" "}la entrega de la entrada
              </>
            ) : (
              <>
                <strong style={{ color: DARK, fontWeight: 600 }}>
                  Recibís la entrada en tu app o por email
                </strong>
                {" "}una vez confirmado el pago
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
