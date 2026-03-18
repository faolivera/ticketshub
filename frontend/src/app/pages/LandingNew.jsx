import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { eventsService } from "@/api/services/events.service";
import { formatDate } from "@/lib/format-date";
import {
  V,
  VLIGHT,
  BLUE,
  BLIGHT,
  DARK,
  MUTED,
  BG,
  CARD,
  BORDER,
  BORD2,
  S,
  E,
  TRUST_ESCROW,
  TRUST_ESCROW_BG,
  TRUST_VERIFIED,
  TRUST_VERIFIED_BG,
  AMBER_c1,
  ABG,
  AMBER,
  ABORD,
  AMBER_BG_LIGHT,
  ERROR,
  BADGE_DEMAND_BG,
  ERROR_DARK,
  BADGE_DEMAND_BORDER,
  SHADOW_CARD_HOVER,
  SHADOW_CARD_SM,
  SHADOW_DROP_LG,
  SHADOW_CARD_MD,
  GRADIENT_CARD_TOP,
  OVERLAY_V_STRONG,
  OVERLAY_DARK_45,
  V_SOFT,
  V_FOCUS_RING,
} from "@/lib/design-tokens";
import { HighlightedEventsHero } from "@/app/components/home/HighlightedEventsHero";
import { ShieldSVG, MapSVG } from "@/app/components/site/SiteBrandIcons";
import { Search, ArrowRight, Zap, TrendingUp, ChevronDown, Check, Lock, CheckCircle, RefreshCw, Calendar, SlidersHorizontal } from "lucide-react";

const DEFAULT_IMAGE = "https://picsum.photos/seed/event/600/600";

/**
 * Transform API event to card shape. Dates are approved only, formatted as "DD Mon · HH:mm".
 */
function eventToCardShape(apiEvent) {
  const approvedDates = (apiEvent.dates || []).filter((d) => d.status === "approved");
  const datesFormatted = approvedDates.map((d) => {
    const dateStr = typeof d.date === "string" ? d.date : d.date;
    return formatDate(dateStr, { month: "short", day: "numeric" });
  });
  const img =
    apiEvent.bannerUrls?.rectangle ||
    apiEvent.bannerUrls?.square ||
    apiEvent.images?.[0]?.src ||
    DEFAULT_IMAGE;
  return {
    id: apiEvent.id,
    slug: apiEvent.slug,
    name: apiEvent.name || "",
    venue: apiEvent.venue || "",
    city: apiEvent.location?.city || "",
    dates: datesFormatted,
    img,
    price: null,
    available: null,
    badge: null,
    category: apiEvent.category,
  };
}

const CATS   = ["Todos","Recital","Festival","Teatro","Deportes","Electrónica"];
/** Maps landing pill label to API EventCategory */
const CAT_TO_API = {
  Recital: "Concert",
  Festival: "Festival",
  Teatro: "Theater",
  Deportes: "Sports",
  Electrónica: "Other",
};
const CITIES = ["Todas las ciudades","Buenos Aires","Córdoba","Rosario","Mendoza","La Plata","Tucumán"];
const TRUST = [
  {
    Icon: Lock,
    title: "Fondos protegidos",
    desc: "Tu plata está protegida hasta que tenés tu entrada en mano. No antes.",
    color: TRUST_ESCROW,
    bg: TRUST_ESCROW_BG,
  },
  {
    Icon: CheckCircle,
    title: "Vendedores verificados",
    desc: "Cada entrada pasa por nuestro proceso de validación antes de publicarse.",
    color: TRUST_VERIFIED,
    bg: TRUST_VERIFIED_BG,
  },
  {
    Icon: RefreshCw,
    title: "Garantía total",
    desc: "Si el evento no ocurre o la entrada es inválida, devolvemos el 100% de tu dinero.",
    color: AMBER_c1,
    bg: ABG,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
export default function TicketsHub() {
  const { t } = useTranslation();
  const [activeCat,   setActiveCat]  = useState("Todos");
  const [activeCity,  setActiveCity] = useState("Todas las ciudades");
  const [cityOpen,    setCityOpen]   = useState(false);
  const [citySearch,  setCitySearch] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [query,       setQuery]      = useState("");
  const [hoveredCard,    setHovered]       = useState(null);
  const [events,         setEvents]        = useState([]);
  const [isLoading,      setIsLoading]     = useState(true);
  const [isLoadingMore,  setIsLoadingMore] = useState(false);
  const [error,          setError]         = useState(null);
  const [offset,         setOffset]        = useState(0);
  const [hasMore,        setHasMore]       = useState(true);
  const cityRefDesktop = useRef(null);
  const cityRefMobile = useRef(null);

  const PAGE_SIZE = 12;

  useEffect(() => {
    let cancelled = false;
    async function fetchEvents() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await eventsService.listEvents({ limit: PAGE_SIZE, offset: 0 });
        const list = Array.isArray(data) ? data : [];
        if (!cancelled) {
          setEvents(list);
          setOffset(list.length);
          setHasMore(list.length === PAGE_SIZE);
        }
      } catch (err) {
        if (!cancelled) setError(t("landing.errorLoadingEvents"));
        console.error("Failed to fetch events:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchEvents();
    return () => { cancelled = true; };
  }, [t]);

  async function handleLoadMore() {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const data = await eventsService.listEvents({ limit: PAGE_SIZE, offset });
      const newBatch = Array.isArray(data) ? data : [];
      setEvents((prev) => [...prev, ...newBatch]);
      setOffset((prev) => prev + newBatch.length);
      setHasMore(newBatch.length === PAGE_SIZE);
    } catch (err) {
      console.error("Failed to load more events:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    const l = document.createElement("link");
    l.rel  = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(l);
    return () => { try { document.head.removeChild(l); } catch(e){} };
  }, []);

  useEffect(() => {
    const h = (e) => {
      const inDesk = cityRefDesktop.current?.contains(e.target);
      const inMob = cityRefMobile.current?.contains(e.target);
      if (inDesk || inMob) return;
      setCityOpen(false);
      setCitySearch("");
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filteredCities = CITIES.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));

  const filtered = useMemo(() => {
    const searchLower = (query || "").trim().toLowerCase();
    return events
      .filter((e) => {
        if (activeCity !== "Todas las ciudades") {
          const c = (e.location?.city || "").trim();
          if (c !== activeCity) return false;
        }
        if (activeCat !== "Todos") {
          const apiCat = CAT_TO_API[activeCat];
          if (apiCat && e.category !== apiCat) return false;
        }
        if (!searchLower) return true;
        const name = (e.name || "").toLowerCase();
        const venue = (e.venue || "").toLowerCase();
        const city = (e.location?.city || "").toLowerCase();
        const description = (e.description || "").toLowerCase();
        return name.includes(searchLower) || venue.includes(searchLower) || city.includes(searchLower) || description.includes(searchLower);
      })
      .map(eventToCardShape);
  }, [events, query, activeCity, activeCat]);

  const catPill = (active) => ({
    display:"inline-flex", alignItems:"center",
    padding:"5px 13px", borderRadius:100, fontSize:12.5,
    fontWeight:600, cursor:"pointer",
    border:`1.5px solid ${active ? V : BORD2}`,
    background: active ? V : "transparent",
    color: active ? "white" : MUTED,
    transition:"all 0.14s", whiteSpace:"nowrap",
    outline:"none", ...S,
  });

  return (
    <div style={{ ...S, background:BG, color:DARK, minHeight:"100vh", overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .th-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
        @media(max-width:1100px){ .th-grid{ grid-template-columns:repeat(3,1fr)!important; } }
        @media(max-width:680px) { .th-grid{ grid-template-columns:1fr!important; } }
        .th-hero-wrap { display:flex; align-items:center; gap:40px; }
        @media(max-width:820px){ .th-hero-wrap{ flex-direction:column; gap:20px; } .th-hero-img{ display:none!important; } }
        .th-search-bar { display:flex; align-items:center; gap:0; flex:1; }
        @media(max-width:860px){ .th-filter-wrap{ flex-direction:column; align-items:stretch!important; gap:10px!important; } }
        @media(min-width:769px){ .th-mob-btn{ display:none!important; } .th-mob-only{ display:none!important; } }
        @media(max-width:768px){ .th-desk-only{ display:none!important; } }
        .th-frow::-webkit-scrollbar{ height:0; }
        .th-city-opt:hover{ background:${BG}!important; }
        input:focus{ border-color:${V}!important; box-shadow:${V_FOCUS_RING}!important; outline:none; }
        .th-card-btn:hover{ background:${V}!important; border-color:${V}!important; color:white!important; }
        .th-date-pill:hover{ border-color:${V}!important; color:${V}!important; background:${VLIGHT}!important; }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      {/* ══════ PAGE BODY ══════ */}
      <div style={{ maxWidth:1280, margin:"0 auto", padding:"24px 24px 0" }}>

        {/* ── HERO BOX ── */}
        <HighlightedEventsHero />

        {/* ── SEARCH + FILTERS BOX ── */}
        <div style={{
          background:CARD, borderRadius:16,
          border:`1px solid ${BORDER}`,
          boxShadow: SHADOW_CARD_MD,
          padding:"14px 18px",
          marginBottom:28,
        }}>
          {/* Desktop: unchanged layout (hidden ≤768px) */}
          <div className="th-desk-only" style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap", width:"100%" }}>
            <div style={{ position:"relative", flex:"1 1 220px", minWidth:0 }}>
              <Search size={15} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:MUTED, pointerEvents:"none" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("landing.searchPlaceholder")}
                style={{ width:"100%", padding:"9px 12px 9px 36px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13.5, color:DARK, background:BG, transition:"border-color 0.18s, box-shadow 0.18s", ...S }}
              />
            </div>
            <div style={{ width:1, height:28, background:BORD2, flexShrink:0 }} />
            <div ref={cityRefDesktop} style={{ position:"relative", flexShrink:0 }}>
              <button
                type="button"
                onClick={() => { setCityOpen(!cityOpen); setCitySearch(""); }}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderRadius:9, background:cityOpen ? VLIGHT : BG, border:`1.5px solid ${cityOpen ? V : BORDER}`, cursor:"pointer", ...S, fontSize:13, fontWeight:600, color:activeCity==="Todas las ciudades" ? MUTED : DARK, transition:"all 0.14s", whiteSpace:"nowrap" }}
              >
                <MapSVG size={13} color={activeCity==="Todas las ciudades" ? MUTED : BLUE} />
                {activeCity==="Todas las ciudades" ? t("landing.cityLabel") : activeCity}
                <ChevronDown size={12} style={{ color:MUTED, transform:cityOpen?"rotate(180deg)":"none", transition:"transform 0.14s" }} />
              </button>
              {cityOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, background:"white", border:`1px solid ${BORDER}`, borderRadius:12, boxShadow: SHADOW_DROP_LG, minWidth:210, zIndex:200, overflow:"hidden" }}>
                  <div style={{ padding:"9px 9px 7px", borderBottom:`1px solid ${BORDER}` }}>
                    <div style={{ position:"relative" }}>
                      <Search size={12} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:MUTED }} />
                      <input autoFocus value={citySearch} onChange={(e) => setCitySearch(e.target.value)} placeholder={t("landing.searchCityPlaceholder")} style={{ width:"100%", padding:"6px 8px 6px 27px", border:`1px solid ${BORDER}`, borderRadius:7, fontSize:13, color:DARK, background:BG, ...S }} />
                    </div>
                  </div>
                  <div style={{ maxHeight:185, overflowY:"auto" }}>
                    {filteredCities.map((city) => (
                      <button key={city} type="button" className="th-city-opt"
                        onClick={() => { setActiveCity(city); setCityOpen(false); setCitySearch(""); }}
                        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"9px 13px", background:activeCity===city?VLIGHT:"white", border:"none", cursor:"pointer", textAlign:"left", fontSize:13, fontWeight:activeCity===city?600:400, color:activeCity===city?V:DARK, transition:"background 0.1s", ...S }}
                      >
                        {city}
                        {activeCity===city && <Check size={12} style={{ color:V }} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ width:1, height:28, background:BORD2, flexShrink:0 }} />
            <div className="th-frow" style={{ display:"flex", alignItems:"center", gap:6, overflowX:"auto", flex:"0 1 auto" }}>
              {CATS.map((c) => (
                <button key={c} type="button" onClick={() => setActiveCat(c)} style={catPill(activeCat===c)}>{c}</button>
              ))}
            </div>
          </div>

          {/* Mobile: search + filters button; panel expands below */}
          <div className="th-mob-only" style={{ width:"100%" }}>
            <div style={{ display:"flex", alignItems:"stretch", gap:10, width:"100%" }}>
              <div style={{ position:"relative", flex:1, minWidth:0 }}>
                <Search size={15} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:MUTED, pointerEvents:"none" }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("landing.searchPlaceholder")}
                  style={{ width:"100%", minHeight:44, padding:"10px 12px 10px 36px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:15, color:DARK, background:BG, transition:"border-color 0.18s, box-shadow 0.18s", ...S }}
                />
              </div>
              <button
                type="button"
                aria-label={t("landing.filters")}
                aria-expanded={mobileFiltersOpen}
                onClick={() => setMobileFiltersOpen((o) => !o)}
                style={{
                  display:"flex", alignItems:"center", justifyContent:"center",
                  flexShrink:0, width:44, minWidth:44, minHeight:44, padding:0, borderRadius:10,
                  border:`1.5px solid ${mobileFiltersOpen ? V : BORDER}`,
                  background: mobileFiltersOpen ? VLIGHT : BG,
                  color: mobileFiltersOpen ? V : DARK,
                  cursor:"pointer", ...S,
                }}
              >
                <SlidersHorizontal size={20} strokeWidth={2.2} aria-hidden />
              </button>
            </div>
            {mobileFiltersOpen && (
              <div
                style={{
                  marginTop:14,
                  paddingTop:14,
                  borderTop:`1px solid ${BORDER}`,
                  display:"flex",
                  flexDirection:"column",
                  gap:18,
                }}
              >
                <div>
                  <span style={{ display:"block", fontSize:12, fontWeight:700, color:MUTED, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:8 }}>
                    {t("landing.cityLabel")}
                  </span>
                  <div ref={cityRefMobile} style={{ position:"relative", width:"100%" }}>
                    <button
                      type="button"
                      onClick={() => { setCityOpen(!cityOpen); setCitySearch(""); }}
                      style={{
                        display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", minHeight:48,
                        gap:10, padding:"10px 14px", borderRadius:10,
                        background:cityOpen ? VLIGHT : BG, border:`1.5px solid ${cityOpen ? V : BORDER}`,
                        cursor:"pointer", ...S, fontSize:15, fontWeight:600, color:activeCity==="Todas las ciudades" ? MUTED : DARK,
                      }}
                    >
                      <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <MapSVG size={16} color={activeCity==="Todas las ciudades" ? MUTED : BLUE} />
                        {activeCity==="Todas las ciudades" ? t("landing.cityLabel") : activeCity}
                      </span>
                      <ChevronDown size={18} style={{ color:MUTED, flexShrink:0, transform:cityOpen?"rotate(180deg)":"none", transition:"transform 0.14s" }} />
                    </button>
                    {cityOpen && (
                      <div style={{
                        position:"absolute", top:"calc(100% + 6px)", left:0, right:0,
                        background:"white", border:`1px solid ${BORDER}`, borderRadius:12,
                        boxShadow: SHADOW_DROP_LG, zIndex:200, overflow:"hidden", maxHeight:260,
                        display:"flex", flexDirection:"column",
                      }}>
                        <div style={{ padding:10, borderBottom:`1px solid ${BORDER}`, flexShrink:0 }}>
                          <div style={{ position:"relative" }}>
                            <Search size={14} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:MUTED }} />
                            <input
                              autoFocus
                              value={citySearch}
                              onChange={(e) => setCitySearch(e.target.value)}
                              placeholder={t("landing.searchCityPlaceholder")}
                              style={{ width:"100%", minHeight:44, padding:"8px 10px 8px 32px", border:`1px solid ${BORDER}`, borderRadius:8, fontSize:15, color:DARK, background:BG, ...S }}
                            />
                          </div>
                        </div>
                        <div style={{ overflowY:"auto", flex:1, WebkitOverflowScrolling:"touch" }}>
                          {filteredCities.map((city) => (
                            <button
                              key={city}
                              type="button"
                              className="th-city-opt"
                              onClick={() => { setActiveCity(city); setCityOpen(false); setCitySearch(""); }}
                              style={{
                                display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%",
                                minHeight:48, padding:"12px 14px", background:activeCity===city?VLIGHT:"white",
                                border:"none", borderBottom:`1px solid ${BORDER}`, cursor:"pointer", textAlign:"left",
                                fontSize:15, fontWeight:activeCity===city?600:500, color:activeCity===city?V:DARK, ...S,
                              }}
                            >
                              {city}
                              {activeCity===city && <Check size={16} style={{ color:V }} />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <span style={{ display:"block", fontSize:12, fontWeight:700, color:MUTED, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:10 }}>
                    {t("landing.eventTypeLabel")}
                  </span>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {CATS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setActiveCat(c)}
                        style={{
                          ...catPill(activeCat===c),
                          padding:"10px 16px",
                          fontSize:14,
                          minHeight:44,
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>{/* end maxWidth wrapper */}

      {/* ══════ EVENTS GRID ══════ */}
      <div id="eventos" style={{ maxWidth:1280, margin:"0 auto", padding:"0 24px 56px" }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
          <h2 style={{ ...E, fontSize:24, color:DARK, letterSpacing:"-0.3px" }}>Entradas disponibles</h2>
          {!isLoading && !error && <span style={{ color:MUTED, fontSize:13 }}>{filtered.length} evento{filtered.length !== 1 ? "s" : ""}</span>}
        </div>

        {error ? (
          <div style={{ textAlign:"center", padding:"56px 24px", color: ERROR }}>
            <p style={{ fontSize:14 }}>{error}</p>
          </div>
        ) : isLoading ? (
          <div style={{ textAlign:"center", padding:"56px 24px", color:MUTED }}>
            <p style={{ fontSize:14 }}>{t("landing.loadingEvents") || "Cargando eventos..."}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"56px 0", color:MUTED }}>
            <Search size={32} style={{ margin:"0 auto 12px", opacity:0.3, display:"block" }} />
            <p style={{ fontSize:14 }}>{query.trim() ? "No encontramos eventos con esa búsqueda." : "No hay eventos disponibles."}</p>
          </div>
        ) : (
          <>
            <div className="th-grid">
              {filtered.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} hovered={hoveredCard === event.id} onHover={setHovered} />
              ))}
            </div>

            {/* Load more button — only shown when not filtering and there are more pages */}
            {!query.trim() && (hasMore || isLoadingMore) && (
              <div style={{ display:"flex", justifyContent:"center", marginTop:36 }}>
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  style={{
                    display:"flex", alignItems:"center", gap:8,
                    padding:"11px 28px", borderRadius:10,
                    border:`1.5px solid ${BORD2}`,
                    background: isLoadingMore ? VLIGHT : "white",
                    color: isLoadingMore ? V : DARK,
                    fontSize:14, fontWeight:600, cursor: isLoadingMore ? "default" : "pointer",
                    transition:"all 0.16s", ...S,
                  }}
                  onMouseEnter={e => { if (!isLoadingMore) { e.currentTarget.style.borderColor = V; e.currentTarget.style.color = V; e.currentTarget.style.background = VLIGHT; } }}
                  onMouseLeave={e => { if (!isLoadingMore) { e.currentTarget.style.borderColor = BORD2; e.currentTarget.style.color = DARK; e.currentTarget.style.background = "white"; } }}
                >
                  {isLoadingMore ? (
                    <>
                      <RefreshCw size={14} style={{ animation:"spin 0.8s linear infinite" }} />
                      {t("landing.loadingMore")}
                    </>
                  ) : (
                    <>
                      {t("landing.loadMore")}
                      <ChevronDown size={14} />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── EVENT CARD ───────────────────────────────────────────────────────────────
function EventCard({ event, index, hovered, onHover }) {
  const dates = event.dates || [];
  const multi = dates.length > 1;
  const S2 = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
  const datesLabel = dates.length === 0 ? "" : dates.join(", ");

  const urgBadge = (type) => {
    if (type === "últimas")
      return { bg: AMBER_BG_LIGHT, color: AMBER, border: `1px solid ${ABORD}` };
    if (type === "demanda")
      return {
        bg: BADGE_DEMAND_BG,
        color: ERROR_DARK,
        border: `1px solid ${BADGE_DEMAND_BORDER}`,
      };
    return {};
  };

  const cardContent = (
    <>
      <div
        onMouseEnter={() => onHover(event.id)}
        onMouseLeave={() => onHover(null)}
        style={{
          background: CARD,
          borderRadius: 14,
          overflow: "hidden",
          border: `1px solid ${BORDER}`,
          boxShadow: hovered ? SHADOW_CARD_HOVER : SHADOW_CARD_SM,
          transform: hovered ? "translateY(-3px)" : "translateY(0)",
          transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
          cursor: "pointer",
        }}
      >
        <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", overflow: "hidden" }}>
          <img
            src={event.img}
            alt={event.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block", transform: hovered ? "scale(1.05)" : "scale(1)", transition: "transform 0.38s ease" }}
          />
          <div style={{ position: "absolute", inset: 0, background: GRADIENT_CARD_TOP }} />

          {event.badge && (
            <div style={{ position: "absolute", top: 9, left: 9 }}>
              <span style={{ ...urgBadge(event.badge), padding: "3px 9px", borderRadius: 100, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, ...S2, background: urgBadge(event.badge).bg, border: urgBadge(event.badge).border, color: urgBadge(event.badge).color }}>
                {event.badge === "últimas" ? <><Zap size={9} /> Últimas {event.available}</> : <><TrendingUp size={9} /> Alta demanda</>}
              </span>
            </div>
          )}

          {multi && (
            <div style={{ position: "absolute", top: 9, right: 9, background: OVERLAY_V_STRONG, backdropFilter: "blur(6px)", padding: "3px 9px", borderRadius: 100, fontSize: 11, fontWeight: 700, color: "white", ...S2 }}>
              {dates.length} fechas
            </div>
          )}

          {!event.badge && event.available != null && (
            <div style={{ position: "absolute", bottom: 8, right: 9, background: OVERLAY_DARK_45, backdropFilter: "blur(6px)", padding: "3px 9px", borderRadius: 100, fontSize: 11, fontWeight: 600, color: "white", ...S2 }}>
              {event.available} disponibles
            </div>
          )}
        </div>

        <div style={{ padding: "12px 13px 13px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 1, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {event.name}
          </h3>
          <p style={{ color: MUTED, fontSize: 12, marginBottom: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {event.venue}
          </p>

          <div style={{ marginBottom: 11, display: "flex", alignItems: "center", gap: 6, minHeight: 20 }}>
            <Calendar size={13} style={{ color: MUTED, flexShrink: 0 }} strokeWidth={2} />
            <span style={{ fontSize: 12, color: MUTED, lineHeight: 1.4, ...S2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={datesLabel}>
              {dates.length === 0 ? "Fecha por confirmar" : datesLabel}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 10, color: MUTED, fontWeight: 500, marginBottom: 1, textTransform: "uppercase", letterSpacing: "0.04em" }}>Desde</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: V, lineHeight: 1, ...S2 }}>
                {event.price != null ? `$${event.price}` : "Consultar"}
                {event.price != null && <span style={{ fontSize: 10, fontWeight: 500, color: MUTED, marginLeft: 3 }}> ARS</span>}
              </div>
            </div>
            <span className="th-card-btn" style={{ padding: "7px 12px", borderRadius: 8, background: "white", border: `1.5px solid ${BORD2}`, color: DARK, fontSize: 12, fontWeight: 600, transition: "all 0.16s", ...S2 }}>
              Ver →
            </span>
          </div>
        </div>
      </div>
    </>
  );

  if (!event.slug) return cardContent;
  return (
    <Link to={`/event/${event.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      {cardContent}
    </Link>
  );
}

// ─── HERO-ONLY SVG ICONS ─────────────────────────────────────────────────────
function CheckSVG({ size = 13 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={V_SOFT}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function UsersSVG({ size = 13 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={V_SOFT}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
