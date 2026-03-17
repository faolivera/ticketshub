import { useState, useEffect, useRef } from "react";
import {
  MapPin, Calendar, Shield, CheckCircle, ChevronDown,
  ArrowLeft, Zap, TrendingUp, ArrowRight, Check,
  Lock, RefreshCw, Star
} from "lucide-react";

// ─── TOKENS ───────────────────────────────────────────────────────────────────
const V      = "#6d28d9";
const VLIGHT = "#f0ebff";
const BLUE   = "#1e3a5f";
const BLIGHT = "#e4edf7";
const DARK   = "#0f0f1a";
const MUTED  = "#6b7280";
const HINT   = "#9ca3af";
const BG     = "#f3f3f0";
const CARD   = "#ffffff";
const SURFACE= "#f9f9f7";
const BORDER = "#e5e7eb";
const BORD2  = "#d1d5db";
const GREEN  = "#15803d";
const GLIGHT = "#f0fdf4";
const GBORD  = "#bbf7d0";
const S = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const E = { fontFamily: "'DM Serif Display', serif" };

const fmt = (n) => "$" + Number(n).toLocaleString("es-AR");

// ─── DATA ─────────────────────────────────────────────────────────────────────
const EVENT = {
  name:     "Fito Páez",
  subtitle: "Sale el Sol · Tour 2026",
  category: "Recital",
  venue:    "Movistar Arena",
  location: "CABA, Buenos Aires",
  img:      "https://picsum.photos/seed/fitoposter/600/600",
  dates: [
    { label: "19 Mar · 21:00hs", full: "19 de marzo de 2026, 21:00hs", count: 10 },
    { label: "20 Mar · 21:00hs", full: "20 de marzo de 2026, 21:00hs", count: 7  },
    { label: "21 Mar · 21:00hs", full: "21 de marzo de 2026, 21:00hs", count: 4  },
  ],
};

// sector: null = no numerada, "seated" = numerada
const TICKETS = [
  { id:1,  sector:"Campo",       seated:false, qty:4,  price:150000, seller:"Thanos A.",  initials:"TA", avatar:null, verified:false, newSeller:true,  badge:"best",   urgency:null       },
  { id:2,  sector:"Campo",       seated:false, qty:2,  price:165000, seller:"Lucía M.",   initials:"LM", avatar:null, verified:true,  newSeller:false, badge:null,     urgency:null       },
  { id:3,  sector:"Campo",       seated:false, qty:1,  price:170000, seller:"Ramiro P.",  initials:"RP", avatar:null, verified:true,  newSeller:false, badge:null,     urgency:"últimas"  },
  { id:4,  sector:"Platea Baja", seated:true,  qty:2,  price:200000, seller:"Vendito S.", initials:"VS", avatar:null, verified:true,  newSeller:false, badge:null,     urgency:null       },
  { id:5,  sector:"Platea Baja", seated:true,  qty:1,  price:200000, seller:"Vendito S.", initials:"VS", avatar:null, verified:true,  newSeller:false, badge:null,     urgency:"últimas"  },
  { id:6,  sector:"Platea Alta", seated:true,  qty:3,  price:180000, seller:"Carlos V.",  initials:"CV", avatar:null, verified:true,  newSeller:false, badge:null,     urgency:null       },
  { id:7,  sector:"General",     seated:false, qty:6,  price:120000, seller:"Ana R.",     initials:"AR", avatar:null, verified:false, newSeller:false, badge:null,     urgency:null       },
  { id:8,  sector:"General",     seated:false, qty:2,  price:130000, seller:"Diego F.",   initials:"DF", avatar:null, verified:true,  newSeller:false, badge:null,     urgency:"demanda"  },
];

const SECTORS = ["Todos", "Campo", "Platea Baja", "Platea Alta", "General"];
const SORTS   = ["Mejor opción", "Precio: menor a mayor", "Precio: mayor a menor", "Solo verificados"];

// ═══════════════════════════════════════════════════════════════════════════════
export default function EventDetail() {
  const [dateIdx,  setDateIdx]  = useState(0);
  const [sector,   setSector]   = useState("Todos");
  const [sortIdx,  setSortIdx]  = useState(0);
  const [dateOpen, setDateOpen] = useState(false);
  const [sticky,   setSticky]   = useState(false);
  const heroRef   = useRef(null);
  const ticketsRef= useRef(null);
  const dateRef   = useRef(null);

  useEffect(() => {
    const l = document.createElement("link");
    l.rel  = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(l);
    return () => { try { document.head.removeChild(l); } catch(e){} };
  }, []);

  // Sticky bar on scroll
  useEffect(() => {
    const handler = () => {
      if (heroRef.current) {
        setSticky(window.scrollY > heroRef.current.offsetHeight - 20);
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close date dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (dateRef.current && !dateRef.current.contains(e.target)) setDateOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const activeDate = EVENT.dates[dateIdx];

  // Sector min prices for pills
  const sectorMin = (s) => {
    const tickets = TICKETS.filter(t => s === "Todos" || t.sector === s);
    if (!tickets.length) return null;
    return Math.min(...tickets.map(t => t.price));
  };

  // Filter + sort
  const filtered = TICKETS
    .filter(t => sector === "Todos" || t.sector === sector)
    .sort((a, b) => {
      if (sortIdx === 0) {
        // Best option: verified first, then price
        if (a.verified !== b.verified) return b.verified - a.verified;
        return a.price - b.price;
      }
      if (sortIdx === 1) return a.price - b.price;
      if (sortIdx === 2) return b.price - a.price;
      if (sortIdx === 3) return b.verified - a.verified;
      return 0;
    });

  const minPrice = fmt(Math.min(...TICKETS.map(t => t.price)));

  const scrollToTickets = () => {
    ticketsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ ...S, background: BG, color: DARK, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* Hero layout */
        .ev-hero-inner { display: grid; grid-template-columns: 260px 1fr; overflow: hidden; }
        @media(max-width:720px){ .ev-hero-inner{ grid-template-columns:1fr; } .ev-poster{ aspect-ratio:16/8!important; } }

        /* Ticket grid */
        .tk-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        @media(max-width:960px){ .tk-grid{ grid-template-columns:repeat(2,1fr)!important; } }
        @media(max-width:580px){ .tk-grid{ grid-template-columns:1fr!important; } }

        /* Sector pills */
        .sec-pill { padding: 6px 14px; border-radius: 100px; border: 1.5px solid ${BORD2}; font-size: 12.5px; font-weight: 600; cursor: pointer; background: transparent; color: ${MUTED}; transition: all 0.14s; white-space: nowrap; font-family:'Plus Jakarta Sans',sans-serif; display:inline-flex; align-items:center; gap:5px; }
        .sec-pill.active { background: ${V}; border-color: ${V}; color: white; }
        .sec-pill:hover:not(.active) { border-color: #9ca3af; color: ${DARK}; }

        /* Date pills */
        .date-pill { padding: 6px 14px; border-radius: 100px; border: 1.5px solid ${BORD2}; font-size: 12.5px; font-weight: 600; cursor: pointer; background: transparent; color: ${MUTED}; transition: all 0.14s; white-space: nowrap; font-family:'Plus Jakarta Sans',sans-serif; }
        .date-pill.active { background: ${VLIGHT}; border-color: ${V}; color: ${V}; }
        .date-pill:hover:not(.active) { border-color: #9ca3af; color: ${DARK}; }

        /* Ticket card */
        .tk-card { background: white; border: 1px solid ${BORDER}; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; transition: box-shadow 0.18s, transform 0.18s; cursor: pointer; }
        .tk-card:hover { box-shadow: 0 8px 24px rgba(109,40,217,0.11); transform: translateY(-2px); }
        .tk-card.best-opt { border: 2px solid ${V}; }

        /* Sort select */
        .sort-sel { border: 1.5px solid ${BORD2}; border-radius: 8px; padding: 7px 10px; font-size: 13px; font-family:'Plus Jakarta Sans',sans-serif; color: ${DARK}; background: white; cursor: pointer; outline: none; }

        /* Sticky bar */
        .sticky-bar { position:fixed; top:0; left:0; right:0; z-index:200; background:rgba(249,249,247,0.97); backdrop-filter:blur(14px); border-bottom:1px solid ${BORDER}; transform:translateY(-100%); transition:transform 0.22s ease; }
        .sticky-bar.visible { transform:translateY(0); }

        /* CTA buy button */
        .btn-buy { background:${V}; color:white; border:none; border-radius:10px; width:100%; padding:11px 14px; font-size:13.5px; font-weight:700; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; transition:background 0.15s; display:flex; align-items:center; justify-content:center; gap:8px; }
        .btn-buy:hover { background:#5b21b6; }
        .btn-buy.seated { background:${BLUE}; }
        .btn-buy.seated:hover { background:#162d4a; }

        .pills-row::-webkit-scrollbar { height: 0; }
      `}</style>

      {/* ── STICKY CONTEXT BAR ── */}
      <div className={`sticky-bar${sticky ? " visible" : ""}`}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: "4px 0", display: "flex", alignItems: "center", gap: 6, flexShrink: 0, ...S, fontSize: 13 }}>
              <ArrowLeft size={15} />
            </button>
            <span style={{ ...E, fontSize: 17, color: DARK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{EVENT.name}</span>
            <span style={{ color: BORD2 }}>·</span>
            {/* Date dropdown in sticky */}
            <div ref={dateRef} style={{ position: "relative" }}>
              <button
                onClick={() => setDateOpen(!dateOpen)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, background: VLIGHT, border: `1px solid #ddd6fe`, color: V, fontSize: 12.5, fontWeight: 600, cursor: "pointer", ...S, whiteSpace: "nowrap" }}
              >
                {activeDate.label}
                <ChevronDown size={12} style={{ transform: dateOpen ? "rotate(180deg)" : "none", transition: "transform 0.14s" }} />
              </button>
              {dateOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "white", border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 300, overflow: "hidden", minWidth: 200 }}>
                  {EVENT.dates.map((d, i) => (
                    <button key={i} onClick={() => { setDateIdx(i); setDateOpen(false); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 14px", background: dateIdx === i ? VLIGHT : "white", border: "none", cursor: "pointer", fontSize: 13, fontWeight: dateIdx === i ? 600 : 400, color: dateIdx === i ? V : DARK, ...S }}
                    >
                      {d.label} <span style={{ fontSize: 11.5, color: MUTED }}>{d.count} entradas</span>
                      {dateIdx === i && <Check size={13} style={{ color: V }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: MUTED }}>Desde</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: V }}>{minPrice}</span>
            <button onClick={scrollToTickets} style={{ padding: "7px 16px", borderRadius: 8, background: V, border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, ...S }}>
              Ver entradas <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── PAGE BODY ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 64px" }}>

        {/* ── BACK LINK ── */}
        <button style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 13.5, fontWeight: 500, marginBottom: 16, padding: 0, ...S }}>
          <ArrowLeft size={15} /> Volver a resultados
        </button>

        {/* ── EVENT HERO BOX ── */}
        <div ref={heroRef} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, overflow: "hidden", marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div className="ev-hero-inner">
            {/* Poster */}
            <div className="ev-poster" style={{ aspectRatio: "1", overflow: "hidden", background: "#111", flexShrink: 0 }}>
              <img src={EVENT.img} alt={EVENT.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>

            {/* Info */}
            <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 0 }}>

              {/* Category + title */}
              <div style={{ marginBottom: 16 }}>
                <CategoryBadge label={EVENT.category} />
                <h1 style={{ ...E, fontSize: "clamp(24px,3vw,38px)", fontWeight: 400, lineHeight: 1.18, letterSpacing: "-0.5px", color: DARK, margin: "10px 0 4px" }}>
                  {EVENT.name}
                </h1>
                <p style={{ fontSize: 14.5, color: MUTED }}>{EVENT.subtitle}</p>
              </div>

              {/* Meta */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: MUTED }}>
                  <MapPin size={14} style={{ color: BLUE, flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: DARK }}>{EVENT.venue}</span>
                  <span>·</span><span>{EVENT.location}</span>
                </div>
              </div>

              {/* Date selector */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, color: MUTED, marginBottom: 8 }}>Seleccioná una fecha</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {EVENT.dates.map((d, i) => (
                    <button key={i} className={`date-pill${dateIdx === i ? " active" : ""}`} onClick={() => setDateIdx(i)}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price block — visually dominant */}
              <div style={{ padding: "16px 18px", background: SURFACE, borderRadius: 14, border: `1px solid ${BORDER}`, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: MUTED, marginBottom: 4 }}>Entradas desde</p>
                    <p style={{ fontSize: 32, fontWeight: 800, color: V, lineHeight: 1 }}>
                      {minPrice} <span style={{ fontSize: 12, fontWeight: 500, color: MUTED }}>ARS</span>
                    </p>
                    <p style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }}>
                      <span style={{ fontWeight: 600, color: DARK }}>{activeDate.count} entradas</span> disponibles · {EVENT.dates[dateIdx].label}
                    </p>
                  </div>
                  <button
                    onClick={scrollToTickets}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 10, background: V, border: "none", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", ...S, boxShadow: "0 4px 18px rgba(109,40,217,0.28)", flexShrink: 0 }}
                  >
                    Ver entradas <ArrowRight size={15} />
                  </button>
                </div>
              </div>

              {/* Trust micro-signals — inline with price */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                {[
                  { icon: <Lock size={12} style={{ color: BLUE }} />,         text: "Pago en escrow" },
                  { icon: <CheckCircle size={12} style={{ color: GREEN }} />, text: "Entradas verificadas" },
                  { icon: <RefreshCw size={12} style={{ color: "#b45309" }} />, text: "Reembolso garantizado" },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: MUTED, fontWeight: 500 }}>
                    {icon} {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── TICKETS SECTION ── */}
        <div ref={ticketsRef} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 24, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>

          {/* Section header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <div>
              <h2 style={{ ...E, fontSize: 22, fontWeight: 400, color: DARK, letterSpacing: "-0.3px" }}>Entradas disponibles</h2>
              <p style={{ fontSize: 13, color: MUTED, marginTop: 3 }}>{activeDate.full} · {filtered.length} opciones</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: MUTED, fontWeight: 500, whiteSpace: "nowrap" }}>Ordenar</span>
              <select className="sort-sel" value={sortIdx} onChange={e => setSortIdx(Number(e.target.value))}>
                {SORTS.map((s, i) => <option key={i} value={i}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Sector filter pills */}
          <div className="pills-row" style={{ display: "flex", gap: 7, overflowX: "auto", marginBottom: 20, paddingBottom: 2 }}>
            {SECTORS.map(s => {
              const min = sectorMin(s);
              return (
                <button key={s} className={`sec-pill${sector === s ? " active" : ""}`} onClick={() => setSector(s)}>
                  {s}
                  {min && s !== "Todos" && (
                    <span style={{ fontSize: 11, fontWeight: 600, opacity: sector === s ? 0.85 : 0.65 }}>
                      {fmt(min)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Ticket grid */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: MUTED }}>
              <p style={{ fontSize: 15 }}>No hay entradas disponibles para este sector.</p>
            </div>
          ) : (
            <div className="tk-grid">
              {filtered.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TICKET CARD ─────────────────────────────────────────────────────────────
function TicketCard({ ticket }) {
  const { sector, seated, qty, price, seller, initials, verified, newSeller, badge, urgency } = ticket;
  const isBest = badge === "best";
  const ctaLabel = seated ? "Elegir asientos" : "Comprar";

  return (
    <div className={`tk-card${isBest ? " best-opt" : ""}`}>
      {/* Top: sector label + best badge */}
      {isBest && (
        <div style={{ background: VLIGHT, borderBottom: `1px solid #ddd6fe`, padding: "7px 14px", display: "flex", alignItems: "center", gap: 7 }}>
          <Star size={12} style={{ color: V, fill: V }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: V }}>Mejor opción · Precio más bajo</span>
        </div>
      )}

      <div style={{ padding: "15px 16px 0", flex: 1 }}>
        {/* Sector + qty */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: DARK }}>{sector}</p>
            <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
              {qty} entrada{qty !== 1 ? "s" : ""} · comprá 1{qty > 1 ? " o más" : ""}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Desde</p>
            <p style={{ fontSize: 19, fontWeight: 800, color: V, lineHeight: 1 }}>{fmt(price)}</p>
          </div>
        </div>

        {/* Urgency badge */}
        <div style={{ minHeight: 24, marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}>
          {urgency === "últimas" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 100, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", fontSize: 11, fontWeight: 700 }}>
              <Zap size={9} /> Última{qty > 1 ? "s" : ""} {qty}
            </span>
          )}
          {urgency === "demanda" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 100, background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", fontSize: 11, fontWeight: 700 }}>
              <TrendingUp size={9} /> Alta demanda
            </span>
          )}
          {seated && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 100, background: BLIGHT, color: BLUE, border: `1px solid #bfd3ea`, fontSize: 11, fontWeight: 600 }}>
              Numerada
            </span>
          )}
        </div>

        {/* Seller */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", background: SURFACE, borderRadius: 9, border: `1px solid ${BORDER}`, marginBottom: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: VLIGHT, color: V, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
            {initials}
          </div>
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
        </div>
      </div>

      {/* Footer / CTA */}
      <div style={{ padding: "12px 16px 14px", marginTop: 12 }}>
        <button className={`btn-buy${seated ? " seated" : ""}`}>
          {seated ? <MapPin size={14} /> : <ArrowRight size={14} />}
          {ctaLabel}
        </button>
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

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────
function CategoryBadge({ label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 11px", borderRadius: 100, background: BG, color: MUTED, border: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 600 }}>
      {label}
    </span>
  );
}
