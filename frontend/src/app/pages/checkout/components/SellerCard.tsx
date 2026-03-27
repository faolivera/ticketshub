import { Link } from "react-router-dom";
import { CheckCircle, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DARK, MUTED, CARD, BORDER,
  GREEN, GLIGHT, GBORD,
  AMBER, AMBER_BG_LIGHT,
  INFO, INFO_LIGHT, INFO_BORDER,
  SHADOW_CARD_SM,
  R_CARD, R_HERO, R_BUTTON,
} from "@/lib/design-tokens";
import { formatMonthYear } from "@/lib/format-date";
import { UserAvatar } from "@/app/components/UserAvatar";
import type { BuyPageData } from "@/api/types";

interface SellerCardProps {
  seller: NonNullable<BuyPageData["seller"]>;
  isVerifiedSeller: boolean;
  isNewSeller: boolean;
}

export function SellerCard({ seller, isVerifiedSeller, isNewSeller }: SellerCardProps) {
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
        <p style={lbl}>{t("buyTicket.seller")}</p>
        <Link
          to={`/seller/${seller.id}`}
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <UserAvatar
            name={seller.publicName}
            src={seller.pic?.src ?? undefined}
            className="h-[42px] w-[42px] shrink-0"
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
              <p style={{ fontSize: 14.5, fontWeight: 700, color: DARK }}>
                {seller.publicName}
              </p>
              {isVerifiedSeller ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    borderRadius: R_HERO,
                    background: GLIGHT,
                    color: GREEN,
                    border: `1px solid ${GBORD}`,
                    fontSize: 10.5,
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle size={9} /> {t("sellerCard.verified")}
                </span>
              ) : (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: R_HERO,
                    background: AMBER_BG_LIGHT,
                    color: AMBER,
                    fontSize: 10.5,
                    fontWeight: 600,
                  }}
                >
                  {t("sellerCard.new")}
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: MUTED }}>
              {t("buyTicket.sellerMemberSince", {
                date: formatMonthYear(seller.memberSince, true),
              })}
            </p>
            {seller.totalSales > 0 && (
              <p style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>
                {t("buyTicket.sellerTotalSales", { count: seller.totalSales })}
                {seller.totalReviews > 0 &&
                  ` · ${t("sellerCard.positiveReviews", { percent: Math.round(seller.percentPositiveReviews!) })}`}
              </p>
            )}
          </div>
        </Link>

        {isNewSeller && (
          <div
            style={{
              marginTop: 14,
              background: INFO_LIGHT,
              border: `1px solid ${INFO_BORDER}`,
              borderRadius: R_BUTTON,
              padding: "11px 13px",
              display: "flex",
              gap: 9,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: INFO_LIGHT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              <Shield size={14} color={INFO} />
            </div>
            <div style={{ fontSize: 12, color: INFO, lineHeight: 1.5 }}>
              <strong style={{ display: "block", marginBottom: 2 }}>
                {t("sellerCard.newSellerProtectedTitle")}
              </strong>
              {t("sellerCard.newSellerProtectedBody")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
