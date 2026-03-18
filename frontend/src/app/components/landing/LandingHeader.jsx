import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUser } from "@/app/contexts/UserContext";
import { NotificationBell } from "@/app/components/NotificationBell";
import { HubSVG } from "./LandingIcons";
import { V, VLIGHT, DARK, MUTED, BORDER, S, E } from "@/lib/design-tokens";
import { ChevronDown, Languages, LogOut, MessageCircle, Shield, Ticket, User } from "lucide-react";

/**
 * Shared header for Landing and Event pages (new design system).
 * @param {object} props
 * @param {string} [props.homeHref] Kept for API compatibility with callers (e.g. LandingNew, Event).
 */
export function LandingHeader({ homeHref: _homeHref = "#eventos" }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { user, isAuthenticated, logout, canSell } = useUser();
  const [userOpen, setUserOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const userRef = useRef(null);
  const langRef = useRef(null);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setLangOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <style>{`
        @media(min-width:769px){ .landing-desk-only{ display:flex!important; } .landing-header-mob-only{ display:none!important; } }
        @media(max-width:768px){ .landing-desk-only{ display:none!important; } .landing-header-mob-only{ display:block!important; } }
      `}</style>
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(243,243,240,0.97)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", height: 58, gap: 20 }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: V, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <HubSVG size={15} />
            </div>
            <span style={{ ...E, fontSize: 20, color: DARK, letterSpacing: "-0.4px" }}>TicketsHub</span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto", flexShrink: 0, flex: 1, justifyContent: "flex-end" }}>
            {isAuthenticated && user?.role === "Admin" && (
              <Link to="/admin" className="landing-desk-only" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "#7c3aed", color: "white", fontSize: 12, fontWeight: 600, textDecoration: "none", ...S }}>
                <Shield size={14} /> {t("header.admin")}
              </Link>
            )}
            {isAuthenticated && (
              <div className="landing-desk-only"><NotificationBell /></div>
            )}
            {!isAuthenticated && (
              <div ref={langRef} style={{ position: "relative" }}>
                <button type="button" onClick={() => setLangOpen(!langOpen)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "white", color: MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer", ...S }}>
                  <Languages size={14} /> <span className="uppercase">{i18n.language}</span> <ChevronDown size={12} style={{ transform: langOpen ? "rotate(180deg)" : "none" }} />
                </button>
                {langOpen && (
                  <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, minWidth: 140, background: "white", border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 50, overflow: "hidden" }}>
                    <button type="button" onClick={() => changeLanguage("en")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "none", background: i18n.language === "en" ? VLIGHT : "transparent", color: i18n.language === "en" ? V : DARK, cursor: "pointer", fontSize: 13, ...S, textAlign: "left" }}>🇺🇸 English</button>
                    <button type="button" onClick={() => changeLanguage("es")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "none", background: i18n.language === "es" ? VLIGHT : "transparent", color: i18n.language === "es" ? V : DARK, cursor: "pointer", fontSize: 13, ...S, textAlign: "left" }}>🇪🇸 Español</button>
                  </div>
                )}
              </div>
            )}
            {isAuthenticated && (
              <>
                <div ref={langRef} className="landing-desk-only" style={{ position: "relative" }}>
                  <button type="button" onClick={() => setLangOpen(!langOpen)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "white", color: MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer", ...S }}>
                    <Languages size={14} /> <span className="uppercase">{i18n.language}</span> <ChevronDown size={12} style={{ transform: langOpen ? "rotate(180deg)" : "none" }} />
                  </button>
                  {langOpen && (
                    <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, minWidth: 140, background: "white", border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 50, overflow: "hidden" }}>
                      <button type="button" onClick={() => changeLanguage("en")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "none", background: i18n.language === "en" ? VLIGHT : "transparent", color: i18n.language === "en" ? V : DARK, cursor: "pointer", fontSize: 13, ...S, textAlign: "left" }}>🇺🇸 English</button>
                      <button type="button" onClick={() => changeLanguage("es")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "none", background: i18n.language === "es" ? VLIGHT : "transparent", color: i18n.language === "es" ? V : DARK, cursor: "pointer", fontSize: 13, ...S, textAlign: "left" }}>🇪🇸 Español</button>
                    </div>
                  )}
                </div>
                <Link to="/sell-ticket" state={{ from: location.pathname }} className="landing-desk-only" style={{ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${V}`, background: "white", color: V, fontSize: 13, fontWeight: 600, textDecoration: "none", ...S }}>
                  {t("header.sellTickets")}
                </Link>
              </>
            )}
            {isAuthenticated ? (
              <div ref={userRef} style={{ position: "relative" }}>
                <button type="button" onClick={() => setUserOpen(!userOpen)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 100, background: V, color: "white", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", ...S }}>
                  <User size={16} /> <span className="landing-desk-only">{user?.firstName} {user?.lastName}</span> <ChevronDown size={14} style={{ transform: userOpen ? "rotate(180deg)" : "none" }} />
                </button>
                {userOpen && (
                  <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 6, minWidth: 200, background: "white", border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: "0 8px 28px rgba(0,0,0,0.12)", zIndex: 50, padding: 6 }}>
                    <div
                      className="landing-header-mob-only"
                      style={{
                        padding: "12px 12px 10px",
                        margin: "-6px -6px 0",
                        borderBottom: `1px solid ${BORDER}`,
                        fontSize: 15,
                        fontWeight: 700,
                        color: DARK,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.25,
                      }}
                    >
                      {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "—"}
                    </div>
                    <Link to="/my-tickets" className="landing-desk-only" onClick={() => setUserOpen(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, color: DARK, textDecoration: "none", fontSize: 13, fontWeight: 500, ...S }}><Ticket size={16} /> {t("header.myTickets")}</Link>
                    {canSell?.() && <Link to="/seller-dashboard" className="landing-desk-only" onClick={() => setUserOpen(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, color: DARK, textDecoration: "none", fontSize: 13, fontWeight: 500, ...S }}><Ticket size={16} /> {t("header.mySales")}</Link>}
                    <Link to="/support" onClick={() => setUserOpen(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, color: DARK, textDecoration: "none", fontSize: 13, fontWeight: 500, ...S }}><MessageCircle size={16} /> {t("header.support")}</Link>
                    <Link to="/user-profile" className="landing-desk-only" onClick={() => setUserOpen(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, color: DARK, textDecoration: "none", fontSize: 13, fontWeight: 500, ...S }}><User size={16} /> {t("header.myProfile")}</Link>
                    <div className="landing-header-mob-only">
                      <div style={{ padding: "6px 12px 10px" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>{t("header.language")}</div>
                        <div
                          role="group"
                          aria-label={t("header.language")}
                          style={{
                            display: "flex",
                            padding: 3,
                            gap: 2,
                            borderRadius: 9999,
                            background: `${BORDER}33`,
                            border: `1px solid ${BORDER}`,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => { changeLanguage("en"); setUserOpen(false); }}
                            style={{
                              flex: 1,
                              padding: "9px 12px",
                              borderRadius: 9999,
                              border: "none",
                              background: i18n.language === "en" ? V : "transparent",
                              color: i18n.language === "en" ? "white" : MUTED,
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              boxShadow: i18n.language === "en" ? "0 1px 3px rgba(109,40,217,0.35)" : "none",
                              transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
                              ...S,
                            }}
                          >
                            EN
                          </button>
                          <button
                            type="button"
                            onClick={() => { changeLanguage("es"); setUserOpen(false); }}
                            style={{
                              flex: 1,
                              padding: "9px 12px",
                              borderRadius: 9999,
                              border: "none",
                              background: i18n.language === "es" ? V : "transparent",
                              color: i18n.language === "es" ? "white" : MUTED,
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              boxShadow: i18n.language === "es" ? "0 1px 3px rgba(109,40,217,0.35)" : "none",
                              transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
                              ...S,
                            }}
                          >
                            ES
                          </button>
                        </div>
                      </div>
                    </div>
                    <div style={{ borderTop: `1px solid ${BORDER}`, margin: "6px 0" }} />
                    <button type="button" onClick={() => { setUserOpen(false); logout(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, color: "#dc2626", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, ...S }}><LogOut size={16} /> {t("header.logout")}</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="landing-desk-only" style={{ padding: "7px 16px", borderRadius: 8, background: V, color: "white", border: "none", fontSize: 13, fontWeight: 600, textDecoration: "none", ...S }}>{t("header.enter")}</Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
