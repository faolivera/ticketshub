import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { HubSVG, ShieldSVG } from "./SiteBrandIcons";
import { V, DARK, BORDER, S, E } from "@/lib/design-tokens";

/** Global site footer (non-admin routes). */
export function AppFooter() {
  return (
    <footer style={{ background: DARK, color: "rgba(255,255,255,0.5)", padding: "40px 24px 26px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
            gap: 26,
            marginBottom: 32,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: V,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <HubSVG size={12} />
              </div>
              <span style={{ ...E, fontSize: 16, color: "white" }}>TicketsHub</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 180 }}>
              El marketplace de reventa de entradas más confiable de Argentina.
            </p>
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 600, fontSize: 12.5, marginBottom: 11 }}>Plataforma</div>
            <Link
              to="/"
              style={{ display: "block", fontSize: 13, marginBottom: 7, color: "rgba(255,255,255,0.7)", textDecoration: "none" }}
            >
              Explorar eventos
            </Link>
            <Link
              to="/sell-ticket"
              style={{ display: "block", fontSize: 13, marginBottom: 7, color: "rgba(255,255,255,0.7)", textDecoration: "none" }}
            >
              Vender entradas
            </Link>
            <Link
              to="/how-it-works"
              style={{ display: "block", fontSize: 13, marginBottom: 7, color: "rgba(255,255,255,0.7)", textDecoration: "none" }}
            >
              Cómo funciona
            </Link>
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 600, fontSize: 12.5, marginBottom: 11 }}>Soporte</div>
            <Link
              to="/support"
              style={{ display: "block", fontSize: 13, marginBottom: 7, color: "rgba(255,255,255,0.7)", textDecoration: "none" }}
            >
              Centro de ayuda
            </Link>
            <Link
              to="/contact"
              style={{ display: "block", fontSize: 13, marginBottom: 7, color: "rgba(255,255,255,0.7)", textDecoration: "none" }}
            >
              Contacto
            </Link>
            <Link
              to="/how-it-works"
              style={{ display: "block", fontSize: 13, marginBottom: 7, color: "rgba(255,255,255,0.7)", textDecoration: "none" }}
            >
              Garantías
            </Link>
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 600, fontSize: 12.5, marginBottom: 11 }}>Legal</div>
            <span style={{ display: "block", fontSize: 13, marginBottom: 7, cursor: "pointer" }}>Términos de uso</span>
            <span style={{ display: "block", fontSize: 13, marginBottom: 7, cursor: "pointer" }}>Privacidad</span>
            <span style={{ display: "block", fontSize: 13, marginBottom: 7, cursor: "pointer" }}>Cookies</span>
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 600, fontSize: 12.5, marginBottom: 9 }}>¿Tenés entradas?</div>
            <p style={{ fontSize: 13, marginBottom: 13, lineHeight: 1.55 }}>
              Publicá y llegá a miles de compradores activos.
            </p>
            <Link
              to="/sell-ticket"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 15px",
                borderRadius: 8,
                background: V,
                border: "none",
                color: "white",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                cursor: "pointer",
                ...S,
              }}
            >
              Publicá tus entradas <ArrowRight size={13} />
            </Link>
          </div>
        </div>
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: 18,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p style={{ fontSize: 12 }}>© {new Date().getFullYear()} TicketsHub · Buenos Aires, Argentina</p>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
            <ShieldSVG size={11} color="#a78bfa" />
            <span style={{ color: "rgba(255,255,255,0.35)" }}>Transacciones protegidas con escrow</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
