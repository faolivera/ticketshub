import { useTranslation } from "react-i18next";
import {
  V, DARK, MUTED, CARD, BORDER, BORD2,
  GREEN, GLIGHT, GBORD,
  SHADOW_CARD_SM,
  R_CARD, R_HERO,
} from "@/lib/design-tokens";
import { formatCurrencyFromUnits } from "@/lib/format-currency";
import type { BuyPagePaymentMethodOption } from "@/api/types";

interface PaymentMethodsCardProps {
  paymentMethods: BuyPagePaymentMethodOption[];
  selectedPaymentMethod: BuyPagePaymentMethodOption | null;
  maxFeePercent: number;
  subtotal: number;
  qty: number;
  listingCurrency: string;
  onSelect: (method: BuyPagePaymentMethodOption) => void;
}

export function PaymentMethodsCard({
  paymentMethods,
  selectedPaymentMethod,
  maxFeePercent,
  subtotal,
  qty,
  listingCurrency,
  onSelect,
}: PaymentMethodsCardProps) {
  const { t } = useTranslation();

  const lbl: React.CSSProperties = {
    fontSize: 10.5,
    fontWeight: 700,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 10,
  };

  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: R_CARD,
        overflow: "hidden",
        boxShadow: SHADOW_CARD_SM,
      }}
    >
      <div style={{ padding: "18px 20px" }}>
        <p style={lbl}>{t("buyTicket.paymentMethod")}</p>
        {paymentMethods.length === 1 ? (
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: DARK }}>
              {paymentMethods[0].name}
            </p>
            <p style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
              Único método disponible
            </p>
          </div>
        ) : (
          paymentMethods.map((method) => {
            const isSelected = selectedPaymentMethod?.id === method.id;
            const isAvailable = method.available !== false;
            const isCheaper = method.serviceFeePercent < maxFeePercent;
            const savings =
              qty > 0
                ? subtotal * ((maxFeePercent - method.serviceFeePercent) / 100)
                : 0;
            return (
              <button
                key={method.id}
                type="button"
                className={`pay-option${isSelected ? " selected" : ""}`}
                disabled={!isAvailable}
                onClick={() => isAvailable && onSelect(method)}
                style={{
                  opacity: isAvailable ? 1 : 0.4,
                  cursor: isAvailable ? "pointer" : "not-allowed",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: `2px solid ${isSelected ? V : BORD2}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {isSelected && (
                    <div
                      style={{ width: 7, height: 7, borderRadius: "50%", background: V }}
                    />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: DARK }}>
                      {method.name}
                    </span>
                    {!isAvailable && (
                      <span style={{ fontSize: 11, color: MUTED }}>No disponible</span>
                    )}
                    {isAvailable && isCheaper && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: GREEN }}>
                          -{maxFeePercent - method.serviceFeePercent}%
                        </span>
                        {savings > 0 && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 600,
                              background: GLIGHT,
                              color: GREEN,
                              border: `1px solid ${GBORD}`,
                              padding: "2px 8px",
                              borderRadius: R_HERO,
                            }}
                          >
                            Ahorrás {formatCurrencyFromUnits(savings, listingCurrency)}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
