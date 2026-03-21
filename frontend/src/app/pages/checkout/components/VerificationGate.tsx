import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AMBER, AMBER_TEXT_DARK, AMBER_BG_LIGHT, ABG, ABORD, S } from "@/lib/design-tokens";

interface VerificationGateProps {
  isAuthenticated: boolean;
  missingV1: boolean | undefined;
  missingV2: boolean | undefined;
  missingV3: boolean | undefined;
  eventSlug: string | undefined;
  listingId: string | undefined;
}

export function VerificationGate({
  isAuthenticated,
  missingV1,
  missingV2,
  missingV3,
  eventSlug,
  listingId,
}: VerificationGateProps) {
  const { t } = useTranslation();

  if (!isAuthenticated || (!missingV2 && !missingV3)) return null;

  return (
    <div
      style={{
        background: ABG,
        border: `1.5px solid ${ABORD}`,
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: AMBER_BG_LIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <AlertCircle size={18} style={{ color: AMBER }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: AMBER, marginBottom: 4 }}>
            {t("buyTicket.verificationRequiredTitle")}
          </p>
          <p
            style={{
              fontSize: 13,
              color: AMBER_TEXT_DARK,
              lineHeight: 1.55,
              marginBottom: 14,
            }}
          >
            {t("buyTicket.verificationRequiredIntro")}{" "}
            {[
              missingV1 && t("buyTicket.missingEmail"),
              missingV2 && t("buyTicket.missingPhone"),
              missingV3 && t("buyTicket.missingIdentity"),
            ]
              .filter(Boolean)
              .join(", ")}
            .
          </p>
          <Link
            to="/verify-user"
            state={{
              verifyPhone: missingV2,
              verifyIdentity: missingV3,
              returnTo: `/buy/${eventSlug}/${listingId}`,
            }}
            style={{
              display: "inline-block",
              padding: "10px 20px",
              borderRadius: 12,
              background: AMBER,
              color: "white",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              ...S,
            }}
          >
            {t("buyTicket.completeVerification")}
          </Link>
        </div>
      </div>
    </div>
  );
}
