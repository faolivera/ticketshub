import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@/app/contexts/UserContext";
import { V, DARK, MUTED, BORDER, S } from "@/lib/design-tokens";

// ─── TYPES ────────────────────────────────────────────────────────────────────

/**
 * All possible tab ids across the three nav states.
 *
 * Slot layout:
 *   1          2             3      4                  5
 *   Explorar · Mis entradas · [FAB] · ???              · ???
 *
 * Guest:  home · tickets(dim) · FAB · how-it-works · login
 * Buyer:  home · tickets      · FAB · how-it-works · profile
 * Seller: home · tickets      · FAB · sales        · profile
 */
export type NavTab =
  | "home"
  | "tickets"
  | "how-it-works"
  | "sales"
  | "profile"
  | "login";

export interface MobileNavProps {
  isAuthenticated: boolean;
  /** True while auth state is being resolved — hides auth-sensitive slots to prevent flash */
  isAuthLoading?: boolean;
  /** Whether the user has completed seller onboarding */
  isSeller?: boolean;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  /** Badge on Mis entradas — buyer actions pending */
  pendingBuyerCount?: number;
  /** Badge on Mis ventas — seller actions pending */
  pendingSellerCount?: number;
  /** FAB (+): navigate to sell flow (e.g. /sell-ticket) or prompt login */
  onFabPress: () => void;
  /**
   * Called when a guest taps a protected tab.
   * Receives the tab id so the parent can show a contextual login message.
   */
  onLoginRequired?: (tab: NavTab) => void;
}

// ─── ICONS ───────────────────────────────────────────────────────────────────
const IconHome = ({ c }: { c: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IconTicket = ({ c }: { c: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2v2z" />
    <line x1="9" y1="12" x2="9.01" y2="12" strokeWidth="3" strokeLinecap="round" />
    <line x1="13" y1="12" x2="19" y2="12" />
  </svg>
);

const IconHowItWorks = ({ c }: { c: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" />
  </svg>
);

const IconSales = ({ c }: { c: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const IconProfile = ({ c }: { c: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconLogin = ({ c }: { c: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

const IconPlus = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

// ─── NAV ITEM ─────────────────────────────────────────────────────────────────
function NavItem({ label, icon, active, badge, dimmed, onClick }: {
  label: string; icon: (c: string) => React.ReactNode;
  active: boolean; badge?: number; dimmed?: boolean;
  onClick: () => void;
}) {
  const color = active ? V : dimmed ? "#d1d5db" : MUTED;
  return (
    <button onClick={onClick} aria-current={active ? "page" : undefined}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 8px", border: "none", background: "none", cursor: "pointer", minWidth: 52, opacity: dimmed ? 0.65 : 1, ...S }}>
      <div style={{ position: "relative", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon(color)}
        {!!badge && badge > 0 && !dimmed && (
          <div style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, borderRadius: "50%", background: "#dc2626", border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white", padding: "0 3px" }}>
            {badge > 9 ? "9+" : badge}
          </div>
        )}
      </div>
      <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 600, color, transition: "color 0.15s", lineHeight: 1.2, textAlign: "center" }}>
        {label}
      </span>
    </button>
  );
}

// ─── SHIMMER SLOT ─────────────────────────────────────────────────────────────
function NavSlotShimmer() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "4px 8px", minWidth: 52 }}>
      <div className="th-shimmer" style={{ width: 22, height: 22, borderRadius: 6 }} />
      <div className="th-shimmer" style={{ width: 36, height: 8, borderRadius: 4 }} />
    </div>
  );
}

// ─── FAB SHIMMER ─────────────────────────────────────────────────────────────
function FABShimmer() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div className="th-shimmer" style={{ width: 48, height: 48, borderRadius: "50%", transform: "translateY(-10px)" }} />
      <div className="th-shimmer" style={{ width: 32, height: 8, borderRadius: 4, marginTop: -6 }} />
    </div>
  );
}

// ─── FAB ─────────────────────────────────────────────────────────────────────
function FAB({ onPress }: { onPress: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <button onClick={onPress}
        onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)} onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}
        aria-label="Vender entrada"
        style={{ width: 48, height: 48, borderRadius: "50%", background: V, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(105,45,212,0.38)", transform: pressed ? "scale(0.93)" : "translateY(-10px)", transition: "transform 0.15s" }}>
        <IconPlus />
      </button>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: MUTED, marginTop: -6, ...S }}>Vender</span>
    </div>
  );
}

// ─── MOBILENAV ────────────────────────────────────────────────────────────────
function MobileNav({
  isAuthenticated, isAuthLoading = false, isSeller = false, activeTab, onTabChange,
  pendingBuyerCount = 0, pendingSellerCount = 0,
  onFabPress, onLoginRequired,
}: MobileNavProps) {

  // ── Slot 4: Cómo funciona (guest + buyer) or Mis ventas (seller) ──────────
  const slot4 = isSeller ? (
    <NavItem label="Mis ventas" icon={c => <IconSales c={c} />}
      active={activeTab === "sales"} badge={pendingSellerCount}
      onClick={() => onTabChange("sales")} />
  ) : (
    <NavItem label="Cómo funciona" icon={c => <IconHowItWorks c={c} />}
      active={activeTab === "how-it-works"}
      onClick={() => onTabChange("how-it-works")} />
  );

  // ── Slot 5: perfil / ingresar (resolved) ────────────────────────────────
  const slot5 = isAuthenticated ? (
    <NavItem label="Perfil" icon={c => <IconProfile c={c} />}
      active={activeTab === "profile"}
      onClick={() => onTabChange("profile")} />
  ) : (
    <NavItem label="Ingresar" icon={c => <IconLogin c={c} />}
      active={activeTab === "login"}
      onClick={() => onTabChange("login")} />
  );

  return (
    <div className="th-mobile-nav-root">
      <style>{`
        .th-mobile-nav-root{}
        @media(min-width:768px){.th-mobile-nav-root{display:none!important;pointer-events:none;}}
        .th-bottom-nav{position:fixed;bottom:0;left:0;right:0;z-index:200;background:rgba(255,255,255,0.97);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-top:1px solid ${BORDER};padding-bottom:env(safe-area-inset-bottom,0px);}
        @keyframes th-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .th-shimmer{background:linear-gradient(90deg,#ebebeb 25%,#f5f5f5 50%,#ebebeb 75%);background-size:200% 100%;animation:th-shimmer 1.4s ease-in-out infinite;}
      `}</style>

      <nav className="th-bottom-nav" aria-label="Navegación principal">
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "6px 0 10px", maxWidth: 480, margin: "0 auto" }}>
          {isAuthLoading ? (
            <>
              <NavSlotShimmer />
              <NavSlotShimmer />
              <FABShimmer />
              <NavSlotShimmer />
              <NavSlotShimmer />
            </>
          ) : (
            <>
              {/* Slot 1 — Explorar */}
              <NavItem label="Explorar" icon={c => <IconHome c={c} />}
                active={activeTab === "home"}
                onClick={() => onTabChange("home")} />

              {/* Slot 2 — Mis entradas (dimmed for guests) */}
              <NavItem label="Mis entradas" icon={c => <IconTicket c={c} />}
                active={activeTab === "tickets"} badge={pendingBuyerCount}
                dimmed={!isAuthenticated}
                onClick={() => {
                  if (!isAuthenticated) { onLoginRequired?.("tickets"); return; }
                  onTabChange("tickets");
                }} />

              {/* Slot 3 — FAB */}
              <FAB onPress={onFabPress} />

              {/* Slot 4 — context-dependent */}
              {slot4}

              {/* Slot 5 — context-dependent */}
              {slot5}
            </>
          )}
        </div>
      </nav>
    </div>
  );
}

// ─── MOBILENAVWITHROUTING — drop-in replacement, used in App.tsx ──────────────
/**
 * Self-contained wrapper that reads from router + UserContext.
 * Used in App.tsx as: <MobileNavWithRouting />
 * No props needed — everything is derived internally.
 */
export function MobileNavWithRouting() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { isAuthenticated, isLoading, canSell } = useUser();

  const isSeller = typeof canSell === "function" ? canSell() : false;

  // ── Derive active tab from current URL ────────────────────────────────────
  const [tab, setTab] = useState<NavTab>("home");

  useEffect(() => {
    const p = location.pathname;
    if (p === "/my-tickets")          { setTab("tickets");       return; }
    if (p === "/seller-dashboard")    { setTab("sales");         return; }
    if (p === "/user-profile")        { setTab("profile");       return; }
    if (p === "/login" || p === "/register") { setTab("login"); return; }
    if (p === "/how-it-works")        { setTab("how-it-works");  return; }
    // Home covers landing, event pages, checkout
    setTab("home");
  }, [location.pathname]);

  // ── Tab → route mapping ───────────────────────────────────────────────────
  const onTabChange = useCallback((t: NavTab) => {
    setTab(t);
    switch (t) {
      case "home":
        navigate("/");
        requestAnimationFrame(() =>
          document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth", block: "start" })
        );
        return;
      case "tickets":
        navigate("/my-tickets");
        return;
      case "sales":
        navigate("/seller-dashboard");
        return;
      case "how-it-works":
        navigate("/how-it-works");
        return;
      case "profile":
        navigate("/user-profile");
        return;
      case "login":
        navigate("/login", { state: { from: "/user-profile" } });
        return;
    }
  }, [navigate]);

  // ── Guest taps a protected tab → navigate to login with context ───────────
  const onLoginRequired = useCallback((t: NavTab) => {
    const fromMap: Partial<Record<NavTab, string>> = {
      tickets: "/my-tickets",
      sales:   "/seller-dashboard",
    };
    navigate("/login", { state: { from: fromMap[t] ?? "/" } });
  }, [navigate]);

  const onFabPress = useCallback(() => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/sell-ticket" } });
      return;
    }
    navigate("/sell-ticket");
  }, [isAuthenticated, navigate]);

  return (
    <MobileNav
      isAuthenticated={isAuthenticated}
      isAuthLoading={isLoading}
      isSeller={isSeller}
      activeTab={tab}
      onTabChange={onTabChange}
      onLoginRequired={onLoginRequired}
      onFabPress={onFabPress}
    />
  );
}

export default MobileNav;
export { MobileNav };
