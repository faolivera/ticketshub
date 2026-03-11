/**
 * DTO for injecting meta into the SPA index.html.
 * All URLs must be absolute (canonical, og:image).
 */
export interface PageMetaDto {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
  ogType: string;
}

/** Default and static route meta (Spanish). Keys match frontend i18n seo.* (es.json). */
export const SSR_STATIC_META: Record<
  string,
  { title: string; description: string }
> = {
  default: {
    title: 'TicketsHub – Compra y Vende Entradas con Seguridad',
    description:
      'Compra y vende entradas con protección al comprador. Conciertos, deportes y más.',
  },
  landing: {
    title: 'TicketsHub – Compra y Vende Entradas con Seguridad',
    description:
      'Encontrá entradas para conciertos, deportes y eventos con protección al comprador. Depósito en garantía seguro.',
  },
  login: {
    title: 'Iniciar Sesión | TicketsHub',
    description:
      'Iniciá sesión en tu cuenta TicketsHub para comprar o vender entradas.',
  },
  register: {
    title: 'Crear Cuenta | TicketsHub',
    description:
      'Unite a TicketsHub para comprar y vender entradas con protección al comprador.',
  },
  howItWorks: {
    title: 'Cómo Funciona | TicketsHub',
    description:
      'Conocé cómo nuestro sistema de depósito en garantía protege a compradores y vendedores.',
  },
  contact: {
    title: 'Contacto | TicketsHub',
    description:
      'Contactanos. Estamos para ayudarte con tus compras y ventas de entradas.',
  },
  notFound: {
    title: 'Página No Encontrada | TicketsHub',
    description:
      'La página que buscás no existe o fue movida.',
  },
  eventTickets: {
    title: '{{eventName}} – Entradas | TicketsHub',
    description:
      'Comprá entradas para {{eventName}}. Pago seguro y protección al comprador.',
  },
  sellerProfile: {
    title: '{{sellerName}} – Vendedor | TicketsHub',
    description:
      'Perfil de {{sellerName}} y entradas disponibles en TicketsHub.',
  },
  buyTicket: {
    title: 'Comprar – {{eventName}} | TicketsHub',
    description:
      'Completá tu compra de entradas para {{eventName}}. Checkout seguro con protección.',
  },
};
