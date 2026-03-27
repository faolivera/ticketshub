import { Lock, CheckCircle, MessageCircle } from "lucide-react";
import {
  DARK, MUTED, BORDER,
  TRUST_ESCROW, TRUST_ESCROW_BG,
  TRUST_VERIFIED, TRUST_VERIFIED_BG,
  TRUST_SUPPORT, TRUST_SUPPORT_BG,
} from "@/lib/design-tokens";

const ITEMS = [
  {
    icon: <Lock size={10} />,
    iconColor: TRUST_ESCROW,
    iconBg: TRUST_ESCROW_BG,
    title: "Fondos protegidos",
    desc: "Tu dinero no va al vendedor hasta que recibís tu entrada. Si no la recibís, te devolvemos el 100%.",
  },
  {
    icon: <CheckCircle size={10} />,
    iconColor: TRUST_VERIFIED,
    iconBg: TRUST_VERIFIED_BG,
    title: "Vendedores verificados",
    desc: "Cada vendedor confirmó su identidad en la plataforma. No hay cuentas anónimas.",
  },
  {
    icon: <MessageCircle size={10} />,
    iconColor: TRUST_SUPPORT,
    iconBg: TRUST_SUPPORT_BG,
    title: "Soporte por WhatsApp y app",
    desc: "Si algo no está bien, escribinos por WhatsApp o desde la app. Respondemos a la brevedad.",
  },
];

export function TrustSignals() {
  return (
    <div style={{ padding: "12px 22px 18px", borderTop: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ITEMS.map(({ icon, iconColor, iconBg, title, desc }) => (
          <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div
              style={{
                width: 18,
                height: 18,
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
            <div>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: DARK, lineHeight: 1.3 }}>{title}</p>
              <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.45, marginTop: 2 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
