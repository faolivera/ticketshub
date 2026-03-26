import { Lock, Shield, CreditCard } from "lucide-react";
import { V, VLIGHT, GREEN, GLIGHT, AMBER, AMBER_BG_LIGHT, MUTED, BORDER } from "@/lib/design-tokens";

export function TrustSignals() {
  return (
    <div style={{ padding: "12px 22px 18px", borderTop: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          {
            icon: <Lock size={10} />,
            iconColor: GREEN,
            iconBg: GLIGHT,
            text: "Tu pago queda protegido hasta que entras al evento",
          },
          {
            icon: <Shield size={10} />,
            iconColor: V,
            iconBg: VLIGHT,
            text: "Reembolso garantizado si las entradas no son válidas",
          },
          {
            icon: <CreditCard size={10} />,
            iconColor: AMBER,
            iconBg: AMBER_BG_LIGHT,
            text: "Pago encriptado y seguro",
          },
        ].map(({ icon, iconColor, iconBg, text }) => (
          <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: iconBg,
                color: iconColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {icon}
            </div>
            <p style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.45 }}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
