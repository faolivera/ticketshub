export interface CardShape {
  id: string;
  slug: string;
  name: string;
  venue: string;
  city: string;
  dates: string[];
  img: string;
  price: string | null;
  priceCurrency: string;
  available: number | null;
  badge: string | null;
  category: string | undefined;
}
