import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { eventsService } from "@/api/services/events.service";
import type { PublicListEventItem, EventFilters } from "@/api/types/events";
import {
  V,
  VLIGHT,
  BLUE,
  DARK,
  MUTED,
  BG,
  CARD,
  BORDER,
  BORD2,
  S,
  SHADOW_DROP_LG,
  SHADOW_CARD_MD,
  V_FOCUS_RING,
  R_BUTTON,
  R_INPUT,
  R_CARD,
  ERROR,
} from "@/lib/design-tokens";
import { HighlightedEventsHero } from "@/app/components/home/HighlightedEventsHero4";
import { MapSVG } from "@/app/components/site/SiteBrandIcons";
import { Search, ChevronDown, Check, RefreshCw, SlidersHorizontal } from "lucide-react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { EventCard } from "./components/EventCard";
import { SkeletonSearchBar, SkeletonCard } from "./components/Skeletons";
import { eventToCardShape, CAT_TO_API, API_TO_CAT } from "./utils";

export default function LandingPage() {
  const { t } = useTranslation();
  const [filters,     setFilters]    = useState<EventFilters | null>(null);
  const [activeCat,   setActiveCat]  = useState<string>("Todos");
  const [activeCity,  setActiveCity] = useState<string>("Todas las ciudades");
  const [cityOpen,    setCityOpen]   = useState<boolean>(false);
  const [citySearch,  setCitySearch] = useState<string>("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);
  const [query,       setQuery]      = useState<string>("");
  const [hoveredCard,    setHovered]       = useState<string | null>(null);
  const [heroLoaded,     setHeroLoaded]    = useState<boolean>(false);
  const [events,         setEvents]        = useState<PublicListEventItem[]>([]);
  const [isLoading,      setIsLoading]     = useState<boolean>(true);
  const [isLoadingMore,  setIsLoadingMore] = useState<boolean>(false);
  const [error,          setError]         = useState<string | null>(null);
  /** Next page already fetched; shown on "load more". Empty = no more or not yet loaded after click. */
  const [prefetchedPage, setPrefetchedPage]  = useState<PublicListEventItem[]>([]);
  const [hasMore,        setHasMore]       = useState<boolean>(false);
  const cityRefDesktop = useRef<HTMLDivElement>(null);
  const cityRefMobile = useRef<HTMLDivElement>(null);
  /** If user loads page 2 via "load more" before the background page-2 fetch finishes, drop that stale response. */
  const ignoreInitialPage2PrefetchRef = useRef<boolean>(false);

  const PAGE_SIZE = 12;

  const cats   = ["Todos",              ...(filters?.categories.map((c) => API_TO_CAT[c] ?? c) ?? [])];
  const cities = ["Todas las ciudades", ...(filters?.cities ?? [])];

  useEffect(() => {
    let cancelled = false;
    ignoreInitialPage2PrefetchRef.current = false;

    (async function fetchInitialTwoPages() {
      setIsLoading(true);
      setError(null);
      let page1: PublicListEventItem[] = [];
      try {
        const response = await eventsService.listEvents({
          limit: PAGE_SIZE,
          offset: 0,
        });
        page1 = response.events;
        if (cancelled) return;
        setFilters(response.filters);
        setEvents(page1);
        setPrefetchedPage([]);
        setHasMore(page1.length === PAGE_SIZE);
      } catch (err) {
        if (!cancelled) setError(t("landing.errorLoadingEvents"));
        console.error("Failed to fetch events:", err);
        return;
      } finally {
        if (!cancelled) setIsLoading(false);
      }

      if (cancelled || page1.length < PAGE_SIZE) return;

      void eventsService
        .listEvents({ limit: PAGE_SIZE, offset: PAGE_SIZE })
        .then(({ events: page2 }) => {
          if (cancelled || ignoreInitialPage2PrefetchRef.current) return;
          setPrefetchedPage(page2);
          setHasMore(page2.length > 0);
        })
        .catch((err: unknown) => {
          if (cancelled || ignoreInitialPage2PrefetchRef.current) return;
          console.error("Failed to prefetch second page:", err);
        });
    })();

    return () => {
      cancelled = true;
    };
  }, [t]);

  async function handleLoadMore(): Promise<void> {
    if (isLoadingMore || !hasMore) return;

    const prevLen = events.length;
    const batch: PublicListEventItem[] | null =
      prefetchedPage.length > 0
        ? prefetchedPage
        : null;

    if (!batch) {
      ignoreInitialPage2PrefetchRef.current = true;
    }

    setIsLoadingMore(true);
    try {
      let shownBatch: PublicListEventItem[];
      let offsetAfterAppend: number;

      if (batch) {
        shownBatch = batch;
        offsetAfterAppend = prevLen + shownBatch.length;
        setEvents((prev) => [...prev, ...shownBatch]);
      } else {
        const { events: fetchedBatch } = await eventsService.listEvents({
          limit: PAGE_SIZE,
          offset: prevLen,
        });
        shownBatch = fetchedBatch;
        offsetAfterAppend = prevLen + shownBatch.length;
        if (shownBatch.length === 0) {
          setHasMore(false);
          setPrefetchedPage([]);
          return;
        }
        setEvents((prev) => [...prev, ...shownBatch]);
      }

      const { events: nextPage } = await eventsService.listEvents({
        limit: PAGE_SIZE,
        offset: offsetAfterAppend,
      });
      setPrefetchedPage(nextPage);
      setHasMore(nextPage.length > 0);
    } catch (err) {
      console.error("Failed to load more events:", err);
      if (batch) {
        setEvents((prev) => prev.slice(0, prevLen));
        setPrefetchedPage(batch);
      } else {
        setHasMore(true);
      }
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
    const h = (e: MouseEvent) => {
      const inDesk = cityRefDesktop.current?.contains(e.target as Node);
      const inMob = cityRefMobile.current?.contains(e.target as Node);
      if (inDesk || inMob) return;
      setCityOpen(false);
      setCitySearch("");
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filteredCities = cities.filter((c: string) => c.toLowerCase().includes(citySearch.toLowerCase()));

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

  const catPill = (active: boolean): CSSProperties => ({
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
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .sk { background: linear-gradient(90deg, #ece9e6 25%, #f5f4f1 50%, #ece9e6 75%); background-size: 200% 100%; animation: shimmer 1.4s ease-in-out infinite; border-radius: 6px; }
        .th-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:18px; }
        .th-grid > * { min-width:0; max-width:100%; overflow:hidden; }
        @media(max-width:1100px){ .th-grid{ grid-template-columns:repeat(3,minmax(0,1fr))!important; } }
        @media(max-width:900px) { .th-grid{ grid-template-columns:repeat(2,minmax(0,1fr))!important; } }
        @media(max-width:540px) { .th-grid{ grid-template-columns:1fr!important; } }
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
      <div style={{ width:"100%", maxWidth:1280, margin:"0 auto", padding:"24px 24px 0", boxSizing:"border-box" }}>

        {/* ── HERO BOX ── */}
        <HighlightedEventsHero onLoad={() => setHeroLoaded(true)} />

        {/* ── SEARCH + FILTERS BOX ── */}
        {(isLoading && !heroLoaded) ? <SkeletonSearchBar /> : <div style={{
          background:CARD, borderRadius:R_CARD,
          border:`1px solid ${BORDER}`,
          boxShadow: SHADOW_CARD_MD,
          padding:"14px 18px",
          marginBottom:18,
        }}>
          {/* Desktop: unchanged layout (hidden ≤768px) */}
          <div className="th-desk-only" style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap", width:"100%" }}>
            <div style={{ position:"relative", flex:"1 1 220px", minWidth:0 }}>
              <Search size={15} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:MUTED, pointerEvents:"none" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("landing.searchPlaceholder")}
                style={{ width:"100%", padding:"9px 12px 9px 36px", border:`1.5px solid ${BORDER}`, borderRadius:R_INPUT, fontSize:13.5, color:DARK, background:BG, transition:"border-color 0.18s, box-shadow 0.18s", ...S }}
              />
            </div>
            <div style={{ width:1, height:28, background:BORD2, flexShrink:0 }} />
            <div ref={cityRefDesktop} style={{ position:"relative", flexShrink:0 }}>
              <button
                type="button"
                onClick={() => { setCityOpen(!cityOpen); setCitySearch(""); }}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderRadius:R_BUTTON, background:cityOpen ? VLIGHT : BG, border:`1.5px solid ${cityOpen ? V : BORDER}`, cursor:"pointer", ...S, fontSize:13, fontWeight:600, color:activeCity==="Todas las ciudades" ? MUTED : DARK, transition:"all 0.14s", whiteSpace:"nowrap" }}
              >
                <MapSVG size={13} color={activeCity==="Todas las ciudades" ? MUTED : BLUE} />
                {activeCity==="Todas las ciudades" ? t("landing.cityLabel") : activeCity}
                <ChevronDown size={12} style={{ color:MUTED, transform:cityOpen?"rotate(180deg)":"none", transition:"transform 0.14s" }} />
              </button>
              {cityOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, background:"white", border:`1px solid ${BORDER}`, borderRadius:R_INPUT, boxShadow: SHADOW_DROP_LG, minWidth:210, zIndex:200, overflow:"hidden" }}>
                  <div style={{ padding:"9px 9px 7px", borderBottom:`1px solid ${BORDER}` }}>
                    <div style={{ position:"relative" }}>
                      <Search size={12} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:MUTED }} />
                      <input autoFocus value={citySearch} onChange={(e) => setCitySearch(e.target.value)} placeholder={t("landing.searchCityPlaceholder")} style={{ width:"100%", padding:"6px 8px 6px 27px", border:`1px solid ${BORDER}`, borderRadius:R_INPUT, fontSize:13, color:DARK, background:BG, ...S }} />
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
              {cats.map((c) => (
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
                  style={{ width:"100%", minHeight:44, padding:"10px 12px 10px 36px", border:`1.5px solid ${BORDER}`, borderRadius:R_INPUT, fontSize:15, color:DARK, background:BG, transition:"border-color 0.18s, box-shadow 0.18s", ...S }}
                />
              </div>
              <button
                type="button"
                aria-label={t("landing.filters")}
                aria-expanded={mobileFiltersOpen}
                onClick={() => setMobileFiltersOpen((o) => !o)}
                style={{
                  display:"flex", alignItems:"center", justifyContent:"center",
                  flexShrink:0, width:44, minWidth:44, minHeight:44, padding:0, borderRadius:R_BUTTON,
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
                        gap:10, padding:"10px 14px", borderRadius:R_BUTTON,
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
                        background:"white", border:`1px solid ${BORDER}`, borderRadius:R_INPUT,
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
                              style={{ width:"100%", minHeight:44, padding:"8px 10px 8px 32px", border:`1px solid ${BORDER}`, borderRadius:R_INPUT, fontSize:15, color:DARK, background:BG, ...S }}
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
                    {cats.map((c) => (
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
        </div>}

      </div>{/* end maxWidth wrapper */}

      {/* ══════ EVENTS GRID ══════ */}
      <div id="eventos" style={{ width:"100%", maxWidth:1280, margin:"0 auto", paddingLeft:24, paddingRight:24, paddingBottom:56, boxSizing:"border-box" }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
          <h2 style={{ ...S, fontSize:18, fontWeight:700, color:DARK }}>{t("landing.eventsSectionTitle")}</h2>
          {!isLoading && !error && <span style={{ color:MUTED, fontSize:13 }}>{t("landing.eventsCount", { count: filtered.length })}</span>}
        </div>

        {error ? (
          <div style={{ textAlign:"center", padding:"56px 24px", color: ERROR }}>
            <p style={{ fontSize:14 }}>{error}</p>
          </div>
        ) : isLoading ? (
          <div className="th-grid">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"56px 0", color:MUTED }}>
            <Search size={32} style={{ margin:"0 auto 12px", opacity:0.3, display:"block" }} />
            <p style={{ fontSize:14 }}>{query.trim() ? t("landing.noEventsSearch") : t("landing.noEventsAvailable")}</p>
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
                    padding:"11px 28px", borderRadius:R_BUTTON,
                    border:`1.5px solid ${BORD2}`,
                    background: isLoadingMore ? VLIGHT : "white",
                    color: isLoadingMore ? V : DARK,
                    fontSize:14, fontWeight:600, cursor: isLoadingMore ? "default" : "pointer",
                    transition:"all 0.16s", ...S,
                  }}
                  onMouseEnter={(e: ReactMouseEvent<HTMLButtonElement>) => { if (!isLoadingMore) { e.currentTarget.style.borderColor = V; e.currentTarget.style.color = V; e.currentTarget.style.background = VLIGHT; } }}
                  onMouseLeave={(e: ReactMouseEvent<HTMLButtonElement>) => { if (!isLoadingMore) { e.currentTarget.style.borderColor = BORD2; e.currentTarget.style.color = DARK; e.currentTarget.style.background = "white"; } }}
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
