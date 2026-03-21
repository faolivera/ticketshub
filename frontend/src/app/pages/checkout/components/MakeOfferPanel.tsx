import { useNavigate } from "react-router-dom";
import { RotateCcw, Loader2 } from "lucide-react";
import {
  V, DARK, MUTED, HINT, BORDER,
  AMBER_BG_LIGHT, AMBER_TEXT_DARK,
  WARN_SOLID, S, BADGE_DEMAND_BORDER, ERROR_DARK,
} from "@/lib/design-tokens";
import { formatCurrencyFromUnits } from "@/lib/format-currency";
import { ErrorAlert } from "@/app/components/ErrorMessage";
import { BuyButton } from "./BuyButton";
import { Countdown } from "./Countdown";
import type { Offer } from "@/api/types/offers";

interface MakeOfferPanelProps {
  purchaseError: string | null;
  pendingOffer: Offer | null;
  canBuy: boolean;
  isPurchasing: boolean;
  onPurchase: () => void;
  formattedTotal: string | null;
  primaryBtnLabel: string;
  primaryBtnVariant: "primary" | "warn" | "disabled";
  primaryBtnDisabled: boolean;
  canMakeOffer: boolean;
  isAuthenticated: boolean;
  eventSlug: string | undefined;
  listingId: string | undefined;
  offerOpen: boolean;
  onOfferOpenToggle: () => void;
  offerError: string | null;
  setOfferError: (err: string | null) => void;
  expiredOffer: Offer | null;
  offerPriceCents: number;
  setOfferPriceCents: (price: number) => void;
  isSubmittingOffer: boolean;
  onSubmitOffer: () => void;
  onCancelOffer: () => void;
  listingCurrency: string;
}

export function MakeOfferPanel({
  purchaseError,
  pendingOffer,
  canBuy,
  isPurchasing,
  onPurchase,
  formattedTotal,
  primaryBtnLabel,
  primaryBtnVariant,
  primaryBtnDisabled,
  canMakeOffer,
  isAuthenticated,
  eventSlug,
  listingId,
  offerOpen,
  onOfferOpenToggle,
  offerError,
  setOfferError,
  expiredOffer,
  offerPriceCents,
  setOfferPriceCents,
  isSubmittingOffer,
  onSubmitOffer,
  onCancelOffer,
  listingCurrency,
}: MakeOfferPanelProps) {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "14px 22px" }}>
      {purchaseError && <ErrorAlert message={purchaseError} className="mb-3" />}

      {pendingOffer ? (
        /* ── PENDING OFFER BOX (replaces CTAs) ── */
        <div className="pending-box">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontSize: 13,
                fontWeight: 600,
                color: DARK,
              }}
            >
              <span
                className="pulse-dot"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: WARN_SOLID,
                  display: "inline-block",
                }}
              />
              Oferta enviada
            </div>
            {pendingOffer.expiresAt && (
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  background: AMBER_BG_LIGHT,
                  color: AMBER_TEXT_DARK,
                  padding: "3px 9px",
                  borderRadius: 20,
                }}
              >
                Expira en <Countdown targetDate={pendingOffer.expiresAt} />
              </span>
            )}
          </div>
          <p style={{ fontSize: 19, fontWeight: 800, color: V, marginBottom: 2 }}>
            {formatCurrencyFromUnits(
              (pendingOffer.offeredPrice?.amount ?? 0) / 100,
              listingCurrency
            )}
          </p>
          <p style={{ fontSize: 12, color: HINT }}>
            El vendedor tiene hasta que expire el tiempo para responder.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" className="ghost-btn" onClick={onCancelOffer}>
              Cancelar oferta
            </button>
            <button
              type="button"
              className="solid-sm-btn"
              disabled={!canBuy || isPurchasing}
              onClick={onPurchase}
            >
              {isPurchasing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                `Comprar directo${formattedTotal ? ` · ${formattedTotal}` : ""}`
              )}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Primary buy / confirm CTA */}
          <BuyButton
            label={primaryBtnLabel}
            variant={primaryBtnVariant}
            onClick={primaryBtnDisabled ? undefined : onPurchase}
            total={formattedTotal}
            disabled={primaryBtnDisabled}
            isLoading={isPurchasing}
          />

          {/* Offer secondary CTA + panel */}
          {canMakeOffer && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  margin: "2px 0",
                }}
              >
                <hr style={{ flex: 1, border: "none", borderTop: `1px solid ${BORDER}` }} />
                <span style={{ fontSize: 12, color: MUTED }}>o</span>
                <hr style={{ flex: 1, border: "none", borderTop: `1px solid ${BORDER}` }} />
              </div>
              <button
                type="button"
                className="cta-offer-btn"
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate("/login", {
                      state: { from: `/buy/${eventSlug}/${listingId}` },
                    });
                    return;
                  }
                  onOfferOpenToggle();
                  setOfferError(null);
                }}
              >
                <RotateCcw size={13} />
                {offerOpen
                  ? "Cancelar oferta"
                  : expiredOffer
                    ? "Hacer una nueva oferta"
                    : "Hacer una oferta"}
              </button>

              {!offerOpen && (
                <p
                  style={{
                    fontSize: 11.5,
                    color: HINT,
                    textAlign: "center",
                    marginTop: 6,
                  }}
                >
                  Si el vendedor acepta, vos decidís si pagar.
                </p>
              )}

              {offerOpen && (
                <div className="offer-panel">
                  <p style={{ fontSize: 13, fontWeight: 600, color: V, marginBottom: 4 }}>
                    Proponer un precio al vendedor
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: MUTED,
                      marginBottom: 10,
                      lineHeight: 1.5,
                    }}
                  >
                    Si el vendedor acepta, te avisamos y{" "}
                    <strong style={{ color: DARK }}>vos decidís si confirmar el pago</strong>
                    . No se te cobra nada hasta entonces.
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="number"
                      className={`offer-input${offerError ? " error" : ""}`}
                      placeholder="Tu oferta en ARS..."
                      value={offerPriceCents ? Math.floor(offerPriceCents / 100) : ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setOfferPriceCents(Math.max(0, Number(e.target.value) * 100));
                        setOfferError(null);
                      }}
                    />
                    <button
                      type="button"
                      disabled={isSubmittingOffer || !offerPriceCents}
                      onClick={onSubmitOffer}
                      style={{
                        padding: "9px 16px",
                        background: V,
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor:
                          isSubmittingOffer || !offerPriceCents ? "not-allowed" : "pointer",
                        opacity: isSubmittingOffer || !offerPriceCents ? 0.55 : 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        ...S,
                        flexShrink: 0,
                      }}
                    >
                      {isSubmittingOffer ? <Loader2 size={13} className="animate-spin" /> : null}
                      Enviar
                    </button>
                  </div>

                  {offerError && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "8px 10px",
                        background: "#fef2f2",
                        border: `1px solid ${BADGE_DEMAND_BORDER}`,
                        borderRadius: 8,
                        display: "flex",
                        gap: 7,
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          width: 15,
                          height: 15,
                          borderRadius: "50%",
                          background: "#fca5a5",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 8,
                          color: "#7f1d1d",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        ✕
                      </div>
                      <div style={{ fontSize: 12, color: ERROR_DARK, lineHeight: 1.4 }}>
                        {offerError}
                        <button
                          type="button"
                          onClick={() => {
                            setOfferError(null);
                            setOfferPriceCents(0);
                          }}
                          style={{
                            display: "block",
                            marginTop: 4,
                            fontSize: 11.5,
                            color: V,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            fontWeight: 600,
                            textDecoration: "underline",
                            ...S,
                          }}
                        >
                          Intentar con otro monto
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
