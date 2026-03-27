import type { PublicListEventItem } from "@/api/types/events";
import { formatDate } from "@/lib/format-date";
import {
  TRUST_ESCROW,
  TRUST_ESCROW_BG,
  TRUST_VERIFIED,
  TRUST_VERIFIED_BG,
  AMBER_c1,
  ABG,
} from "@/lib/design-tokens";
import { Lock, CheckCircle, RefreshCw } from "lucide-react";
import type { CardShape } from "./types";

const DEFAULT_IMAGE = "https://picsum.photos/seed/event/600/600";

/** Maps landing pill label to API EventCategory */
export const CAT_TO_API: Record<string, string> = {
  Recital: "Concert",
  Festival: "Festival",
  Teatro: "Theater",
  Deportes: "Sports",
  Electrónica: "Other",
  Conferencia: "Conference",
  Comedia: "Comedy",
};

/** Maps API EventCategory to landing pill label */
export const API_TO_CAT: Record<string, string> = {
  Concert:    "Recital",
  Festival:   "Festival",
  Theater:    "Teatro",
  Sports:     "Deportes",
  Other:      "Electrónica",
  Conference: "Conferencia",
  Comedy:     "Comedia",
};

export const TRUST = [
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

/**
 * Transform API event to card shape. Only approved future dates are included, formatted as "DD Mon · HH:mm".
 */
export function eventToCardShape(apiEvent: PublicListEventItem): CardShape {
  const now = new Date();
  const approvedDates = (apiEvent.dates || []).filter(
    (d) => d.status === "approved" && new Date(d.date) >= now,
  );
  const datesFormatted = approvedDates.map((d) => {
    const dateStr = typeof d.date === "string" ? d.date : d.date;
    return formatDate(dateStr, { month: "short", day: "numeric" });
  });
  const img =
    apiEvent.bannerUrls?.rectangle ||
    apiEvent.bannerUrls?.square ||
    apiEvent.images?.[0]?.src ||
    DEFAULT_IMAGE;
  const lp = apiEvent.lowestListingPriceWithFees;
  const priceMinor = lp?.amount;
  const priceDisplay =
    priceMinor != null && !Number.isNaN(priceMinor)
      ? (priceMinor / 100).toLocaleString("es-AR", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
      : null;
  const priceCurrency = lp?.currency || "ARS";

  return {
    id: apiEvent.id,
    slug: apiEvent.slug,
    name: apiEvent.name || "",
    venue: apiEvent.venue || "",
    city: apiEvent.location?.city || "",
    dates: datesFormatted,
    img,
    price: priceDisplay,
    priceCurrency,
    available: null,
    badge: null,
    category: apiEvent.category,
  };
}
