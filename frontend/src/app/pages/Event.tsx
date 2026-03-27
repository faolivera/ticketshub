import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import {
  MapPin, CheckCircle, ChevronDown, ArrowLeft, ArrowRight,
  Lock, MessageCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ticketsService } from "@/api/services/tickets.service";
import { subscriptionsService } from "@/api/services/subscriptions.service";
import { formatDate, formatTime } from "@/lib/format-date";
import { getInitials } from "@/lib/string-utils";
import { EventTicketCard } from "@/app/components/EventTicketCard";
import { BackButton } from "@/app/components/BackButton";
import EmptyEventState from "@/app/components/event/EmptyEventState";
import {
  V, VLIGHT, DARK, MUTED, BORDER, BORD2, S, E,
  SURFACE_STICKY, SHADOW_DROP, BG,
  SUCCESS, SUCCESS_LIGHT, SUCCESS_BORDER,
  R_HERO, R_CARD, R_BUTTON, R_INPUT,
  TRUST_ESCROW_LIGHT, TRUST_VERIFIED_LIGHT, TRUST_SUPPORT_LIGHT,
} from "@/lib/design-tokens";
import type { PublicListEventItem } from "@/api/types/events";
import type { ListingWithSeller } from "@/api/types/tickets";

const DEFAULT_IMAGE = "https://picsum.photos/seed/event/600/600";

function formatPrice(amountCents: number): string {
  const n = Math.round(amountCents / 100);
  return n.toLocaleString("es-AR");
}

const fmt = (n: number): string => "$" + Number(n).toLocaleString("es-AR");

interface EventDate {
  id: string;
  label: string;
  full: string;
  count: number;
}

interface EventDisplay {
  name: string;
  subtitle: string;
  category: string;
  venue: string;
  location: string;
  img: string;
  dates: EventDate[];
}

interface TicketDisplay {
  id: string;
  listingId: string;
  eventSlug: string;
  eventDateId: string;
  sector: string;
  seated: boolean;
  acceptsOffers: boolean;
  qty: number;
  price: string;
  priceNum: number;
  maxTotalCommissionPercent: number;
  currency: string;
  seller: string;
  sellerId: string;
  sellerAvatarUrl: string | null;
  sellerTotalSales: number;
  sellerTotalReviews: number;
  sellerPositivePercent: number | null;
  verified: boolean;
  newSeller: boolean;
  sellTogether: boolean;
  badge: null;
  urgency: string | null;
}

interface BuildResult {
  event: EventDisplay | null;
  tickets: TicketDisplay[];
}

function buildEventAndTickets(
  apiEvent: PublicListEventItem | null,
  listings: ListingWithSeller[],
  defaultSectionName: string,
  defaultSellerName: string,
): BuildResult {
  if (!apiEvent) return { event: null, tickets: [] };
  const approvedDates = (apiEvent.dates || []).filter((d) => d.status === "approved");
  const filteredListings = listings || [];

  const eventImg =
    apiEvent.bannerUrls?.rectangle ||
    apiEvent.bannerUrls?.square ||
    apiEvent.images?.[0]?.src ||
    DEFAULT_IMAGE;
  const locationStr = [apiEvent.location?.city, apiEvent.location?.countryCode].filter(Boolean).join(", ");

  const dateCounts: Record<string, number> = {};
  filteredListings.forEach((l) => {
    dateCounts[l.eventDateId] = (dateCounts[l.eventDateId] || 0) + 1;
  });

  const event: EventDisplay = {
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

  const tickets: TicketDisplay[] = filteredListings.map((listing) => {
    const available = listing.ticketUnits?.filter((u) => u.status === "available").length ?? 0;
    const priceCents = listing.pricePerTicket?.amount ?? 0;
    const priceNum = priceCents / 100;
    const sectionName = listing.sectionName || listing.type || defaultSectionName;
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
      maxTotalCommissionPercent: listing.maxTotalCommissionPercent ?? 10,
      currency: listing.pricePerTicket?.currency || "ARS",
      seller: listing.sellerPublicName || defaultSellerName,
      sellerId: listing.sellerId,
      sellerAvatarUrl: listing.sellerPic?.src ?? null,
      sellerTotalSales: listing.sellerReputation?.totalSales ?? 0,
      sellerTotalReviews: listing.sellerReputation?.totalReviews ?? 0,
      sellerPositivePercent: listing.sellerReputation?.positivePercent ?? null,
      verified,
      newSeller: badges.some((b) => String(b).toLowerCase().includes("new")),
      sellTogether: listing.sellTogether ?? false,
      badge: null,
      urgency: available === 1 ? "últimas" : null,
    };
  });

  return { event, tickets };
}


export default function EventDetail() {
  const { t } = useTranslation();
  const { eventSlug } = useParams<{ eventSlug: string }>();

  const SORTS: string[] = useMemo(() => [
    t("event.sortPriceLowHigh"),
    t("event.sortPriceHighLow"),
    t("event.sortVerifiedOnly"),
  ], [t]);

  // ── SORT SHORT LABELS for mobile button ──────────────────────────────────
  const SORTS_SHORT: string[] = useMemo(() => [
    t("event.sortPriceLowHighShort", "Precio ↑"),
    t("event.sortPriceHighLowShort", "Precio ↓"),
    t("event.sortVerifiedOnlyShort", "Verificados"),
  ], [t]);

  const [dateIdx, setDateIdx] = useState<number>(0);
  const [sector, setSector] = useState<string>("");
  const [sortIdx, setSortIdx] = useState<number>(0);
  const [dateOpen, setDateOpen] = useState<boolean>(false);
  const [sticky, setSticky] = useState<boolean>(false);
  const [apiEvent, setApiEvent] = useState<PublicListEventItem | null>(null);
  const [listings, setListings] = useState<ListingWithSeller[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [waitingCount, setWaitingCount] = useState<number>(0);

  // ── MOBILE SHEET STATE ───────────────────────────────────────────────────
  const [sectionSheetOpen, setSectionSheetOpen] = useState<boolean>(false);
  const [sortSheetOpen, setSortSheetOpen] = useState<boolean>(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const ticketsRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

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
        const { event: eventData, listings: listingsData } = await ticketsService.getEventPage(eventSlug!);
        if (!cancelled) {
          setApiEvent(eventData);
          setListings(listingsData || []);
          if (eventData?.id) {
            subscriptionsService
              .getCount(eventData.id, 'NOTIFY_TICKET_AVAILABLE')
              .then((res) => { if (!cancelled) setWaitingCount(res.count); })
              .catch(() => { /* non-critical, leave waitingCount at 0 */ });
          }
        }
      } catch (err) {
        if (!cancelled) setError(t("eventTickets.errorLoading"));
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
    const h = (e: MouseEvent) => { if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Prevent body scroll when a sheet is open ────────────────────────────
  useEffect(() => {
    const anyOpen = sectionSheetOpen || sortSheetOpen;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sectionSheetOpen, sortSheetOpen]);

  const { event: EVENT, tickets: allTickets } = useMemo(
    () => buildEventAndTickets(apiEvent, listings, t("event.defaultSectionName"), t("event.defaultSellerName")),
    [apiEvent, listings, t]
  );

  useEffect(() => {
    if (!EVENT?.dates?.length) return;
    const firstWithListings = EVENT.dates.findIndex((d) => d.count > 0);
    setDateIdx(firstWithListings >= 0 ? firstWithListings : 0);
  }, [EVENT?.dates]);

  const activeDate = EVENT?.dates?.[dateIdx];
  const selectedDateId = activeDate?.id;

  const ticketsForDate = useMemo(() => {
    if (!selectedDateId) return allTickets;
    return allTickets.filter((t) => t.eventDateId === selectedDateId);
  }, [allTickets, selectedDateId]);

  const sectorsList = useMemo(() => {
    const sectors = [...new Set(ticketsForDate.map((t) => t.sector))].filter(Boolean).sort();
    return ["", ...sectors];
  }, [ticketsForDate]);

  const filteredBySector = useMemo(() => {
    if (sector === "") return ticketsForDate;
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

  const totalTickets = useMemo(() => {
    return ticketsForDate.reduce((sum, t) => sum + t.qty, 0);
  }, [ticketsForDate]);

  const minPriceWithFees = useMemo(() => {
    if (!sorted.length) return 0;
    return Math.min(...sorted.map((t) => Math.round(t.priceNum * (1 + t.maxTotalCommissionPercent / 100))));
  }, [sorted]);

  const sectorMin = (s: string): number | null => {
    const list = s === "" ? ticketsForDate : ticketsForDate.filter((t) => t.sector === s);
    if (!list.length) return null;
    return Math.min(...list.map((t) => Math.round(t.priceNum * (1 + t.maxTotalCommissionPercent / 100))));
  };

  // ── Count per sector for the sheet ──────────────────────────────────────
  const sectorCount = (s: string): number => {
    if (s === "") return ticketsForDate.length;
    return ticketsForDate.filter((t) => t.sector === s).length;
  };

  const scrollToTickets = (): void => {
    ticketsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Mobile section button label ──────────────────────────────────────────
  const sectionLabel = sector === ""
    ? t("event.allSectors", "Todas")
    : sector;


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
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
            <div className="ev-sk" style={{ height: 13, width: 13, borderRadius: 3 }} />
            <div className="ev-sk" style={{ height: 13, width: 48 }} />
          </div>
          <div style={{ borderRadius: R_HERO, overflow: "hidden", marginBottom: 14, background: "#2a2a3a", minHeight: 320, padding: "clamp(28px,4vw,44px)" }}>
            <div className="ev-sk-dark" style={{ height: 20, width: 72, borderRadius: 100, marginBottom: 16 }} />
            <div className="ev-sk-dark" style={{ height: 36, width: "72%", marginBottom: 10 }} />
            <div className="ev-sk-dark" style={{ height: 36, width: "48%", marginBottom: 18 }} />
            <div className="ev-sk-dark" style={{ height: 13, width: "55%", marginBottom: 24 }} />
            <div style={{ marginBottom: 18 }}>
              <div className="ev-sk-dark" style={{ height: 10, width: 110, marginBottom: 10 }} />
              <div style={{ display: "flex", gap: 7 }}>
                <div className="ev-sk-dark" style={{ height: 28, width: 80, borderRadius: 100 }} />
                <div className="ev-sk-dark" style={{ height: 28, width: 95, borderRadius: 100 }} />
              </div>
            </div>
            <div className="ev-sk-dark" style={{ height: 12, width: "42%", marginBottom: 22 }} />
            <div style={{ display: "flex", gap: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
              <div className="ev-sk-dark" style={{ height: 11, width: 90 }} />
              <div className="ev-sk-dark" style={{ height: 11, width: 106 }} />
              <div className="ev-sk-dark" style={{ height: 11, width: 84 }} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <div>
              <div className="ev-sk" style={{ height: 22, width: 160, marginBottom: 6 }} />
              <div className="ev-sk" style={{ height: 11, width: 110 }} />
            </div>
            <div className="ev-sk" style={{ height: 34, width: 96, borderRadius: R_BUTTON }} />
          </div>
          <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
            {[52, 68, 60].map((w, i) => (
              <div key={i} className="ev-sk" style={{ height: 28, width: w, borderRadius: 100 }} />
            ))}
          </div>
          <div className="tk-grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ background: "white", borderRadius: R_CARD, padding: 16, border: `1px solid ${BORDER}` }}>
                <div className="ev-sk" style={{ height: 11, width: "55%", marginBottom: 8 }} />
                <div className="ev-sk" style={{ height: 22, width: "40%", marginBottom: 10 }} />
                <div className="ev-sk" style={{ height: 10, width: "75%", marginBottom: 6 }} />
                <div className="ev-sk" style={{ height: 10, width: "60%", marginBottom: 14 }} />
                <div className="ev-sk" style={{ height: 36, width: "100%", borderRadius: R_BUTTON }} />
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
            ← {t("event.goBack")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...S, backgroundColor: BG, color: DARK, minHeight: "100vh" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* Unified ticket grid — 3 cols desktop, 2 cols tablet, 1 col mobile */
        .tk-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        @media(max-width: 900px) { .tk-grid { grid-template-columns: repeat(2, 1fr); } }
        @media(max-width: 768px) { .tk-grid { grid-template-columns: 1fr; } }

        /* Sector filter pills — desktop only */
        .sec-pill {
          padding: 6px 14px; border-radius: 100px;
          border: 1.5px solid #d1d5db;
          font-size: 12.5px; font-weight: 600; cursor: pointer;
          background: transparent; color: #6b7280;
          transition: all 0.14s; white-space: nowrap;
          font-family: 'Plus Jakarta Sans', sans-serif;
          display: inline-flex; align-items: center; gap: 5px;
        }
        .sec-pill.active { background: #692dd4; border-color: #692dd4; color: white; }
        .sec-pill:hover:not(.active) { border-color: #9ca3af; color: #262626; }

        /* Sort select — desktop only */
        .sort-sel {
          border: 1px solid #e5e7eb; border-radius: 10px;
          padding: 6px 10px; font-size: 13px; font-weight: 500;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: #262626; background: white; cursor: pointer; outline: none;
        }
        .sort-sel:focus { border-color: #692dd4; box-shadow: 0 0 0 2px rgba(105,45,212,0.1); }

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

        .empty-state-wrap { padding: 18px 0 48px; }
        .empty-state-card { border-radius: 20px; }
        @media(max-width: 600px) { .empty-state-wrap { padding: 24px 0; } }

        .pills-row::-webkit-scrollbar { height: 0; }

        /* Mobile adjustments */
        @media(max-width: 600px) {
          .hero-stock-line { display: none; }
          .event-hero { min-height: 240px !important; }
          .listing-sub-desktop { display: none; }
          .listing-sub-mobile { display: block; }
        }
        @media(min-width: 601px) {
          .listing-sub-mobile { display: none; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── MOBILE FILTER CONTROLS ─────────────────────────────────────── */

        /* Hide desktop pills + sort header on mobile */
        @media(max-width: 600px) {
          .desktop-sort-header { display: none !important; }
          .desktop-pills-row   { display: none !important; }
        }

        /* Hide mobile controls on desktop */
        .mobile-controls-row { display: none; }
        @media(max-width: 600px) {
          .mobile-controls-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 0 0;
          }
        }

        /* Compact filter buttons */
        .mob-ctrl-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #1a1a2e;
          background: white;
          border: 1.5px solid #e5e5e0;
          border-radius: 10px;
          padding: 8px 12px;
          cursor: pointer;
          white-space: nowrap;
          transition: border-color 0.14s, color 0.14s;
          -webkit-tap-highlight-color: transparent;
        }
        .mob-ctrl-btn.active {
          border-color: #692dd4;
          color: #692dd4;
        }
        .mob-ctrl-btn-section { flex: 1; justify-content: space-between; }

        /* Sort icon */
        .mob-sort-icon {
          display: flex; flex-direction: column; gap: 2.5px; width: 12px; flex-shrink: 0;
        }
        .mob-sort-icon span {
          display: block; height: 1.5px; background: currentColor;
          border-radius: 1px; opacity: 0.55;
        }
        .mob-sort-icon span:nth-child(1) { width: 100%; }
        .mob-sort-icon span:nth-child(2) { width: 65%; }
        .mob-sort-icon span:nth-child(3) { width: 35%; }

        /* ── BOTTOM SHEET ─────────────────────────────────────────────────── */
        .sheet-overlay {
          position: fixed; inset: 0; z-index: 500;
          background: rgba(15, 15, 26, 0.5);
          display: flex; align-items: flex-end;
          animation: sheetFadeIn 0.18s ease;
        }
        @keyframes sheetFadeIn {
          from { background: rgba(15,15,26,0); }
          to   { background: rgba(15,15,26,0.5); }
        }

        .sheet-panel {
          background: white;
          border-radius: 20px 20px 0 0;
          width: 100%;
          padding: 0 20px 32px;
          animation: sheetSlideUp 0.22s cubic-bezier(0.32, 0.72, 0, 1);
          max-height: 80vh;
          overflow-y: auto;
        }
        @keyframes sheetSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }

        .sheet-handle-wrap {
          padding: 12px 0 8px; display: flex; justify-content: center;
          position: sticky; top: 0; background: white; z-index: 1;
        }
        .sheet-handle {
          width: 36px; height: 4px;
          background: #e5e5e0; border-radius: 999px;
        }

        .sheet-section-title {
          font-size: 11px; font-weight: 700; letter-spacing: 0.09em;
          text-transform: uppercase; color: #6b7280;
          margin-bottom: 4px;
        }

        /* Sheet option — sections */
        .sheet-sec-option {
          display: flex; align-items: center; gap: 12px;
          padding: 13px 0;
          border-bottom: 1px solid #f0f0eb;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .sheet-sec-option:last-child { border-bottom: none; }

        .sheet-radio {
          width: 20px; height: 20px; border-radius: 50%;
          border: 2px solid #d1d5db; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.12s, background 0.12s;
        }
        .sheet-radio.selected {
          border-color: #692dd4; background: #692dd4;
        }
        .sheet-radio.selected::after {
          content: ''; width: 8px; height: 8px;
          background: white; border-radius: 50%;
        }

        .sheet-sec-info { flex: 1; }
        .sheet-sec-name {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 600; color: #1a1a2e;
        }
        .sheet-sec-name.selected { color: #692dd4; }
        .sheet-sec-sub {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px; color: #6b7280; margin-top: 1px;
        }
        .sheet-sec-price-wrap { text-align: right; }
        .sheet-sec-price-from {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 9px; font-weight: 500; color: #9ca3af; text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .sheet-sec-price {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; font-weight: 700; color: #1a1a2e;
        }

        /* Sheet option — sort */
        .sheet-sort-option {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 0;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 500; color: #1a1a2e;
          border-bottom: 1px solid #f0f0eb;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .sheet-sort-option:last-child { border-bottom: none; }
        .sheet-sort-option.selected { color: #692dd4; font-weight: 700; }

        .sheet-check {
          width: 20px; height: 20px; background: #692dd4;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
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
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: R_BUTTON, background: "white", border: `1px solid ${BORD2}`, color: DARK, fontSize: 12.5, fontWeight: 600, cursor: "pointer", ...S, whiteSpace: "nowrap" }}
              >
                {activeDate?.label}
                <ChevronDown size={12} style={{ transform: dateOpen ? "rotate(180deg)" : "none", transition: "transform 0.14s" }} />
              </button>
              {dateOpen && EVENT.dates?.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "white", border: `1px solid ${BORDER}`, borderRadius: R_INPUT, boxShadow: SHADOW_DROP, zIndex: 300, overflow: "hidden", minWidth: 200 }}>
                  {EVENT.dates.map((d, i) => (
                    <button key={d.id} type="button" onClick={() => { setDateIdx(i); setDateOpen(false); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 14px", background: dateIdx === i ? VLIGHT : "white", border: "none", cursor: "pointer", fontSize: 13, fontWeight: dateIdx === i ? 600 : 400, color: dateIdx === i ? V : DARK, ...S }}
                    >
                      {d.label} <span style={{ fontSize: 11.5, color: MUTED }}>{t("event.ticketsCount", { count: d.count })}</span>
                      {dateIdx === i && <CheckCircle size={13} style={{ color: V }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="sticky-price-cta" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: MUTED }}>{t("event.fromWithCommission")}</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: V }}>{fmt(minPriceWithFees)}</span>
            <button type="button" onClick={scrollToTickets} style={{ padding: "7px 16px", borderRadius: R_BUTTON, background: V, border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, ...S }}>
              {t("event.viewTickets")} <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 64px" }}>

        <BackButton to="/" />

        {/* ── Hero Box ── */}
        <div
          ref={heroRef}
          className="event-hero"
          style={{
            borderRadius: R_HERO, overflow: "hidden",
            marginBottom: 14,
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            position: "relative", minHeight: 320,
          }}
        >
          <div style={{
            position: "absolute", inset: 0, zIndex: 0,
            backgroundImage: `url(${EVENT.img})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(12px) brightness(0.6) saturate(1.2)",
            transform: "scale(1.1)",
          }} />
          <div style={{
            position: "absolute", inset: 0, zIndex: 1,
            background: "linear-gradient(to right, rgba(38,38,38,0.65) 0%, rgba(38,38,38,0.38) 45%, rgba(38,38,38,0.05) 100%)",
          }} />
          <div style={{ position: "relative", zIndex: 2, padding: "clamp(28px,4vw,44px)", maxWidth: 640, display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: 14 }}>
              <span style={{
                display: "inline-flex", alignItems: "center",
                padding: "4px 12px", borderRadius: 100,
                background: "rgba(105,45,212,0.75)",
                backdropFilter: "blur(8px)",
                color: "white",
                fontSize: 11, fontWeight: 700,
                letterSpacing: "0.07em", textTransform: "uppercase",
              }}>
                {t(`eventCategories.${EVENT.category}`)}
              </span>
            </div>
            <h1 style={{ ...E, fontSize: "clamp(30px,3.6vw,46px)", fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.5px", color: "white", marginBottom: 10 }}>
              {EVENT.name}
            </h1>
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
            <div style={{ marginBottom: 20 }}>
              {EVENT.dates.length === 0 ? (
                <p style={{ fontSize: 13.5, fontWeight: 600, color: "rgba(255,255,255,0.65)", ...S }}>
                  {t("eventTickets.noDatesAvailable")}
                </p>
              ) : (
              <>
              <p style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: 9, ...S }}>
                {t("event.selectADate")}
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
                      border: dateIdx === i ? "1.5px solid #692dd4" : "1.5px solid rgba(255,255,255,0.2)",
                      background: dateIdx === i ? "#692dd4" : "transparent",
                      color: dateIdx === i ? "white" : "rgba(255,255,255,0.65)",
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              </>
              )}
            </div>
            {activeDate?.count > 0 && (
            <p className="hero-stock-line" style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 20 }}>
              {t("event.stockSummary", { tickets: totalTickets, listings: activeDate.count, price: fmt(minPriceWithFees) })}
            </p>
            )}
            <div className="pills-row" style={{ display: "flex", overflowX: "auto", gap: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.15)" }}>
              {[
                { icon: <Lock          size={11} color={TRUST_ESCROW_LIGHT}   strokeWidth={2.2} />, text: t("event.trustFundsProtected")      },
                { icon: <CheckCircle   size={11} color={TRUST_VERIFIED_LIGHT} strokeWidth={2.2} />, text: t("event.trustVerifiedSellers") },
                { icon: <MessageCircle size={11} color={TRUST_SUPPORT_LIGHT}  strokeWidth={2.2} />, text: t("event.trustWhatsAppSupport")       },
              ].map(({ icon, text }) => (
                <div key={text} style={{ ...S, display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap" }}>
                  {icon} {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Listing header (desktop: includes sort select) ── */}
        {sorted.length > 0 && (
        <div ref={ticketsRef} className="desktop-sort-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 8 }}>
              <h2 style={{ ...S, fontSize: 18, fontWeight: 700, color: DARK }}>
                {t("event.availableTickets")}
              </h2>
              {activeDate && (
                <span className="listing-sub-mobile" style={{ fontSize: 12.5, color: MUTED, whiteSpace: "nowrap" }}>
                  {activeDate.label}
                </span>
              )}
            </div>
            <p className="listing-sub-desktop" style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>
              {activeDate
                ? t("event.dateAndOptions", { date: activeDate.full, count: sorted.length })
                : t("event.ticketCount", { count: sorted.length })}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: MUTED, fontWeight: 500, whiteSpace: "nowrap" }}>{t("event.sortLabel")}</span>
            <select className="sort-sel" value={sortIdx} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortIdx(Number(e.target.value))}>
              {SORTS.map((s, i) => <option key={i} value={i}>{s}</option>)}
            </select>
          </div>
        </div>
        )}

        {/* ── Mobile: section title + two-button control row ── */}
        {sorted.length > 0 && (
        <div className="mobile-controls-row" style={{ marginBottom: 12 }}>
          {/* Section button */}
          {sectorsList.length > 1 && (
            <button
              type="button"
              className={`mob-ctrl-btn mob-ctrl-btn-section${sector !== "" ? " active" : ""}`}
              onClick={() => setSectionSheetOpen(true)}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t("event.sectionLabel", "Sección")}: {sectionLabel}
              </span>
              <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
            </button>
          )}
          {/* Sort button */}
          <button
            type="button"
            className={`mob-ctrl-btn${sortIdx !== 0 ? " active" : ""}`}
            onClick={() => setSortSheetOpen(true)}
          >
            <div className="mob-sort-icon">
              <span /><span /><span />
            </div>
            {SORTS_SHORT[sortIdx]}
          </button>
        </div>
        )}

        {/* ── Desktop: filter pills ── */}
        {sectorsList.length > 1 && (
          <div className="pills-row desktop-pills-row" style={{ display: "flex", gap: 7, overflowX: "auto", marginBottom: 14, paddingBottom: 2 }}>
            {sectorsList.map((s) => {
              const min = sectorMin(s);
              return (
                <button key={s || "__all__"} type="button" className={`sec-pill${sector === s ? " active" : ""}`} onClick={() => setSector(s)}>
                  {s === "" ? t("event.allSectors") : s}
                  {min != null && s !== "" && (
                    <span style={{ fontSize: 11, fontWeight: 600, opacity: sector === s ? 0.85 : 0.65 }}>{fmt(min)}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Ticket grid / empty state ── */}
        {sorted.length === 0 ? (
          <EmptyEventState waitingCount={waitingCount} eventId={apiEvent!.id} />
        ) : (
          <div className="tk-grid">
            {sorted.map((tkt, idx) => (
              <div
                key={tkt.id}
                style={{ animation: "fadeUp 0.35s ease both", animationDelay: `${idx * 40}ms`, height: "100%" }}
              >
                <EventTicketCard ticket={tkt} eventSlug={eventSlug ?? ""} />
              </div>
            ))}
          </div>
        )}

        {/* ── Sell banner ── */}
        {sorted.length > 0 && <div style={{
          marginTop: 36,
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: R_CARD,
          padding: "24px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <div>
            <p style={{ ...E, fontSize: 18, letterSpacing: "-0.3px", color: DARK, marginBottom: 4 }}>
              {t("event.sellBannerTitle")}
            </p>
            <p style={{ fontSize: 13, color: MUTED }}>
              {t("event.sellBannerSubtitle")}
            </p>
          </div>
          <Link
            to="/sell-ticket"
            style={{
              display: "inline-block",
              ...S,
              fontSize: 13, fontWeight: 700, color: V,
              border: "1.5px solid #692dd4",
              borderRadius: R_BUTTON,
              padding: "10px 20px",
              background: "transparent",
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = "#f0ebff")}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = "transparent")}
          >
            {t("event.sellBannerCta")} →
          </Link>
        </div>}
      </div>

      {/* ── MOBILE: Section bottom sheet ─────────────────────────────────── */}
      {sectionSheetOpen && (
        <div className="sheet-overlay" onClick={() => setSectionSheetOpen(false)}>
          <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle-wrap">
              <div className="sheet-handle" />
            </div>
            <p className="sheet-section-title">{t("event.sectionLabel", "Sección")}</p>

            {sectorsList.map((s) => {
              const min = sectorMin(s);
              const count = sectorCount(s);
              const isSelected = sector === s;
              return (
                <div
                  key={s || "__all__"}
                  className="sheet-sec-option"
                  onClick={() => { setSector(s); setSectionSheetOpen(false); }}
                >
                  <div className={`sheet-radio${isSelected ? " selected" : ""}`} />
                  <div className="sheet-sec-info">
                    <div className={`sheet-sec-name${isSelected ? " selected" : ""}`}>
                      {s === "" ? t("event.allSectors", "Todas las secciones") : s}
                    </div>
                    <div className="sheet-sec-sub">
                      {t("event.ticketsCount", { count })}
                    </div>
                  </div>
                  {min != null && (
                    <div className="sheet-sec-price-wrap">
                      <div className="sheet-sec-price-from">{t("event.from", "desde")}</div>
                      <div className="sheet-sec-price">{fmt(min)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MOBILE: Sort bottom sheet ─────────────────────────────────────── */}
      {sortSheetOpen && (
        <div className="sheet-overlay" onClick={() => setSortSheetOpen(false)}>
          <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle-wrap">
              <div className="sheet-handle" />
            </div>
            <p className="sheet-section-title">{t("event.sortLabel", "Ordenar por")}</p>

            {SORTS.map((label, i) => (
              <div
                key={i}
                className={`sheet-sort-option${sortIdx === i ? " selected" : ""}`}
                onClick={() => { setSortIdx(i); setSortSheetOpen(false); }}
              >
                {label}
                {sortIdx === i && (
                  <div className="sheet-check">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M2 5.5l2.5 2.5L9 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}