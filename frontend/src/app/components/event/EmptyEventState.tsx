import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Plus, CheckCircle, Lock, Users, ArrowRight } from "lucide-react";
import { useUser } from "@/app/contexts/UserContext";
import { subscriptionsService } from "@/api/services/subscriptions.service";

const V = "#692dd4";
const V_MID = "#7c3aed";
const VLIGHT = "#f5f3ff";
const DARK = "#111827";
const MUTED = "#6b7280";
const BG = "#fafafa";
const SUCCESS = "#059669";
const SUCCESS_LIGHT = "#ecfdf5";
const SUCCESS_BORDER = "#a7f3d0";

const E: React.CSSProperties = { fontFamily: "'DM Serif Display', serif" };
const S: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

interface Props {
  waitingCount?: number;
  eventId: string;
}

export default function EmptyEventState({ waitingCount = 0, eventId }: Props) {
  const { user } = useUser();
  const [alertValue, setAlertValue] = useState(user?.email ?? "");
  const [alertError, setAlertError] = useState(false);
  const [alertErrorMsg, setAlertErrorMsg] = useState("");
  const [alertSent, setAlertSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const isLoggedIn = user !== null && user !== undefined;

  const handleAlert = async () => {
    const emailToSubmit = isLoggedIn ? (user?.email ?? "") : alertValue;

    if (!isLoggedIn && !isValidEmail(emailToSubmit)) {
      setAlertError(true);
      setAlertErrorMsg("Ingresá un email válido");
      return;
    }

    setLoading(true);
    setAlertError(false);
    try {
      await subscriptionsService.subscribe(
        eventId,
        isLoggedIn ? undefined : emailToSubmit,
      );
      setAlertSent(true);
    } catch {
      setAlertError(true);
      setAlertErrorMsg("Ocurrió un error. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .ees-root {
          display: grid;
          grid-template-columns: 1fr;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          overflow: hidden;
          background: white;
        }
        @media (min-width: 640px) {
          .ees-root { grid-template-columns: 1fr auto 1fr; }
          .ees-divider-h { display: none !important; }
          .ees-divider-v { display: flex !important; }
        }
        @media (max-width: 639px) {
          .ees-divider-v { display: none !important; }
          .ees-divider-h { display: flex !important; }
        }
        .ees-input:focus { border-color: #692dd4 !important; }
        .ees-input:disabled { opacity: 0.65; cursor: not-allowed; }
      `}</style>

      <div className="ees-root">

        {/* ── LEFT: Buyer ───────────────────────────────────────── */}
        <div style={{ padding: "32px 28px", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>

          {waitingCount >= 1 && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a",
              borderRadius: 100, fontSize: 11.5, fontWeight: 600,
              padding: "3px 10px", marginBottom: 14, ...S,
            }}>
              <Users size={10} />
              {waitingCount === 1 ? "1 persona esperando" : `${waitingCount} personas esperando`}
            </div>
          )}

          <p style={{ ...E, fontSize: 19, color: DARK, margin: "0 0 6px", letterSpacing: "-0.3px" }}>
            Sin entradas disponibles
          </p>
          <p style={{ ...S, fontSize: 13, color: MUTED, lineHeight: 1.6, margin: "0 0 20px" }}>
            Avisanos y te notificamos en cuanto aparezca una entrada para este evento.
          </p>

          {alertSent ? (
            <div style={{
              background: SUCCESS_LIGHT, border: `1.5px solid ${SUCCESS_BORDER}`,
              borderRadius: 10, padding: "12px 16px",
              display: "flex", alignItems: "flex-start", gap: 10, width: "100%",
            }}>
              <CheckCircle size={15} style={{ color: SUCCESS, flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ ...S, fontSize: 13, fontWeight: 700, color: SUCCESS, margin: "0 0 1px" }}>¡Alerta activada!</p>
                <p style={{ ...S, fontSize: 12, color: SUCCESS, lineHeight: 1.5, margin: 0 }}>
                  Te avisamos cuando haya entradas.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, width: "100%", marginBottom: 6 }}>
                <input
                  className="ees-input"
                  type="email"
                  placeholder="tu@email.com"
                  value={alertValue}
                  disabled={isLoggedIn || loading}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setAlertValue(e.target.value);
                    setAlertError(false);
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  style={{
                    flex: 1, ...S, fontSize: 13, fontWeight: 500,
                    padding: "9px 13px",
                    border: `1.5px solid ${alertError ? "#e11d48" : focused ? V : "#d1d5db"}`,
                    borderRadius: 9, color: DARK, background: BG,
                    outline: "none", transition: "border-color 0.15s", minWidth: 0,
                  }}
                />
                <button
                  onClick={handleAlert}
                  disabled={loading}
                  style={{
                    ...S, fontSize: 13, fontWeight: 700,
                    background: loading ? V_MID : V, color: "white", border: "none",
                    borderRadius: 9, padding: "9px 16px", cursor: loading ? "not-allowed" : "pointer",
                    display: "inline-flex", alignItems: "center", gap: 5,
                    whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(105,45,212,0.28)",
                    flexShrink: 0, opacity: loading ? 0.8 : 1,
                  }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = V_MID; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = V; }}
                >
                  <Bell size={12} /> {loading ? "..." : "Avisarme"}
                </button>
              </div>

              {alertError && (
                <p style={{ ...S, fontSize: 11.5, color: "#e11d48", margin: "0 0 4px" }}>
                  {alertErrorMsg}
                </p>
              )}

              <p style={{ ...S, fontSize: 11.5, color: "#9ca3af", display: "flex", alignItems: "center", gap: 4, margin: 0 }}>
                <Lock size={10} /> Sin spam. Solo te escribimos si hay entradas.
              </p>
            </>
          )}
        </div>

        {/* ── Vertical divider (desktop) ─────────────────────────── */}
        <div className="ees-divider-v" style={{ display: "none", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 0" }}>
          <div style={{ width: 1, flex: 1, background: "#f3f4f6" }} />
          <span style={{ ...S, fontSize: 10, color: "#c4b5fd", fontWeight: 700, letterSpacing: "0.08em", writingMode: "vertical-rl", padding: "12px 0" }}>
            ¿TENÉS ENTRADAS?
          </span>
          <div style={{ width: 1, flex: 1, background: "#f3f4f6" }} />
        </div>

        {/* ── Horizontal divider (mobile) ───────────────────────── */}
        <div className="ees-divider-h" style={{ display: "none", alignItems: "center", gap: 12, padding: "0 28px" }}>
          <div style={{ flex: 1, height: 1, background: "#f3f4f6" }} />
          <span style={{ ...S, fontSize: 10.5, color: "#c4b5fd", fontWeight: 700, letterSpacing: "0.06em" }}>
            ¿TENÉS ENTRADAS?
          </span>
          <div style={{ flex: 1, height: 1, background: "#f3f4f6" }} />
        </div>

        {/* ── RIGHT: Seller ──────────────────────────────────────── */}
        <div style={{ background: VLIGHT, padding: "32px 28px", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center" }}>
          <p style={{ ...E, fontSize: 19, color: V, margin: "0 0 6px", letterSpacing: "-0.3px" }}>
            {waitingCount >= 1 ? "Hay compradores esperando" : "Sé el primero en publicar"}
          </p>
          <p style={{ ...S, fontSize: 13, color: "#7c3aed", lineHeight: 1.6, margin: "0 0 20px" }}>
            {waitingCount >= 1
              ? `Publicá tu entrada y llegás directo a las ${waitingCount} ${waitingCount === 1 ? "persona" : "personas"} que están buscando.`
              : "Publicá tu entrada y llegá a los primeros compradores de este evento."}
          </p>

          <Link
            to="/sell-ticket"
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              ...S, fontSize: 13, fontWeight: 700,
              color: "white", background: V,
              borderRadius: 9, padding: "10px 20px",
              textDecoration: "none", boxShadow: "0 4px 12px rgba(105,45,212,0.22)",
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = V_MID; }}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = V; }}
          >
            <Plus size={13} /> Publicar mi entrada <ArrowRight size={13} />
          </Link>

          {waitingCount >= 1 && (
            <p style={{ ...S, fontSize: 11.5, color: "#7c3aed", marginTop: 10, display: "flex", alignItems: "center", gap: 4 }}>
              <Users size={10} />
              {waitingCount} {waitingCount === 1 ? "persona esperando" : "personas esperando"}
            </p>
          )}
        </div>

      </div>
    </>
  );
}
