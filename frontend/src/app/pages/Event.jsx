import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import {
  MapPin, Shield, CheckCircle, ChevronDown, ArrowLeft, ArrowRight,
  Lock, RefreshCw, Star, Zap, TrendingUp, MessageCircle
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUser } from "@/app/contexts/UserContext";
import { ticketsService } from "@/api/services/tickets.service";
import { formatDate, formatTime } from "@/lib/format-date";
import { UserAvatar } from "@/app/components/UserAvatar";
import { BackButton } from "@/app/components/BackButton";
import {
  V,
  VLIGHT,
  BLUE,
  BLIGHT,
  DARK,
  MUTED,
  HINT,
  BG,
  CARD,
  SURFACE,
  BORDER,
  BORD2,
  GREEN,
  S,
  E,
  ERROR,
  V_HOVER,
  BLUE_HOVER,
  VL_BORDER,
  SHADOW_DROP,
  SHADOW_CARD,
  SHADOW_CARD_MD,
  SURFACE_STICKY,
  SHADOW_TICKET_HOVER,
  GREEN_LIGHT,
  ABORD,
  V_SOFT,
  V_MUTED_LIGHT,
  SHADOW_V_SOFT,
  SHADOW_V_STRONG,
  AMBER_BG_LIGHT,
  AMBER,
  BLUE_BORDER_LIGHT,
  OVERLAY_DARK_45,
  OVERLAY_V_70,
  SHADOW_HERO,
  WHITE,
} from "@/lib/design-tokens";

const SORTS = ["Mejor opción", "Precio: menor a mayor", "Precio: mayor a menor", "Solo verificados"];
const DEFAULT_IMAGE = "https://picsum.photos/seed/event/600/600";

function getInitials(name) {
  if (!name || !name.trim()) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatPrice(amountCents) {
  const n = Math.round(amountCents / 100);
  return n.toLocaleString("es-AR");
}

const fmt = (n) => "$" + Number(n).toLocaleString("es-AR");

function buildEventAndTickets(apiEvent, listings, currentUserId) {
  if (!apiEvent) return { event: null, tickets: [] };
  const approvedDates = (apiEvent.dates || []).filter((d) => d.status === "approved");
  const filteredListings = (listings || []).filter((l) => l.sellerId !== currentUserId);

  const eventImg =
    apiEvent.bannerUrls?.rectangle ||
    apiEvent.bannerUrls?.square ||
    apiEvent.images?.[0]?.src ||
    DEFAULT_IMAGE;
  const locationStr = [apiEvent.location?.city, apiEvent.location?.countryCode].filter(Boolean).join(", ");

  const dateCounts = {};
  filteredListings.forEach((l) => {
    dateCounts[l.eventDateId] = (dateCounts[l.eventDateId] || 0) + 1;
  });

  const event = {
    name: apiEvent.name || "",
    subtitle: apiEvent.description || "",
    category: apiEvent.category || "Other",
    venue: apiEvent.venue || "",
    location: locationStr,
    img: eventImg,
    dates: approvedDates.map((d) => {
      const label = `${formatDate(d.date, { month: "short", day: "numeric" })} · ${formatTime(d.date)}`;
      const full = `${formatDate(d.date)} ${formatTime(d.date)}`;
      return {
        id: d.id,
        label,
        full,
        count: dateCounts[d.id] || 0,
      };
    }),
  };

  const tickets = filteredListings.map((listing) => {
    const available = listing.ticketUnits?.filter((u) => u.status === "available").length ?? 0;
    const priceCents = listing.pricePerTicket?.amount ?? 0;
    const priceNum = priceCents / 100;
    const sectionName = listing.sectionName || listing.type || "Entrada";
    const badges = listing.sellerReputation?.badges || [];
    const verified = badges.some((b) => String(b).toLowerCase().includes("verif") || String(b).toLowerCase() === "verified");
    const seated = listing.seatingType === "numbered";
    const acceptsOffers = listing.bestOfferConfig?.enabled ?? false;

    return {
      id: listing.id,
      listingId: listing.id,
      eventSlug: listing.eventSlug,
      eventDateId: listing.eventDateId,
      sector: sectionName,
      seated,
      acceptsOffers,
      qty: available,
      price: formatPrice(priceCents),
      priceNum,
      currency: listing.pricePerTicket?.currency || "ARS",
      seller: listing.sellerPublicName || "Vendedor",
      sellerId: listing.sellerId,
      sellerAvatarUrl: listing.sellerPic?.src ?? null,
      verified,
      newSeller: badges.some((b) => String(b).toLowerCase().includes("new")),
      badge: null,
      urgency: available === 1 ? "últimas" : null,
    };
  });

  return { event, tickets };
}

function computeBestPriceBadges(tickets) {
  const bySector = {};
  tickets.forEach((t) => {
    if (!bySector[t.sector]) bySector[t.sector] = [];
    bySector[t.sector].push(t);
  });
  const bestIds = new Set();
  Object.values(bySector).forEach((group) => {
    if (group.length <= 1) return;
    const cheapest = group.reduce((min, t) => (t.priceNum < min.priceNum ? t : min), group[0]);
    bestIds.add(cheapest.id);
  });
  return bestIds;
}

export default function EventDetail() {
  const { t } = useTranslation();
  const { eventSlug } = useParams();
  const { user } = useUser();
  const [dateIdx, setDateIdx] = useState(0);
  const [sector, setSector] = useState("Todos");
  const [sortIdx, setSortIdx] = useState(0);
  const [gridView, setGridView] = useState(true);
  const [dateOpen, setDateOpen] = useState(false);
  const [sticky, setSticky] = useState(false);
  const [apiEvent, setApiEvent] = useState(null);
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const heroRef = useRef(null);
  const ticketsRef = useRef(null);
  const dateRef = useRef(null);

  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(l);
    return () => { try { document.head.removeChild(l); } catch (e) {} };
  }, []);

  useEffect(() => {
    if (!eventSlug) return;
    let cancelled = false;
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const { event: eventData, listings: listingsData } = await ticketsService.getEventPage(eventSlug);
        if (!cancelled) {
          setApiEvent(eventData);
          setListings(listingsData || []);
        }
      } catch (err) {
        if (!cancelled) setError(t("eventTickets.errorLoading"));
        console.error("Failed to fetch event page:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [eventSlug, t]);

  useEffect(() => {
    const handler = () => {
      if (heroRef.current) setSticky(window.scrollY > heroRef.current.offsetHeight - 20);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const h = (e) => { if (dateRef.current && !dateRef.current.contains(e.target)) setDateOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const { event: EVENT, tickets: allTickets } = useMemo(
    () => buildEventAndTickets(apiEvent, listings, user?.id),
    [apiEvent, listings, user?.id]
  );

  const activeDate = EVENT?.dates?.[dateIdx];
  const selectedDateId = activeDate?.id;

  const ticketsForDate = useMemo(() => {
    if (!selectedDateId) return allTickets;
    return allTickets.filter((t) => t.eventDateId === selectedDateId);
  }, [allTickets, selectedDateId]);

  const bestPriceIds = useMemo(() => computeBestPriceBadges(ticketsForDate), [ticketsForDate]);

  const ticketsWithBadges = useMemo(
    () =>
      ticketsForDate.map((t) => ({
        ...t,
        badge: bestPriceIds.has(t.id) ? "best" : t.badge,
      })),
    [ticketsForDate, bestPriceIds]
  );

  const sectorsList = useMemo(() => {
    const sectors = [...new Set(ticketsForDate.map((t) => t.sector))].filter(Boolean).sort();
    return ["Todos", ...sectors];
  }, [ticketsForDate]);

  const filteredBySector = useMemo(() => {
    if (sector === "Todos") return ticketsWithBadges;
    return ticketsWithBadges.filter((t) => t.sector === sector);
  }, [ticketsWithBadges, sector]);

  const sorted = useMemo(() => {
    return [...filteredBySector].sort((a, b) => {
      if (sortIdx === 0) {
        if (a.verified !== b.verified) return b.verified ? 1 : -1;
        return a.priceNum - b.priceNum;
      }
      if (sortIdx === 1) return a.priceNum - b.priceNum;
      if (sortIdx === 2) return b.priceNum - a.priceNum;
      if (sortIdx === 3) return (b.verified ? 1 : 0) - (a.verified ? 1 : 0);
      return 0;
    });
  }, [filteredBySector, sortIdx]);

  const sellersCount = useMemo(() => new Set(sorted.map((t) => t.seller)).size, [sorted]);
  const minPrice = useMemo(() => (sorted.length ? Math.min(...sorted.map((t) => t.priceNum)) : 0), [sorted]);

  const sectorMin = (s) => {
    const list = s === "Todos" ? sorted : sorted.filter((t) => t.sector === s);
    if (!list.length) return null;
    return Math.min(...list.map((t) => t.priceNum));
  };

  const scrollToTickets = () => {
    ticketsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading) {
    return (
      <div style={{ ...S, background: BG, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: MUTED }}>{t("common.loading") || "Cargando..."}</p>
        </div>
      </div>
    );
  }

  if (error || !EVENT) {
    return (
      <div style={{ ...S, background: BG, minHeight: "100vh", padding: 24 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", textAlign: "center", padding: "48px 24px" }}>
          <p style={{ color: ERROR, fontSize: 16 }}>{error || t("eventTickets.eventNotFound")}</p>
          <BackButton to="/" labelKey="eventTickets.backToEvents" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...S, background: BG, color: DARK, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* Ticket grid */
        .tk-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        @media(max-width:960px){ .tk-grid{ grid-template-columns:repeat(2,1fr)!important; } }
        @media(max-width:580px){ .tk-grid{ grid-template-columns:1fr!important; } }

        /* Sector pills */
        .sec-pill { padding: 6px 14px; border-radius: 100px; border: 1.5px solid ${BORD2}; font-size: 12.5px; font-weight: 600; cursor: pointer; background: transparent; color: ${MUTED}; transition: all 0.14s; white-space: nowrap; font-family:'Plus Jakarta Sans',sans-serif; display:inline-flex; align-items:center; gap:5px; }
        .sec-pill.active { background: ${V}; border-color: ${V}; color: white; }
        .sec-pill:hover:not(.active) { border-color: ${HINT}; color: ${DARK}; }

        /* Date pills */
        .date-pill { padding: 6px 14px; border-radius: 100px; border: 1.5px solid ${BORD2}; font-size: 12.5px; font-weight: 600; cursor: pointer; background: transparent; color: ${MUTED}; transition: all 0.14s; white-space: nowrap; font-family:'Plus Jakarta Sans',sans-serif; }
        .date-pill.active { background: ${VLIGHT}; border-color: ${V}; color: ${V}; }
        .date-pill:hover:not(.active) { border-color: ${HINT}; color: ${DARK}; }

        /* Ticket card */
        .tk-card { background: white; border: 1px solid ${BORDER}; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; transition: box-shadow 0.18s, transform 0.18s; cursor: pointer; }
        .tk-card:hover { box-shadow: ${SHADOW_TICKET_HOVER}; transform: translateY(-2px); }
        .tk-card.best-opt { border: 2px solid ${V}; }

        /* Sort select */
        .sort-sel { border: 1.5px solid ${BORD2}; border-radius: 8px; padding: 7px 10px; font-size: 13px; font-family:'Plus Jakarta Sans',sans-serif; color: ${DARK}; background: white; cursor: pointer; outline: none; }

        /* Sticky bar */
        .sticky-bar { position:fixed; top:0; left:0; right:0; z-index:200; background:${SURFACE_STICKY}; backdrop-filter:blur(14px); border-bottom:1px solid ${BORDER}; transform:translateY(-100%); transition:transform 0.22s ease; }
        .sticky-bar.visible { transform:translateY(0); }

        /* CTA buy button */
        .btn-buy { background:${V}; color:white; border:none; border-radius:10px; width:100%; padding:11px 14px; font-size:13.5px; font-weight:700; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; transition:background 0.15s; display:flex; align-items:center; justify-content:center; gap:8px; }
        .btn-buy:hover { background:${V_HOVER}; }
        .btn-buy.seated { background:${BLUE}; }
        .btn-buy.seated:hover { background:${BLUE_HOVER}; }

        .pills-row::-webkit-scrollbar { height: 0; }
      `}</style>

      {/* Sticky bar */}
      <div className={`sticky-bar${sticky ? " visible" : ""}`}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: "4px 0", display: "flex", alignItems: "center", gap: 6, flexShrink: 0, ...S, fontSize: 13 }}>
              <ArrowLeft size={15} />
            </button>
            <span style={{ ...E, fontSize: 17, color: DARK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{EVENT.name}</span>
            <span style={{ color: BORD2 }}>·</span>
            <div ref={dateRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setDateOpen(!dateOpen)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, background: VLIGHT, border: `1px solid ${VL_BORDER}`, color: V, fontSize: 12.5, fontWeight: 600, cursor: "pointer", ...S, whiteSpace: "nowrap" }}
              >
                {activeDate?.label}
                <ChevronDown size={12} style={{ transform: dateOpen ? "rotate(180deg)" : "none", transition: "transform 0.14s" }} />
              </button>
              {dateOpen && EVENT.dates?.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "white", border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: SHADOW_DROP, zIndex: 300, overflow: "hidden", minWidth: 200 }}>
                  {EVENT.dates.map((d, i) => (
                    <button key={d.id} type="button" onClick={() => { setDateIdx(i); setDateOpen(false); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 14px", background: dateIdx === i ? VLIGHT : "white", border: "none", cursor: "pointer", fontSize: 13, fontWeight: dateIdx === i ? 600 : 400, color: dateIdx === i ? V : DARK, ...S }}
                    >
                      {d.label} <span style={{ fontSize: 11.5, color: MUTED }}>{d.count} entradas</span>
                      {dateIdx === i && <CheckCircle size={13} style={{ color: V }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: MUTED }}>Desde</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: V }}>{fmt(minPrice)}</span>
            <button type="button" onClick={scrollToTickets} style={{ padding: "7px 16px", borderRadius: 8, background: V, border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, ...S }}>
              Ver entradas <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 64px" }}>
        <BackButton to="/" labelKey="eventTickets.backToEvents" />

        {/* Hero: blurred event image as background only (no poster), overlay + content */}
        {/* <div ref={heroRef} className="ev-hero-wrap" style={{ border: `1px solid ${BORDER}`, borderRadius: 20, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div className="ev-hero-bg" style={{ backgroundImage: `url(${EVENT.img})` }} aria-hidden />
          <div className="ev-hero-overlay" aria-hidden />
          <div className="ev-hero-inner">
            <div className="ev-hero-content" style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 0 }}>
              <div style={{ marginBottom: 16 }}>
                <CategoryBadge label={EVENT.category} hero />
                <h1 style={{ ...E, fontSize: "clamp(24px,3vw,38px)", fontWeight: 400, lineHeight: 1.18, letterSpacing: "-0.5px", color: WHITE, margin: "10px 0 4px", textShadow: "0 1px 3px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.4)" }}>
                  {EVENT.name}
                </h1>
                {EVENT.subtitle && <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.88)", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{EVENT.subtitle}</p>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "rgba(255,255,255,0.85)", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                  <MapPin size={14} style={{ color: BLIGHT, flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: WHITE }}>{EVENT.venue}</span>
                  {EVENT.location && <><span>·</span><span>{EVENT.location}</span></>}
                </div>
              </div>
              {EVENT.dates?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, color: "rgba(255,255,255,0.75)", marginBottom: 8, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>Seleccioná una fecha</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {EVENT.dates.map((d, i) => (
                      <button key={d.id} type="button" className={`date-pill${dateIdx === i ? " active" : ""}`} onClick={() => setDateIdx(i)}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ padding: "16px 18px", background: "rgba(255, 255, 255, 0.53)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.18)", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: V, marginBottom: 4, textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>Entradas desde</p>
                    <p style={{ fontSize: 32, fontWeight: 800, color: VLIGHT, lineHeight: 1, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
                      {fmt(minPrice)} <span style={{ fontSize: 12, fontWeight: 500, color: VLIGHT }}>ARS</span>
                    </p>
                    <p style={{ fontSize: 12.5, color: V, marginTop: 4, textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
                      <span style={{ fontWeight: 600, color: V }}>{sorted.reduce((acc, t) => acc + t.qty, 0)} entradas</span> disponibles
                      {activeDate && ` · ${sellersCount} vendedor${sellersCount !== 1 ? "es" : ""}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={scrollToTickets}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 10, background: V, border: "none", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", ...S, boxShadow: SHADOW_V_SOFT, flexShrink: 0 }}
                  >
                    Ver entradas <ArrowRight size={15} />
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                {[
                  { icon: <Lock size={12} style={{ color: BLIGHT }} />, text: t("landing.trustSecurePayment") },
                  { icon: <CheckCircle size={12} style={{ color: GREEN_LIGHT }} />, text: t("eventTickets.buyerProtection") },
                  { icon: <RefreshCw size={12} style={{ color: ABORD }} />, text: t("landing.trustRefund") },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "rgba(255,255,255,0.85)", fontWeight: 500, textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
                    {icon} {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div> */}

<div ref={heroRef} style={{ borderRadius: 20, overflow: "hidden", marginBottom: 16, boxShadow: SHADOW_HERO, position: "relative" }}>

{/* Blurred background image — neutral brightness so any palette works */}
<div style={{
  position: "absolute", inset: 0, zIndex: 0,
  backgroundImage: `url(${EVENT.img})`,
  backgroundSize: "cover", backgroundPosition: "center",
  filter: "blur(22px) brightness(0.5) saturate(1.2)",
  transform: "scale(1.1)",
}} />

{/* Layer 1 — horizontal scrim */}
<div style={{
  position: "absolute", inset: 0, zIndex: 1,
  background: "linear-gradient(to right, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.22) 45%, rgba(0,0,0,0.11) 75%, rgba(0,0,0,0.08) 100%)",
}} />

{/* Layer 2 — vertical scrim */}
<div style={{
  position: "absolute", inset: 0, zIndex: 1,
  background: "linear-gradient(to bottom, rgba(0,0,0,0.22) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.38) 100%)",
}} />

{/* Content */}
<div style={{ position: "relative", zIndex: 2, padding: "clamp(24px,4vw,40px)", display: "flex", gap: "clamp(20px,3vw,36px)", alignItems: "flex-start", flexWrap: "wrap" }}>

  {/* Info — white text on dark bg */}
  <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 0 }}>

    {/* Category badge — dark pill with blur: always legible on any image */}
    <div style={{ marginBottom: 12 }}>
      <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: 100, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.18)", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", letterSpacing: "0.02em" }}>
        {EVENT.category}
      </span>
    </div>

    {/* Title — white always, no text-shadow needed with directional overlay */}
    <h1 style={{ ...E, fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 400, lineHeight: 1.15, letterSpacing: "-0.5px", color: "white", marginBottom: 6 }}>
      {EVENT.name}
    </h1>
    <p style={{ fontSize: 15, color: "rgba(255,255,255,0.78)", marginBottom: 18 }}>{EVENT.subtitle}</p>

    {/* Meta */}
    <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "rgba(255,255,255,0.7)" }}>
        <MapPin size={14} style={{ color: V_SOFT, flexShrink: 0 }} />
        <span style={{ fontWeight: 600, color: "white" }}>{EVENT.venue}</span>
        <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
        <span>{EVENT.location}</span>
      </div>
    </div>

    {/* Date selector — pill style adapted for dark */}
    <div style={{ marginBottom: 22 }}>
      <p style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: 9 }}>
        Seleccioná una fecha
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {EVENT.dates.map((d, i) => (
          <button
            key={i}
            onClick={() => setDateIdx(i)}
            style={{
              padding: "6px 14px", borderRadius: 100, fontSize: 12.5, fontWeight: 600,
              cursor: "pointer", transition: "all 0.14s", whiteSpace: "nowrap",
              border: dateIdx === i ? "1.5px solid rgba(196,181,253,0.9)" : "1.5px solid rgba(255,255,255,0.2)",
              background: dateIdx === i ? OVERLAY_V_70 : "rgba(255,255,255,0.1)",
              color: dateIdx === i ? "white" : "rgba(255,255,255,0.7)",
              backdropFilter: "blur(8px)",
              ...S,
            }}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>

    {/* Price + CTA — frosted dark glass: violet price readable on ANY image */}
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 16,
      padding: "14px 18px", borderRadius: 14, marginBottom: 20,
      background: OVERLAY_DARK_45,
      border: "1px solid rgba(255,255,255,0.12)",
      backdropFilter: "blur(12px)",
    }}>
      <div>
        <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: V_MUTED_LIGHT, marginBottom: 4 }}>
          Entradas desde
        </p>
        <p style={{ fontSize: "clamp(26px,3.5vw,36px)", fontWeight: 800, color: "white", lineHeight: 1 }}>
          {minPrice}
          <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginLeft: 6 }}>ARS</span>
        </p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 5 }}>
          <span style={{ color: V_MUTED_LIGHT, fontWeight: 600 }}>{activeDate.count} entradas</span> disponibles
        </p>
      </div>
      <button
        onClick={scrollToTickets}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 24px", borderRadius: 11, background: V, border: "none", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", ...S, boxShadow: SHADOW_V_STRONG, flexShrink: 0 }}
      >
        Ver entradas <ArrowRight size={15} />
      </button>
    </div>

    {/* Trust micro-signals — higher opacity for legibility on any image */}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.15)" }}>
      {[
        { icon: <Lock size={12} style={{ color: V_MUTED_LIGHT }} />, text: "Fondos protegidos" },
        { icon: <CheckCircle size={12} style={{ color: GREEN_LIGHT }} />, text: "Vendedores verificados" },
        { icon: <RefreshCw size={12} style={{ color: ABORD }} />, text: "Reembolso garantizado" },
      ].map(({ icon, text }) => (
        <div key={text} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.78)", fontWeight: 500 }}>
          {icon} {text}
        </div>
      ))}
    </div>
  </div>
</div>
</div>

        {/* Tickets section */}
        <div ref={ticketsRef} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 24, boxShadow: SHADOW_CARD_MD }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <div>
              <h2 style={{ ...E, fontSize: 22, fontWeight: 400, color: DARK, letterSpacing: "-0.3px" }}>Entradas disponibles</h2>
              <p style={{ fontSize: 13, color: MUTED, marginTop: 3 }}>
                {activeDate ? `${activeDate.full} · ${sorted.length} opciones` : `${sorted.length} entradas`}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: MUTED, fontWeight: 500, whiteSpace: "nowrap" }}>Ordenar</span>
              <select className="sort-sel" value={sortIdx} onChange={(e) => setSortIdx(Number(e.target.value))}>
                {SORTS.map((s, i) => <option key={i} value={i}>{s}</option>)}
              </select>
              <button type="button" className={`view-btn${gridView ? " active" : ""}`} onClick={() => setGridView(true)} title="Grilla">
                <GridIcon active={gridView} />
              </button>
              <button type="button" className={`view-btn${!gridView ? " active" : ""}`} onClick={() => setGridView(false)} title="Lista">
                <ListIcon active={!gridView} />
              </button>
            </div>
          </div>

          {sectorsList.length > 1 && (
            <div className="pills-row" style={{ display: "flex", gap: 7, overflowX: "auto", marginBottom: 20, paddingBottom: 2 }}>
              {sectorsList.map((s) => {
                const min = sectorMin(s);
                return (
                  <button key={s} type="button" className={`sec-pill${sector === s ? " active" : ""}`} onClick={() => setSector(s)}>
                    {s}
                    {min != null && s !== "Todos" && (
                      <span style={{ fontSize: 11, fontWeight: 600, opacity: sector === s ? 0.85 : 0.65 }}>{fmt(min)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {sorted.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: MUTED }}>
              <p style={{ fontSize: 15 }}>{t("eventTickets.noTicketsAvailable")}</p>
              <Link to="/sell-ticket" style={{ display: "inline-block", marginTop: 12, color: V, fontWeight: 600 }}>{t("boughtTickets.startSelling")}</Link>
            </div>
          ) : gridView ? (
            <div className="tk-grid">
              {sorted.map((t) => (
                <TicketCard key={t.id} ticket={t} eventSlug={eventSlug} />
              ))}
            </div>
          ) : (
            <div className="tk-list">
              {sorted.map((t) => (
                <TicketListRow key={t.id} ticket={t} eventSlug={eventSlug} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketCard({ ticket, eventSlug }) {
  const { t } = useTranslation();
  const { sector, seated, acceptsOffers, qty, price, seller, sellerId, sellerAvatarUrl, verified, newSeller, badge, urgency, listingId } = ticket;
  const isBest = badge === "best";
  const ctaLabel = seated ? (t("eventTickets.selectSeats") || "Elegir asientos") : "Comprar";

  return (
    <div className={`tk-card${isBest ? " best-opt" : ""}`}>
      {isBest && (
        <div style={{ background: VLIGHT, borderBottom: `1px solid ${VL_BORDER}`, padding: "7px 14px", display: "flex", alignItems: "center", gap: 7 }}>
          <Star size={12} style={{ color: V, fill: V }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: V }}>Mejor opción · Precio más bajo</span>
        </div>
      )}
      <div style={{ padding: "15px 16px 0", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: DARK }}>{sector}</p>
            <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
              {qty} entrada{qty !== 1 ? "s" : ""} · comprá 1{qty > 1 ? " o más" : ""}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Desde</p>
            <p style={{ fontSize: 19, fontWeight: 800, color: V, lineHeight: 1 }}>${price}</p>
          </div>
        </div>
        <div style={{ minHeight: 24, marginBottom: 12, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {urgency === "últimas" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 100, background: AMBER_BG_LIGHT, color: AMBER, border: `1px solid ${ABORD}`, fontSize: 11, fontWeight: 700 }}>
              <Zap size={9} /> Última{qty > 1 ? "s" : ""} {qty}
            </span>
          )}
          {seated && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 100, background: BLIGHT, color: BLUE, border: `1px solid ${BLUE_BORDER_LIGHT}`, fontSize: 11, fontWeight: 600 }}>
              Numerada
            </span>
          )}
          {acceptsOffers && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 100, background: AMBER_BG_LIGHT, color: AMBER, border: `1px solid ${ABORD}`, fontSize: 11, fontWeight: 600 }}>
              <MessageCircle size={10} /> {t("eventTickets.acceptsOffers")}
            </span>
          )}
        </div>
        <Link to={`/seller/${sellerId}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", background: SURFACE, borderRadius: 9, border: `1px solid ${BORDER}`, marginBottom: 0, textDecoration: "none" }}>
          <UserAvatar name={seller} src={sellerAvatarUrl ?? undefined} className="size-10" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: DARK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{seller}</p>
            <div style={{ marginTop: 2 }}>
              {verified ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 600, color: GREEN }}>
                  <CheckCircle size={10} /> Verificado
                </span>
              ) : newSeller ? (
                <span style={{ fontSize: 10.5, color: HINT }}>Vendedor nuevo</span>
              ) : (
                <span style={{ fontSize: 10.5, color: HINT }}>No verificado</span>
              )}
            </div>
          </div>
        </Link>
      </div>
      <div style={{ padding: "12px 16px 14px", marginTop: 12 }}>
        <Link to={`/buy/${eventSlug}/${listingId}`} className={`btn-buy${seated ? " seated" : ""}`}>
          {seated ? <MapPin size={14} /> : <ArrowRight size={14} />}
          {ctaLabel}
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <span style={{ fontSize: 11, color: HINT }}>+ 10% cargo por servicio</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: GREEN, fontWeight: 600 }}>
            <Shield size={10} style={{ color: GREEN }} /> Protegido
          </span>
        </div>
      </div>
    </div>
  );
}

function TicketListRow({ ticket, eventSlug }) {
  const { t } = useTranslation();
  const { sector, qty, price, seller, sellerId, sellerAvatarUrl, verified, badge, acceptsOffers, listingId } = ticket;
  return (
    <div className={`tk-list-row${badge === "best" ? " best-opt" : ""}`}>
      <div style={{ flex: "1 1 140px", minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: DARK }}>{sector}</p>
        <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{qty} entrada{qty > 1 ? "s" : ""} · comprá 1{qty > 1 ? " o más" : ""}</p>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
        {badge === "best" && (
          <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 100, background: VLIGHT, color: V, border: `1px solid ${VL_BORDER}`, fontSize: 11, fontWeight: 700 }}>Mejor precio</span>
        )}
        {acceptsOffers && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 100, background: AMBER_BG_LIGHT, color: AMBER, border: `1px solid ${ABORD}`, fontSize: 11, fontWeight: 600 }}>
            <MessageCircle size={10} /> {t("eventTickets.acceptsOffers")}
          </span>
        )}
      </div>
      <Link to={`/seller/${sellerId}`} style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 140px", minWidth: 0, textDecoration: "none" }}>
        <UserAvatar name={seller} src={sellerAvatarUrl ?? undefined} className="size-10" />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: DARK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{seller}</p>
          {verified ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 600, color: GREEN }}><CheckCircle size={10} /> Verificado</span> : <span style={{ fontSize: 10.5, color: HINT }}>Vendedor nuevo</span>}
        </div>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0, marginLeft: "auto" }}>
        <p style={{ fontSize: 19, fontWeight: 800, color: V, whiteSpace: "nowrap" }}>${price}</p>
        <Link to={`/buy/${eventSlug}/${listingId}`} className="btn-buy" style={{ width: "auto", padding: "9px 20px", fontSize: 13 }}>
          Comprar
        </Link>
      </div>
    </div>
  );
}

function CategoryBadge({ label, hero }) {
  if (hero) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 11px", borderRadius: 100, background: "rgba(0,0,0,0.4)", color: "rgba(255,255,255,0.95)", border: "1px solid rgba(255,255,255,0.25)", fontSize: 12, fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
        {label}
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 11px", borderRadius: 100, background: BG, color: MUTED, border: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 600 }}>
      {label}
    </span>
  );
}

function GridIcon({ active }) {
  const c = active ? V : MUTED;
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ListIcon({ active }) {
  const c = active ? V : MUTED;
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
