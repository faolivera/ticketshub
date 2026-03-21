import { useTranslation } from "react-i18next";
import { BORDER, DARK, V, HINT, GREEN, GLIGHT, GBORD } from "@/lib/design-tokens";
import { formatCurrencyFromUnits } from "@/lib/format-currency";
import { PriceLine } from "./PriceLine";
import type { Offer } from "@/api/types/offers";

interface CheckoutSummaryProps {
  selectedQuantity: number;
  subtotal: number;
  servicePrice: number;
  grandTotal: number;
  listingCurrency: string;
  summarySubLabel: string | null;
  acceptedOffer: Offer | null;
  hasDiscount: boolean;
  maxFeePercent: number;
  selectedFeePercent: number;
  feeDiscount: number;
  selectedPaymentMethodName: string | undefined;
  listingPricePerTicketUnits: number;
  pricePerTicket: number;
  totalSavings: number;
}

export function CheckoutSummary({
  selectedQuantity,
  subtotal,
  servicePrice,
  grandTotal,
  listingCurrency,
  summarySubLabel,
  acceptedOffer,
  hasDiscount,
  maxFeePercent,
  selectedFeePercent,
  feeDiscount,
  selectedPaymentMethodName,
  listingPricePerTicketUnits,
  pricePerTicket,
  totalSavings,
}: CheckoutSummaryProps) {
  const { t } = useTranslation();

  return (
    <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {selectedQuantity > 0 ? (
          <>
            <PriceLine
              label={acceptedOffer ? "Tu oferta" : t("myTicket.ticketPriceTotal")}
              sub={summarySubLabel}
              value={formatCurrencyFromUnits(subtotal, listingCurrency)}
            />
            <PriceLine
              label={t("myTicket.servicePrice")}
              sub={maxFeePercent ? `${maxFeePercent}%` : null}
              value={formatCurrencyFromUnits(servicePrice, listingCurrency)}
            />
            {hasDiscount && (
              <PriceLine
                label={`Descuento ${selectedPaymentMethodName ?? "método de pago"}`}
                sub={`(−${maxFeePercent - selectedFeePercent}%)`}
                value={`−${formatCurrencyFromUnits(feeDiscount, listingCurrency)}`}
                isDiscount
              />
            )}
          </>
        ) : (
          <>
            <PriceLine
              label={t("myTicket.ticketPriceTotal")}
              sub="—"
              value={formatCurrencyFromUnits(0, listingCurrency)}
            />
            <PriceLine
              label={t("myTicket.servicePrice")}
              sub={null}
              value={formatCurrencyFromUnits(0, listingCurrency)}
            />
          </>
        )}

        {/* Total row */}
        <div
          style={{
            borderTop: `1px solid ${BORDER}`,
            paddingTop: 12,
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: DARK }}>
            {t("buyTicket.total")}
          </span>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: V }}>
              {selectedQuantity > 0
                ? formatCurrencyFromUnits(grandTotal, listingCurrency)
                : formatCurrencyFromUnits(0, listingCurrency)}
            </span>
            {hasDiscount && selectedQuantity > 0 && (
              <div
                style={{
                  textDecoration: "line-through",
                  fontSize: 12,
                  color: HINT,
                  marginTop: 1,
                }}
              >
                {formatCurrencyFromUnits(subtotal + servicePrice, listingCurrency)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accepted offer: original price note */}
      {acceptedOffer && selectedQuantity > 0 && (
        <div
          style={{
            fontSize: 11,
            color: HINT,
            textAlign: "right",
            marginTop: 7,
            lineHeight: 1.5,
          }}
        >
          Precio original:{" "}
          {formatCurrencyFromUnits(listingPricePerTicketUnits * selectedQuantity, listingCurrency)}
          {" · "}Tu oferta:{" "}
          {formatCurrencyFromUnits(pricePerTicket * selectedQuantity, listingCurrency)}
          {totalSavings > 0 && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 10.5,
                fontWeight: 600,
                background: GLIGHT,
                color: GREEN,
                border: `1px solid ${GBORD}`,
                padding: "1px 7px",
                borderRadius: 20,
              }}
            >
              Ahorraste {formatCurrencyFromUnits(totalSavings, listingCurrency)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
