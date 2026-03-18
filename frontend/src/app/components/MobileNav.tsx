import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@/app/contexts/UserContext";

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const V      = "#6d28d9";
const VLIGHT = "#f0ebff";
const BLUE   = "#1e3a5f";
const BLIGHT = "#e4edf7";
const DARK   = "#0f0f1a";
const MUTED  = "#6b7280";
const BG     = "#f3f3f0";
const CARD   = "#ffffff";
const BORDER = "#e5e7eb";
const GREEN  = "#15803d";
const GLIGHT = "#f0fdf4";
const GBORD  = "#bbf7d0";
const AMBER  = "#92400e";
const ABG    = "#fffbeb";
const ABORD  = "#fde68a";
const S = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

// ─── TYPES ────────────────────────────────────────────────────────────────────
export type NavTab = "home" | "activity" | "tickets" | "profile";

export interface MobileNavProps {
  /** Currently active tab */
  activeTab: NavTab;
  /** Called when user taps a tab */
  onTabChange: (tab: NavTab) => void;
  /** Unread notifications/activity count (badge on Actividad) */
  activityCount?: number;
  /** Transactions requiring user action (badge on Mis entradas) */
  pendingCount?: number;
  /** Current user — shown in the sell sheet header */
  user?: {
    name: string;
    initials: string;
    verified: boolean;
  };
  /** Called when user taps "Publicar nueva entrada" in sell sheet */
  onNewListing?: () => void;
  /** Called when user taps "Mis publicaciones" in sell sheet */
  onMyListings?: () => void;
  /** Called when user taps "Mis ventas" in sell sheet */
  onMySales?: () => void;
  /** Called when user taps "Ofertas recibidas" in sell sheet */
  onReceivedOffers?: () => void;
  /** Label for the profile tab (e.g. "Ingresar" when logged out) */
  profileTabLabel?: string;
}

// ─── ICONS ───────────────────────────────────────────────────────────────────
function IconHome({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconActivity({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function IconTicket({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2v2z" />
      <line x1="9" y1="12" x2="9.01" y2="12" strokeWidth="3" strokeLinecap="round" />
      <line x1="13" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconProfile({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="white" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke={MUTED} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

// ─── SHEET ROW ────────────────────────────────────────────────────────────────
interface SheetRowProps {
  iconBg: string;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick?: () => void;
}

function SheetRow({ iconBg, icon, label, sublabel, onClick }: SheetRowProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "12px 20px", width: "100%", border: "none",
        background: hovered ? BG : "transparent",
        cursor: "pointer", textAlign: "left", transition: "background 0.12s",
        ...S,
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: iconBg, display: "flex",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: DARK, margin: "0 0 1px" }}>{label}</p>
        <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{sublabel}</p>
      </div>
      <IconChevronRight />
    </button>
  );
}

// ─── SELL SHEET ──────────────────────────────────────────────────────────────
interface SellSheetProps {
  open: boolean;
  onClose: () => void;
  user?: MobileNavProps["user"];
  onNewListing?: () => void;
  onMyListings?: () => void;
  onMySales?: () => void;
  onReceivedOffers?: () => void;
}

function SellSheet({ open, onClose, user, onNewListing, onMyListings, onMySales, onReceivedOffers }: SellSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on outside tap
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on swipe down
  useEffect(() => {
    if (!open) return;
    const el = sheetRef.current;
    if (!el) return;
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
    const onTouchEnd   = (e: TouchEvent) => {
      if (e.changedTouches[0].clientY - startY > 60) onClose();
    };
    el.addEventListener("touchstart", onTouchStart);
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [open, onClose]);

  const handleRow = (cb?: () => void) => {
    onClose();
    cb?.();
  };

  return (
    <>
      <style>{`
        .th-sheet-overlay {
          position: fixed; inset: 0; z-index: 300;
          background: rgba(15,15,26,0.52);
          opacity: 0; pointer-events: none;
          transition: opacity 0.22s ease;
          display: flex; align-items: flex-end;
        }
        .th-sheet-overlay.open {
          opacity: 1; pointer-events: all;
        }
        .th-sheet {
          width: 100%; background: white;
          border-radius: 20px 20px 0 0;
          transform: translateY(100%);
          transition: transform 0.28s cubic-bezier(0.32,0.72,0,1);
          /* safe area padding for iPhone home indicator */
          padding-bottom: env(safe-area-inset-bottom, 16px);
        }
        .th-sheet-overlay.open .th-sheet {
          transform: translateY(0);
        }
      `}</style>

      <div
        className={`th-sheet-overlay${open ? " open" : ""}`}
        onClick={handleOverlayClick}
        aria-modal="true"
        role="dialog"
        aria-label="Opciones de venta"
      >
        <div className="th-sheet" ref={sheetRef}>
          {/* Drag handle */}
          <div style={{ width: 36, height: 4, background: BORDER, borderRadius: 2, margin: "12px auto 4px" }} />

          {/* User header */}
          <div style={{ padding: "8px 20px 4px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: VLIGHT, color: V,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, flexShrink: 0, ...S,
            }}>
              {user?.initials ?? "?"}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: DARK, margin: "0 0 1px", ...S }}>
                {user?.name ?? "Mi cuenta"}
              </p>
              {user?.verified && (
                <p style={{ fontSize: 12, color: GREEN, margin: 0, ...S, display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Vendedor verificado
                </p>
              )}
            </div>
          </div>

          <div style={{ height: 1, background: BG, margin: "14px 20px 0" }} />

          <SheetRow
            iconBg={VLIGHT}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={V} strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>}
            label="Publicar Nueva entrada"
            sublabel="Agregá una entrada a la venta"
            onClick={() => handleRow(onNewListing)}
          />
          <SheetRow
            iconBg={GLIGHT}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2v2z"/></svg>}
            label="Mis Publicaciones"
            sublabel="Entradas activas en venta"
            onClick={() => handleRow(onMyListings)}
          />
          <SheetRow
            iconBg={ABG}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2v2z" />
                <line x1="9" y1="12" x2="9.01" y2="12" strokeWidth="2.8" />
                <line x1="13" y1="12" x2="19" y2="12" />
                <path d="M15 16l2 2 3.5-3.5" strokeWidth="2" />
              </svg>
            }
            label="Mis Ventas"
            sublabel="Historial y transacciones como vendedor"
            onClick={() => handleRow(onMySales)}
          />
          <SheetRow
            iconBg={BLIGHT}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>}
            label="Ofertas recibidas"
            sublabel="Respondé ofertas sobre tus publicaciones"
            onClick={() => handleRow(onReceivedOffers)}
          />

          <div style={{ height: 1, background: BG, margin: "8px 20px" }} />

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "10px 20px", width: "100%", border: "none",
              background: "transparent", cursor: "pointer", ...S,
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: MUTED, margin: 0 }}>Cerrar</p>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── NAV ITEM ─────────────────────────────────────────────────────────────────
interface NavItemProps {
  id: NavTab;
  label: string;
  icon: (color: string) => React.ReactNode;
  active: boolean;
  badge?: number;
  onClick: () => void;
}

function NavItem({ id, label, icon, active, badge, onClick }: NavItemProps) {
  const color = active ? V : MUTED;
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 4, cursor: "pointer", padding: "4px 10px",
        border: "none", background: "none", minWidth: 56, ...S,
      }}
    >
      <div style={{ position: "relative", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon(color)}
        {badge !== undefined && badge > 0 && (
          <div style={{
            position: "absolute", top: -3, right: -3,
            minWidth: 16, height: 16, borderRadius: "50%",
            background: "#dc2626", border: "2px solid white",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 700, color: "white", padding: "0 3px",
          }}>
            {badge > 9 ? "9+" : badge}
          </div>
        )}
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 600, color, transition: "color 0.15s" }}>
        {label}
      </span>
    </button>
  );
}

// ─── SELL BUTTON (center) ─────────────────────────────────────────────────────
interface SellButtonProps {
  onPress: () => void;
}

function SellButton({ onPress }: SellButtonProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <button
        onClick={onPress}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        aria-label="Vender entrada"
        style={{
          width: 48, height: 48, borderRadius: "50%",
          background: V, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(109,40,217,0.38)",
          transform: pressed ? "scale(0.93)" : "translateY(-10px)",
          transition: "transform 0.15s",
          marginBottom: pressed ? 0 : undefined,
        }}
      >
        <IconPlus />
      </button>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: MUTED, ...S, marginTop: -6 }}>
        Vender
      </span>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
function MobileNav({
  activeTab,
  onTabChange,
  activityCount = 0,
  pendingCount = 0,
  user,
  onNewListing,
  onMyListings,
  onMySales,
  onReceivedOffers,
  profileTabLabel = "Perfil",
}: MobileNavProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, canSell } = useUser();

  const closeSheet = () => setSheetOpen(false);

  const handleSellPress = () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/sell-ticket" } });
      return;
    }
    if (!canSell()) {
      navigate("/become-seller");
      return;
    }
    setSheetOpen(true);
  };

  const TABS: Array<{ id: NavTab; label: string; icon: (c: string) => React.ReactNode; badge?: number }> = [
    { id: "home",     label: "Explorar",     icon: (c) => <IconHome color={c} />     },
    { id: "activity", label: "Actividad",    icon: (c) => <IconActivity color={c} />, badge: activityCount },
    // sell button placeholder — rendered separately
    { id: "tickets",  label: "Mis entradas", icon: (c) => <IconTicket color={c} />,  badge: pendingCount  },
    { id: "profile",  label: profileTabLabel, icon: (c) => <IconProfile color={c} /> },
  ];

  return (
    <div className="th-mobile-nav-root">
      <style>{`
        .th-mobile-nav-root { }
        @media (min-width: 768px) {
          .th-mobile-nav-root { display: none !important; pointer-events: none; }
        }
        .th-bottom-nav {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 200;
          background: rgba(255,255,255,0.97);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-top: 1px solid ${BORDER};
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>

      <nav className="th-bottom-nav" aria-label="Navegación principal">
        <div style={{
          display: "flex", justifyContent: "space-around",
          alignItems: "center", padding: "6px 0 10px",
          maxWidth: 480, margin: "0 auto",
        }}>
          {/* First two tabs */}
          {TABS.slice(0, 2).map((tab) => (
            <NavItem
              key={tab.id}
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              active={activeTab === tab.id}
              badge={tab.badge}
              onClick={() => onTabChange(tab.id)}
            />
          ))}

          {/* Center sell button */}
          <SellButton onPress={handleSellPress} />

          {/* Last two tabs */}
          {TABS.slice(2).map((tab) => (
            <NavItem
              key={tab.id}
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              active={activeTab === tab.id}
              badge={tab.badge}
              onClick={() => onTabChange(tab.id)}
            />
          ))}
        </div>
      </nav>

      <SellSheet
        open={sheetOpen}
        onClose={closeSheet}
        user={user}
        onNewListing={onNewListing}
        onMyListings={onMyListings}
        onMySales={onMySales}
        onReceivedOffers={onReceivedOffers}
      />
    </div>
  );
}

/**
 * Mobile bottom nav wired to app routes (landing, event, checkout, and legacy pages).
 */
export function MobileNavWithRouting() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, canSell } = useUser();
  const [tab, setTab] = useState<NavTab>("home");

  useEffect(() => {
    const p = location.pathname;
    const q = new URLSearchParams(location.search);
    if (p === "/my-tickets" && q.get("tab") === "offers") setTab("activity");
    else if (p === "/my-tickets") setTab("tickets");
    else if (p === "/user-profile") setTab("profile");
    else if (p === "/login" || p === "/register") setTab("profile");
    else if (p === "/" || /^\/event\/[^/]+$/.test(p) || /^\/buy\/[^/]+\/[^/]+$/.test(p)) setTab("home");
    else setTab("home");
  }, [location.pathname, location.search]);

  const mobileNavUser = useMemo(() => {
    if (!isAuthenticated || !user) return undefined;
    const fn = user.firstName || "";
    const ln = user.lastName || "";
    const i1 = (fn[0] || user.email?.[0] || "?").toUpperCase();
    const i2 = (ln[0] || user.email?.[1] || "").toUpperCase();
    return {
      name: [fn, ln].filter(Boolean).join(" ") || user.email || "User",
      initials: (i1 + i2).slice(0, 2),
      verified: typeof canSell === "function" ? canSell() : false,
    };
  }, [isAuthenticated, user, canSell]);

  const onTabChange = useCallback(
    (t: NavTab) => {
      setTab(t);
      if (t === "home") {
        navigate("/");
        requestAnimationFrame(() => {
          document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return;
      }
      if (t === "activity") {
        if (!isAuthenticated) {
          navigate("/login", { state: { from: "/my-tickets?tab=offers" } });
        } else {
          navigate("/my-tickets?tab=offers");
        }
        return;
      }
      if (t === "tickets") {
        if (!isAuthenticated) {
          navigate("/login", { state: { from: "/my-tickets" } });
        } else {
          navigate("/my-tickets");
        }
        return;
      }
      if (t === "profile") {
        if (!isAuthenticated) {
          navigate("/login", { state: { from: "/user-profile" } });
        } else {
          navigate("/user-profile");
        }
      }
    },
    [navigate, isAuthenticated],
  );

  return (
    <MobileNav
      activeTab={tab}
      onTabChange={onTabChange}
      profileTabLabel={isAuthenticated ? "Perfil" : "Ingresar"}
      user={mobileNavUser}
      onNewListing={() => navigate("/sell-ticket")}
      onMyListings={() => navigate("/seller-dashboard")}
      onMySales={() => navigate("/seller-dashboard?tab=sold")}
      onReceivedOffers={() => navigate("/seller-dashboard?tab=received")}
    />
  );
}

export default MobileNav;
export { MobileNav };
