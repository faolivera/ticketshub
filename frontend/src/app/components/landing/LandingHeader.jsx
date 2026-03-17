import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUser } from "@/app/contexts/UserContext";
import { NotificationBell } from "@/app/components/NotificationBell";
import { HubSVG, ShieldSVG } from "./LandingIcons";
import { V, VLIGHT, BLUE, BLIGHT, DARK, MUTED, BORDER, S, E } from "@/lib/design-tokens";
import { ChevronDown, Languages, LogOut, MessageCircle, Menu, Shield, Ticket, User, X } from "lucide-react";

/**
 * Shared header for Landing and Event pages (new design system).
 * Optional: homeHref — use "#eventos" for landing (scroll), or "/" for event page.
 */
export function LandingHeader({ homeHref = "#eventos" }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { user, isAuthenticated, logout, canSell } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
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
        @media(min-width:769px){ .landing-desk-only{ display:flex!important; } .landing-mob-btn{ display:none!important; } }
        @media(max-width:768px){ .landing-desk-only{ display:none!important; } .landing-mob-btn{ display:inline-flex!important; } }
      `}</style>
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(243,243,240,0.97)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", height: 58, gap: 20 }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: V, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <HubSVG size={15} />
            </div>
            <span style={{ ...E, fontSize: 20, color: DARK, letterSpacing: "-0.4px" }}>TicketsHub</span>
          </Link>

          <nav className="landing-desk-only" style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
            {homeHref.startsWith("#") ? (
              <a href={homeHref} style={{ padding: "6px 10px", fontSize: 13.5, fontWeight: 500, color: MUTED, borderRadius: 7, ...S, textDecoration: "none" }}>{t("header.home")}</a>
            ) : (
              <Link to={homeHref} style={{ padding: "6px 10px", fontSize: 13.5, fontWeight: 500, color: MUTED, borderRadius: 7, ...S, textDecoration: "none" }}>{t("header.home")}</Link>
            )}
            <Link to="/how-it-works" style={{ padding: "6px 10px", fontSize: 13.5, fontWeight: 500, color: MUTED, borderRadius: 7, ...S, textDecoration: "none" }}>{t("footer.howItWorks")}</Link>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto", flexShrink: 0 }}>
            {isAuthenticated && user?.role === "Admin" && (
              <Link to="/admin" className="landing-desk-only" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "#7c3aed", color: "white", fontSize: 12, fontWeight: 600, textDecoration: "none", ...S }}>
                <Shield size={14} /> {t("header.admin")}
              </Link>
            )}
            <div className="landing-desk-only" style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 100, background: BLIGHT, fontSize: 12, fontWeight: 600, color: BLUE }}>
              <ShieldSVG size={12} color={BLUE} /> {t("landing.trustSecurePayment")}
            </div>
            {isAuthenticated && (
              <>
                <div className="landing-desk-only"><NotificationBell /></div>
                <Link to="/sell-ticket" state={{ from: location.pathname }} className="landing-desk-only" style={{ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${V}`, background: "white", color: V, fontSize: 13, fontWeight: 600, textDecoration: "none", ...S }}>
                  {t("header.sellTickets")}
                </Link>
              </>
            )}
            <div className="landing-desk-only" ref={langRef} style={{ position: "relative" }}>
              <button onClick={() => setLangOpen(!langOpen)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "white", color: MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer", ...S }}>
                <Languages size={14} /> <span className="uppercase">{i18n.language}</span> <ChevronDown size={12} style={{ transform: langOpen ? "rotate(180deg)" : "none" }} />
              </button>
              {langOpen && (
                <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, minWidth: 140, background: "white", border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 50, overflow: "hidden" }}>
                  <button onClick={() => changeLanguage("en")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "none", background: i18n.language === "en" ? VLIGHT : "transparent", color: i18n.language === "en" ? V : DARK, cursor: "pointer", fontSize: 13, ...S, textAlign: "left" }}>🇺🇸 English</button>
                  <button onClick={() => changeLanguage("es")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "none", background: i18n.language === "es" ? VLIGHT : "transparent", color: i18n.language === "es" ? V : DARK, cursor: "pointer", fontSize: 13, ...S, textAlign: "left" }}>🇪🇸 Español</button>
                </div>
              )}
            </div>
            {isAuthenticated ? (
              <div ref={userRef} style={{ position: "relative" }}>
                <button onClick={() => { setUserOpen(!userOpen); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 100, background: V, color: "white", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", ...S }}>
                  <User size={16} /> <span className="landing-desk-only">{user?.firstName} {user?.lastName}</span> <ChevronDown size={14} style={{ transform: userOpen ? "rotate(180deg)" : "none" }} />
                </button>
                {userOpen && (
                  <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 6, minWidth: 200, background: "white", border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: "0 8px 28px rgba(0,0,0,0.12)", zIndex: 50, padding: 6 }}>
                    <Link to="/my-tickets" onClick={() => setUserOpen(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, color: DARK, textDecoration: "none", fontSize: 13, fontWeight: 500, ...S }}><Ticket size={16} /> {t("header.myTickets")}</Link>
                    {canSell?.() && <Link to="/seller-dashboard" onClick={() => setUserOpen(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, color: DARK, textDecoration: "none", fontSize: 13, fontWeight: 500, ...S }}><Ticket size={16} /> {t("header.mySales")}</Link>}
                    <Link to="/support" onClick={() => setUserOpen(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, color: DARK, textDecoration: "none", fontSize: 13, fontWeight: 500, ...S }}><MessageCircle size={16} /> {t("header.support")}</Link>
                    <Link to="/user-profile" onClick={() => setUserOpen(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, color: DARK, textDecoration: "none", fontSize: 13, fontWeight: 500, ...S }}><User size={16} /> {t("header.myProfile")}</Link>
                    <div style={{ borderTop: `1px solid ${BORDER}`, margin: "6px 0" }} />
                    <button onClick={() => { setUserOpen(false); logout(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, color: "#dc2626", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, ...S }}><LogOut size={16} /> {t("header.logout")}</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="landing-desk-only" style={{ padding: "7px 16px", borderRadius: 8, background: V, color: "white", border: "none", fontSize: 13, fontWeight: 600, textDecoration: "none", ...S }}>{t("header.enter")}</Link>
            )}
            <button className="landing-mob-btn" onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: DARK }}>
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div style={{ background: "white", borderTop: `1px solid ${BORDER}`, padding: "14px 24px 20px" }}>
            {homeHref.startsWith("#") ? (
              <a href={homeHref} onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 14, fontWeight: 500, color: DARK, textDecoration: "none" }}>{t("header.home")}</a>
            ) : (
              <Link to={homeHref} onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 14, fontWeight: 500, color: DARK, textDecoration: "none" }}>{t("header.home")}</Link>
            )}
            <Link to="/how-it-works" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 14, fontWeight: 500, color: DARK, textDecoration: "none" }}>{t("footer.howItWorks")}</Link>
            {isAuthenticated ? (
              <Link to="/sell-ticket" state={{ from: location.pathname }} onClick={() => setMenuOpen(false)} style={{ display: "block", marginTop: 12, padding: "11px", borderRadius: 9, border: `1.5px solid ${V}`, background: "white", color: V, fontSize: 14, fontWeight: 600, textAlign: "center", textDecoration: "none", ...S }}>{t("header.sellTickets")}</Link>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)} style={{ display: "block", marginTop: 12, padding: "11px", borderRadius: 9, background: V, color: "white", fontSize: 14, fontWeight: 600, textAlign: "center", textDecoration: "none", ...S }}>{t("header.enter")}</Link>
            )}
          </div>
        )}
      </header>
    </>
  );
}
