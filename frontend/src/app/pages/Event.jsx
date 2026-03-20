import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import {
  MapPin, CheckCircle, ChevronDown, ArrowLeft, ArrowRight,
  Lock, RefreshCw, Users, Plus, Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUser } from "@/app/contexts/UserContext";
import { ticketsService } from "@/api/services/tickets.service";
import { formatDate, formatTime } from "@/lib/format-date";
import { getInitials } from "@/lib/string-utils";
import { EventTicketCard } from "@/app/components/EventTicketCard";
import { BackButton } from "@/app/components/BackButton";
import {
  V, VLIGHT, DARK, MUTED, BORDER, BORD2, S, E,
  SURFACE_STICKY, SHADOW_DROP, BG,
} from "@/lib/design-tokens";

const SORTS = ["Precio: menor a mayor", "Precio: mayor a menor", "Solo verificados"];
const DEFAULT_IMAGE = "https://picsum.photos/seed/event/600/600";

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
      sellerTotalSales: listing.sellerReputation?.totalSales ?? 0,
      sellerTotalReviews: listing.sellerReputation?.totalReviews ?? 0,
      sellerPositivePercent: listing.sellerReputation?.positivePercent ?? null,
      verified,
      newSeller: badges.some((b) => String(b).toLowerCase().includes("new")),
      badge: null,
      urgency: available === 1 ? "últimas" : null,
    };
  });

  return { event, tickets };
}


export default function EventDetail() {
  const { t } = useTranslation();
  const { eventSlug } = useParams();
  const { user } = useUser();
  const [dateIdx, setDateIdx] = useState(0);
  const [sector, setSector] = useState("Todos");
  const [sortIdx, setSortIdx] = useState(0);
  const [dateOpen, setDateOpen] = useState(false);
  const [sticky, setSticky] = useState(false);
  const [apiEvent, setApiEvent] = useState(null);
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertPhone, setAlertPhone] = useState("");
  const [alertSent, setAlertSent] = useState(false);
  const [alertError, setAlertError] = useState(false);
  const waitingCount = 0; // TODO: proveer desde el backend
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

  const sectorsList = useMemo(() => {
    const sectors = [...new Set(ticketsForDate.map((t) => t.sector))].filter(Boolean).sort();
    return ["Todos", ...sectors];
  }, [ticketsForDate]);

  const filteredBySector = useMemo(() => {
    if (sector === "Todos") return ticketsForDate;
    return ticketsForDate.filter((t) => t.sector === sector);
  }, [ticketsForDate, sector]);

  const sorted = useMemo(() => {
    return [...filteredBySector].sort((a, b) => {
      if (sortIdx === 0) return a.priceNum - b.priceNum;
      if (sortIdx === 1) return b.priceNum - a.priceNum;
      if (sortIdx === 2) return (b.verified ? 1 : 0) - (a.verified ? 1 : 0);
      return 0;
    });
  }, [filteredBySector, sortIdx]);

  const minPrice = useMemo(() => (sorted.length ? Math.min(...sorted.map((t) => t.priceNum)) : 0), [sorted]);

  const sectorMin = (s) => {
    const list = s === "Todos" ? sorted : sorted.filter((t) => t.sector === s);
    if (!list.length) return null;
    return Math.min(...list.map((t) => t.priceNum));
  };

  const scrollToTickets = () => {
    ticketsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  function handleAlert() {
    const val = alertPhone.trim();
    const isPhone = /^\+549\d{10}$/.test(val.replace(/\s/g, ""));
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    if (!val || (!isPhone && !isEmail)) { setAlertError(true); return; }
    setAlertError(false);
    setAlertSent(true);
    // TODO: llamar al endpoint de waiting list con alertPhone y eventSlug
  }

  if (isLoading) {
    return (
      <div style={{ ...S, backgroundColor: BG, color: DARK, minHeight: "100vh" }}>
        <style>{`
          @keyframes evSkShimmer {
            from { background-position: -600px 0; }
            to   { background-position:  600px 0; }
          }
          .ev-sk {
            background: linear-gradient(90deg, #e8e8e5 25%, #f0f0ed 50%, #e8e8e5 75%);
            background-size: 600px 100%;
            animation: evSkShimmer 1.4s ease-in-out infinite;
            border-radius: 6px;
          }
          .ev-sk-dark {
            background: linear-gradient(90deg, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0.08) 75%);
            background-size: 600px 100%;
            animation: evSkShimmer 1.4s ease-in-out infinite;
            border-radius: 6px;
          }
        `}</style>

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 64px" }}>

          {/* Back button skeleton */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
            <div className="ev-sk" style={{ height: 13, width: 13, borderRadius: 3 }} />
            <div className="ev-sk" style={{ height: 13, width: 48 }} />
          </div>

          {/* Hero skeleton */}
          <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 14, background: "#2a2a3a", minHeight: 320, padding: "clamp(28px,4vw,44px)" }}>
            {/* Category badge */}
            <div className="ev-sk-dark" style={{ height: 20, width: 72, borderRadius: 100, marginBottom: 16 }} />
            {/* Title */}
            <div className="ev-sk-dark" style={{ height: 36, width: "72%", marginBottom: 10 }} />
            <div className="ev-sk-dark" style={{ height: 36, width: "48%", marginBottom: 18 }} />
            {/* Venue */}
            <div className="ev-sk-dark" style={{ height: 13, width: "55%", marginBottom: 24 }} />
            {/* Date pills */}
            <div style={{ marginBottom: 18 }}>
              <div className="ev-sk-dark" style={{ height: 10, width: 110, marginBottom: 10 }} />
              <div style={{ display: "flex", gap: 7 }}>
                <div className="ev-sk-dark" style={{ height: 28, width: 80, borderRadius: 100 }} />
                <div className="ev-sk-dark" style={{ height: 28, width: 95, borderRadius: 100 }} />
              </div>
            </div>
            {/* Stock line */}
            <div className="ev-sk-dark" style={{ height: 12, width: "42%", marginBottom: 22 }} />
            {/* Trust row */}
            <div style={{ display: "flex", gap: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
              <div className="ev-sk-dark" style={{ height: 11, width: 90 }} />
              <div className="ev-sk-dark" style={{ height: 11, width: 106 }} />
              <div className="ev-sk-dark" style={{ height: 11, width: 84 }} />
            </div>
          </div>

          {/* Section header skeleton */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <div>
              <div className="ev-sk" style={{ height: 22, width: 160, marginBottom: 6 }} />
              <div className="ev-sk" style={{ height: 11, width: 110 }} />
            </div>
            <div className="ev-sk" style={{ height: 34, width: 96, borderRadius: 10 }} />
          </div>

          {/* Filter pills skeleton */}
          <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
            {[52, 68, 60].map((w, i) => (
              <div key={i} className="ev-sk" style={{ height: 28, width: w, borderRadius: 100 }} />
            ))}
          </div>

          {/* Ticket grid skeleton */}
          <div className="tk-grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ background: "white", borderRadius: 14, padding: 16, border: `1px solid ${BORDER}` }}>
                <div className="ev-sk" style={{ height: 11, width: "55%", marginBottom: 8 }} />
                <div className="ev-sk" style={{ height: 22, width: "40%", marginBottom: 10 }} />
                <div className="ev-sk" style={{ height: 10, width: "75%", marginBottom: 6 }} />
                <div className="ev-sk" style={{ height: 10, width: "60%", marginBottom: 14 }} />
                <div className="ev-sk" style={{ height: 36, width: "100%", borderRadius: 9 }} />
              </div>
            ))}
          </div>

        </div>
      </div>
    );
  }

  if (error || !EVENT) {
    return (
      <div style={{ ...S, backgroundColor: BG, minHeight: "100vh", padding: 24 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", textAlign: "center", padding: "48px 24px" }}>
          <p style={{ color: "#b91c1c", fontSize: 16 }}>{error || t("eventTickets.eventNotFound")}</p>
          <Link to="/" style={{ display: "inline-block", marginTop: 12, color: V, fontWeight: 600, ...S }}>
            ← Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...S, backgroundColor: BG, color: DARK, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* Unified ticket grid — 2 cols desktop, 1 col mobile */
        .tk-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        @media(max-width: 768px) { .tk-grid { grid-template-columns: 1fr; } }

        /* Sector filter pills */
        .sec-pill {
          padding: 6px 14px; border-radius: 100px;
          border: 1.5px solid #d1d5db;
          font-size: 12.5px; font-weight: 600; cursor: pointer;
          background: transparent; color: #6b7280;
          transition: all 0.14s; white-space: nowrap;
          font-family: 'Plus Jakarta Sans', sans-serif;
          display: inline-flex; align-items: center; gap: 5px;
        }
        .sec-pill.active { background: #6d28d9; border-color: #6d28d9; color: white; }
        .sec-pill:hover:not(.active) { border-color: #9ca3af; color: #0f0f1a; }

        /* Sort select */
        .sort-sel {
          border: 1px solid #e5e7eb; border-radius: 10px;
          padding: 6px 10px; font-size: 13px; font-weight: 500;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: #0f0f1a; background: white; cursor: pointer; outline: none;
        }
        .sort-sel:focus { border-color: #6d28d9; box-shadow: 0 0 0 2px rgba(109,40,217,0.1); }

        /* Sticky bar */
        .sticky-bar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          background: rgba(243,243,240,0.97);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid #e5e7eb;
          transform: translateY(-100%); transition: transform 0.22s ease;
        }
        .sticky-bar.visible { transform: translateY(0); }
        @media(max-width: 600px) { .sticky-price-cta { display: none !important; } }

        /* Empty state — full-width card matching hero */
        .empty-state-wrap { padding: 18px 0 48px; }
        .empty-state-card { border-radius: 20px; }
        @media(max-width: 600px) {
          .empty-state-wrap { padding: 24px 0; }
        }

        .pills-row::-webkit-scrollbar { height: 0; }

        /* Card fade-up on load */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Sticky bar ── */}
      <div className={`sticky-bar${sticky ? " visible" : ""}`}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
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
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, background: "white", border: `1px solid ${BORD2}`, color: DARK, fontSize: 12.5, fontWeight: 600, cursor: "pointer", ...S, whiteSpace: "nowrap" }}
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
          <div className="sticky-price-cta" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: MUTED }}>Desde</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: V }}>{fmt(minPrice)}</span>
            <button type="button" onClick={scrollToTickets} style={{ padding: "7px 16px", borderRadius: 8, background: V, border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, ...S }}>
              Ver entradas <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 64px" }}>

        <BackButton to="/" />

        {/* ── Hero Box — dark interior floats over warm bg ── */}
        <div
          ref={heroRef}
          style={{
            borderRadius: 20, overflow: "hidden",
            marginBottom: 14,
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            position: "relative", minHeight: 320,
          }}
        >
          {/* Blurred background image */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 0,
            backgroundImage: `url(${EVENT.img})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(12px) brightness(0.6) saturate(1.2)",
            transform: "scale(1.1)",
          }} />

          {/* Dark overlay — left-heavy per spec */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 1,
            background: "linear-gradient(to right, rgba(15,15,26,0.65) 0%, rgba(15,15,26,0.38) 45%, rgba(15,15,26,0.05) 100%)",
          }} />

          {/* Hero content */}
          <div style={{ position: "relative", zIndex: 2, padding: "clamp(28px,4vw,44px)", maxWidth: 640, display: "flex", flexDirection: "column" }}>

            {/* Category badge */}
            <div style={{ marginBottom: 14 }}>
              <span style={{
                display: "inline-flex", alignItems: "center",
                padding: "4px 12px", borderRadius: 100,
                background: "rgba(109,40,217,0.75)",
                backdropFilter: "blur(8px)",
                color: "white",
                fontSize: 11, fontWeight: 700,
                letterSpacing: "0.07em", textTransform: "uppercase",
              }}>
                {EVENT.category}
              </span>
            </div>

            {/* Title */}
            <h1 style={{ ...E, fontSize: "clamp(30px,3.6vw,46px)", fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.5px", color: "white", marginBottom: 10 }}>
              {EVENT.name}
            </h1>

            {/* Venue + location */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 500, color: "rgba(255,255,255,0.65)", marginBottom: 24 }}>
              <MapPin size={14} style={{ color: "rgba(255,255,255,0.65)", flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: "white" }}>{EVENT.venue}</span>
              {EVENT.location && (
                <>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
                  <span>{EVENT.location}</span>
                </>
              )}
            </div>

            {/* Date selector pills */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: 9, ...S }}>
                Seleccioná una fecha
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {EVENT.dates.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => setDateIdx(i)}
                    style={{
                      padding: "6px 14px", borderRadius: 100,
                      fontSize: 12.5, fontWeight: 600,
                      cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                      ...S,
                      border: dateIdx === i ? "1.5px solid #6d28d9" : "1.5px solid rgba(255,255,255,0.2)",
                      background: dateIdx === i ? "#6d28d9" : "transparent",
                      color: dateIdx === i ? "white" : "rgba(255,255,255,0.65)",
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock summary — replaces "Ver entradas" CTA */}
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 20 }}>
              {activeDate?.count > 0
                ? `${activeDate.count} entradas disponibles · desde ${fmt(minPrice)} ARS`
                : "Sin entradas disponibles por ahora"}
            </p>

            {/* Trust micro-signals */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.15)" }}>
              {[
                { icon: <Lock size={12} style={{ color: "#a78bfa" }} />, text: "Fondos protegidos" },
                { icon: <CheckCircle size={12} style={{ color: "#a78bfa" }} />, text: "Vendedores verificados" },
                { icon: <RefreshCw size={12} style={{ color: "#a78bfa" }} />, text: "Reembolso garantizado" },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
                  {icon} {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Listing header ── */}
        <div ref={ticketsRef} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div>
            <h2 style={{ ...E, fontSize: 24, fontWeight: 400, color: DARK, letterSpacing: "-0.3px" }}>
              Entradas disponibles
            </h2>
            <p style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>
              {activeDate ? `${activeDate.full} · ${sorted.length} opciones` : `${sorted.length} entradas`}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: MUTED, fontWeight: 500, whiteSpace: "nowrap" }}>Ordenar</span>
            <select className="sort-sel" value={sortIdx} onChange={(e) => setSortIdx(Number(e.target.value))}>
              {SORTS.map((s, i) => <option key={i} value={i}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* ── Filter pills ── */}
        {sectorsList.length > 1 && (
          <div className="pills-row" style={{ display: "flex", gap: 7, overflowX: "auto", marginBottom: 14, paddingBottom: 2 }}>
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

        {/* ── Ticket grid / empty state ── */}
        {sorted.length === 0 ? (
          <div className="empty-state-wrap" style={{ textAlign: "center" }}>
            <div className="empty-state-card" style={{ background: "white", border: "1px solid #e5e7eb", padding: "40px 32px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              {waitingCount >= 1 && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: 100, fontSize: 11.5, fontWeight: 600, padding: "3px 10px", marginBottom: 16 }}>
                  <Users size={10} /> {waitingCount} personas esperando entradas
                </div>
              )}
              <p style={{ ...E, fontSize: 17, color: DARK, marginBottom: 6, letterSpacing: "-0.2px" }}>
                Sin entradas disponibles por ahora
              </p>
              <p style={{ ...S, fontSize: 13.5, color: MUTED, lineHeight: 1.6, maxWidth: 340, margin: "0 auto 24px" }}>
                Avisanos y te notificamos en cuanto aparezca una entrada para este evento.
              </p>
              {alertSent ? (
                <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "14px 18px", maxWidth: 380, margin: "0 auto 24px", display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left" }}>
                  <CheckCircle size={16} style={{ color: "#16a34a", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ ...S, fontSize: 13, fontWeight: 700, color: "#166534", marginBottom: 2 }}>¡Alerta activada!</p>
                    <p style={{ ...S, fontSize: 12, color: "#15803d", lineHeight: 1.5 }}>Te avisamos cuando haya entradas disponibles.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8, maxWidth: 380, margin: "0 auto 6px" }}>
                    <input
                      type="text"
                      placeholder="Tu WhatsApp o email"
                      value={alertPhone}
                      onChange={(e) => { setAlertPhone(e.target.value); setAlertError(false); }}
                      style={{ flex: 1, ...S, fontSize: 13.5, fontWeight: 500, padding: "10px 14px", border: `1.5px solid ${alertError ? "#e11d48" : "#d1d5db"}`, borderRadius: 10, color: DARK, background: BG, outline: "none" }}
                    />
                    <button onClick={handleAlert} style={{ ...S, fontSize: 13, fontWeight: 700, background: V, color: "white", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", boxShadow: "0 4px 14px rgba(109,40,217,0.28)", whiteSpace: "nowrap" }}>
                      Avisarme →
                    </button>
                  </div>
                  {alertError && (
                    <p style={{ ...S, fontSize: 11.5, color: "#e11d48", marginBottom: 4, textAlign: "center" }}>
                      Ingresá un email válido o teléfono con formato +549...
                    </p>
                  )}
                  <p style={{ ...S, fontSize: 11.5, color: "#9ca3af", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <Lock size={10} /> Sin spam. Solo te escribimos si hay entradas.
                  </p>
                </>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, color: "#d1d5db" }}>
                <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                <span style={{ ...S, fontSize: 12 }}>o si tenés entradas</span>
                <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
              </div>
              {waitingCount === 0 && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: VLIGHT, color: V, border: "1.5px solid #c4b5fd", borderRadius: 100, fontSize: 11.5, fontWeight: 600, padding: "3px 10px", marginBottom: 12 }}>
                  <Zap size={10} /> Sé el primero en publicar para este evento
                </div>
              )}
              <div>
                <Link
                  to="/sell-ticket"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, ...S, fontSize: 13, fontWeight: 700, color: V, border: "1.5px solid #6d28d9", borderRadius: 10, padding: "10px 20px", textDecoration: "none", background: "transparent" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = VLIGHT}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <Plus size={13} /> Publicar mi entrada
                </Link>
                <p style={{ ...S, fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
                  {waitingCount >= 1 ? `Llegá a las ${waitingCount} personas que están esperando` : "Llegá a los primeros compradores del evento"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="tk-grid">
            {sorted.map((tkt, idx) => (
              <div
                key={tkt.id}
                style={{ animation: "fadeUp 0.35s ease both", animationDelay: `${idx * 40}ms`, height: "100%" }}
              >
                <EventTicketCard ticket={tkt} eventSlug={eventSlug} />
              </div>
            ))}
          </div>
        )}

        {/* ── Sell banner — solo cuando hay entradas listadas ── */}
        {sorted.length > 0 && <div style={{
          marginTop: 36,
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: "24px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <div>
            <p style={{ ...E, fontSize: 18, letterSpacing: "-0.3px", color: DARK, marginBottom: 4 }}>
              ¿Tenés entradas para este evento?
            </p>
            <p style={{ fontSize: 13, color: MUTED }}>
              Publicá en minutos y llegá a miles de compradores.
            </p>
          </div>
          <Link
            to="/sell-ticket"
            style={{
              display: "inline-block",
              ...S,
              fontSize: 13, fontWeight: 700, color: V,
              border: "1.5px solid #6d28d9",
              borderRadius: 10,
              padding: "10px 20px",
              background: "transparent",
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f0ebff")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Publicar mi entrada →
          </Link>
        </div>}
      </div>
    </div>
  );
}
