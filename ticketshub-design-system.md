# TicketsHub — Design System

> Documento de referencia para mantener consistencia visual en todos los componentes de la plataforma.
> Última actualización basada en `TicketsHub.jsx` v4.

---

## Principios de marca

TicketsHub opera sobre tres ejes que deben permear cada decisión de diseño:

1. **Hub como concepto central** — punto de encuentro, convergencia, comunidad. El diseño evoca circulación e intercambio, no una tienda unidireccional.
2. **Seriedad y confianza** — tan confiable como un banco, tan deseable como una app de entretenimiento. La reventa tiene mala reputación en LATAM; el diseño combate eso desde el primer scroll.
3. **Calidez humana** — detrás de cada entrada hay personas reales. El tono es cercano, no corporativo ni frío.

**Referencias estéticas:** StubHub (claridad funcional, fondo blanco, jerarquía obvia) + Yorck Kino (personalidad cultural, cards limpias, hero contenido en caja).

---

## Paleta de colores

### Colores de marca

| Token | Valor | Uso |
|-------|-------|-----|
| `V` (Violet) | `#6d28d9` | CTAs primarios, precios, badges activos, pills seleccionadas, focus states |
| `VLIGHT` | `#f0ebff` | Fondo de pill activa, fondo de city dropdown activo |
| `BLUE` | `#1e3a5f` | Trust badges, íconos de confianza, links de soporte |
| `BLIGHT` | `#e4edf7` | Fondo de badge "Compra garantizada" en header |
| `DARK` | `#0f0f1a` | Texto principal, logo, headings. Negro con temperatura azulada |

### Superficies y fondos

| Token | Valor | Uso |
|-------|-------|-----|
| `BG` | `#f3f3f0` | Fondo general de página (warm off-white). También fondo de inputs |
| `CARD` | `#ffffff` | Fondo de cards, search box, hero box, trust cards |
| `BORDER` | `#e5e7eb` | Bordes por defecto, separadores, bordes de cards |
| `BORD2` | `#d1d5db` | Bordes de pills inactivas, botones secundarios |

### Texto

| Token | Valor | Uso |
|-------|-------|-----|
| `DARK` | `#0f0f1a` | Títulos, texto principal |
| `MUTED` | `#6b7280` | Subtítulos, metadatos, labels, texto secundario |
| Blanco con alpha | `rgba(255,255,255,0.7)` | Texto secundario sobre hero oscuro |
| Blanco con alpha | `rgba(255,255,255,0.6)` | Trust micro-signals en hero |

### Colores semánticos (Trust Section)

| Concepto | Icon bg | Icon color |
|----------|---------|------------|
| Escrow / pago | `#eef2ff` | `#4f46e5` |
| Verificación | `#f0fdfa` | `#0f766e` |
| Garantía | `#fffbeb` | `#b45309` |

### Badges de urgencia en cards

| Tipo | Background | Color | Border |
|------|-----------|-------|--------|
| `últimas` | `#fef3c7` | `#92400e` | `1px solid #fde68a` |
| `demanda` | `#fee2e2` | `#991b1b` | `1px solid #fca5a5` |

---

## Tipografía

### Familias

```css
/* Display / Headings */
font-family: 'DM Serif Display', serif;

/* Body / UI */
font-family: 'Plus Jakarta Sans', sans-serif;
```

Import via Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
```

### Escala tipográfica

| Elemento | Familia | Size | Weight | Notas |
|----------|---------|------|--------|-------|
| Logo | DM Serif Display | 20–21px | 400 | `letter-spacing: -0.4px` |
| H1 hero | DM Serif Display | `clamp(24px, 3.2vw, 40px)` | 400 | `line-height: 1.18`, `letter-spacing: -0.5px`. La frase en cursiva usa `color: #c4b5fd` |
| H2 sección | DM Serif Display | `clamp(22px, 2.8vw, 34px)` | 400 | `letter-spacing: -0.3px` |
| H2 grid | DM Serif Display | 24px | 400 | `letter-spacing: -0.3px` |
| Card title | Plus Jakarta Sans | 14px | 700 | `line-height: 1.25` |
| Body / subtítulo hero | Plus Jakarta Sans | 14.5px | 400 | `line-height: 1.65` |
| Labels / meta | Plus Jakarta Sans | 12–13px | 400–500 | Color `MUTED` |
| Precio | Plus Jakarta Sans | 17px | 800 | Color `V` |
| Precio sufijo ARS | Plus Jakarta Sans | 10px | 500 | Color `MUTED` |
| Nav links | Plus Jakarta Sans | 13.5px | 500 | Color `MUTED` |
| Botones | Plus Jakarta Sans | 13–14px | 600–700 | — |
| Badges / pills | Plus Jakarta Sans | 11–12.5px | 600–700 | — |
| Footer body | Plus Jakarta Sans | 13px | 400 | `line-height: 1.6` |

---

## Espaciado y layout

### Contenedor máximo

```css
max-width: 1280px;
margin: 0 auto;
padding: 0 24px;
```

### Grid de eventos

```css
/* Desktop */
grid-template-columns: repeat(4, 1fr);
gap: 18px;

/* Tablet (≤1100px) */
grid-template-columns: repeat(3, 1fr);

/* Mobile (≤680px) */
grid-template-columns: 1fr;
```

### Espaciado de secciones

| Sección | Padding |
|---------|---------|
| Hero box (inner) | `44px` todos los lados |
| Search+filters box | `14px 18px` |
| Grid section | `0 24px 56px` |
| Trust section | `52px 24px` |
| Footer | `40px 24px 26px` |
| Entre hero y search box | `14px` (margin-bottom del hero) |
| Entre search box y grid | `28px` (margin-bottom del search box) |

---

## Bordes y radios

| Elemento | Border radius |
|----------|--------------|
| Hero box | `20px` |
| Search + filters box | `16px` |
| Cards de eventos | `14px` |
| Trust cards | `16px` |
| Botón primario (CTA) | `10px` |
| Botón secundario | `8–10px` |
| Inputs | `10px` |
| City dropdown menu | `12px` |
| Pills / chips | `100px` (fully rounded) |
| Logo icon | `7–8px` |
| Trust icon container | `11–12px` |
| Footer logo icon | `6px` |
| Header logo icon | `7px` |

### Border width estándar
- Cards, boxes: `1px solid BORDER (#e5e7eb)`
- Pills inactivas: `1.5px solid BORD2 (#d1d5db)`
- Pills activas: `1.5px solid V (#6d28d9)`
- Inputs: `1.5px solid BORDER` → on focus: `1.5px solid V`
- Botón "Vender": `1.5px solid V`
- Botón "Publicá la tuya" en hero: `1.5px solid rgba(255,255,255,0.25)`

---

## Sombras

| Elemento | Box shadow |
|----------|-----------|
| Hero box | `0 2px 12px rgba(0,0,0,0.06)` |
| Search box | `0 2px 10px rgba(0,0,0,0.05)` |
| Cards en reposo | `0 1px 4px rgba(0,0,0,0.05)` |
| Cards en hover | `0 10px 28px rgba(109,40,217,0.12), 0 2px 6px rgba(0,0,0,0.06)` |
| Trust cards | `0 1px 4px rgba(0,0,0,0.04)` |
| CTA primario violeta | `0 4px 18px rgba(109,40,217,0.28–0.40)` |
| Input on focus | `0 0 0 3px rgba(109,40,217,0.1)` |

---

## Componentes

### Header

- `position: sticky; top: 0; z-index: 100`
- Background: `rgba(243,243,240,0.97)` con `backdrop-filter: blur(16px)`
- Altura: `58px`
- Border bottom: `1px solid BORDER`
- Logo + nav a la izquierda, trust badge + CTA vender + hamburger a la derecha
- Trust badge "Compra garantizada": background `BLIGHT`, color `BLUE`, pill `border-radius: 100px`
- Mobile: hamburger menu, se ocultan nav links, trust badge y sell CTA

### Hero Box

- Caja con `border-radius: 20px`, `background: white`, sombra sutil
- Imagen de fondo full-bleed con overlay gradiente:
  ```css
  background: linear-gradient(105deg,
    rgba(15,15,26,0.88) 0%,
    rgba(15,15,26,0.72) 40%,
    rgba(15,15,26,0.25) 75%,
    rgba(15,15,26,0.1) 100%
  );
  ```
- Layout interno: copy a la izquierda (max-width 480px) + imagen decorativa a la derecha (se oculta en mobile)
- El H1 usa cursiva en la segunda frase: `<em style="color: #c4b5fd; font-style: italic">`
- Trust micro-signals: íconos en `#a78bfa`, texto en `rgba(255,255,255,0.6)`

### Search + Filters Box

- `background: white`, `border-radius: 16px`, `padding: 14px 18px`
- Layout: `[search input flex:1] | [separador 1px] | [city dropdown] | [separador 1px] | [pills de categoría]`
- Todo en una sola línea; `overflow-x: auto` en las pills para mobile
- Separadores: `width: 1px, height: 28px, background: BORD2`
- Separado del hero por `14px`, del grid por `28px`

#### Search input
- `padding: 9px 12px 9px 36px` (ícono de lupa a la izquierda en `left: 12px`)
- Border: `1.5px solid BORDER`, on focus: `1.5px solid V` + shadow

#### City dropdown
- Trigger: pill con `background: BG`, border `1.5px solid BORDER`, on open: `background: VLIGHT`, border `1.5px solid V`
- Menu desplegable: `border-radius: 12px`, `box-shadow: 0 8px 28px rgba(0,0,0,0.1)`, `min-width: 210px`
- Incluye search input interno para filtrar ciudades
- Opción activa: `background: VLIGHT`, `color: V`, `font-weight: 600` + ícono check

#### Category pills
- Inactiva: `background: transparent`, `border: 1.5px solid BORD2`, `color: MUTED`
- Activa: `background: V`, `border: 1.5px solid V`, `color: white`
- `padding: 5px 13px`, `border-radius: 100px`, `font-size: 12.5px`, `font-weight: 600`

### Event Card

#### Imagen
- Proporción `4:3` (`aspect-ratio: 4/3`)
- Fuente de imagen: `picsum.photos/seed/{id}/600/600` (cuadrada, se recorta con `object-fit: cover; object-position: center top`)
- Overlay: `linear-gradient(to top, rgba(15,15,26,0.55) 0%, transparent 52%)`
- Hover: `scale(1.05)` con `transition: 0.38s ease`

#### Badges sobre imagen
- **Urgencia (top-left):** pill amarilla/roja según tipo (ver tabla de badges)
- **Multi-fecha (top-right):** `background: rgba(109,40,217,0.82)`, `backdrop-filter: blur(6px)`, texto blanco — muestra "N fechas"
- **Disponibles (bottom-right, cuando no hay badge de urgencia):** `background: rgba(0,0,0,0.45)`, texto blanco

#### Selector de fechas
- **Un evento con una sola fecha:** pill estática no-interactiva con `border: 1.5px solid BORD2`, `color: MUTED`, `background: transparent`
- **Un evento con múltiples fechas:** pills clickeables horizontales con scroll
  - Inactiva: `border: 1.5px solid BORD2`, `color: MUTED`, `background: transparent`
  - Activa: `border: 1.5px solid V`, `color: V`, `background: VLIGHT`
- Formato de fecha: `"28 Mar · 21:00hs"` (fecha y hora juntas en el mismo string, siempre)
- `font-size: 11.5px`, `font-weight: 600`, `padding: 4px 10px`, `border-radius: 100px`

#### Hover state de card
- `transform: translateY(-3px)`
- `box-shadow: 0 10px 28px rgba(109,40,217,0.12), 0 2px 6px rgba(0,0,0,0.06)`
- `transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)` (leve spring effect)
- Botón "Ver →": al hacer hover en la card, cambia a `background: V`, `color: white`

### Trust Section

- `background: white`, `border-top` y `border-bottom` con `BORDER`
- Eyebrow label: uppercase, `font-size: 11.5px`, `font-weight: 700`, `letter-spacing: 0.07em`, color `BLUE`
- 3 cards en grid `repeat(auto-fit, minmax(250px, 1fr))`, gap `18px`
- Cada card: icon container `44×44px`, `border-radius: 11px`, colores semánticos propios
- Título card: `16px`, `font-weight: 700`
- Texto card: `13.5px`, `line-height: 1.65`, color `MUTED`

### Footer

- `background: DARK (#0f0f1a)`, texto `rgba(255,255,255,0.5)`
- Grid `repeat(auto-fit, minmax(150px, 1fr))`
- Logo + blurb de marca + 3 columnas de links + columna de CTA vendedores
- CTA vendedores: botón violeta `background: V`
- Línea inferior con copyright y badge de escrow (shield icon en `#a78bfa`)

---

## Animaciones y transiciones

| Elemento | Transición |
|----------|-----------|
| Cards hover | `all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)` — leve spring |
| Imagen en card hover | `transform: scale(1.05)` en `0.38s ease` |
| Pills categoría | `all 0.14s ease` |
| City dropdown chevron | `transform: rotate(180deg)` en `0.14s` |
| Botón "Ver →" en card | `all 0.16s` |
| Inputs | `border-color 0.18s, box-shadow 0.18s` |
| City dropdown trigger | `background 0.14s` |

---

## Iconografía

Se usan dos estrategias:
1. **Lucide React** para íconos funcionales de UI: `Search`, `ArrowRight`, `Menu`, `X`, `Zap`, `TrendingUp`, `ChevronDown`, `Check`, `Lock`, `CheckCircle`, `RefreshCw`
2. **SVG inline custom** para íconos de marca:
   - `HubSVG` — ícono del logo: círculo central con 8 rayos (concepto hub)
   - `ShieldSVG` — garantía/confianza
   - `MapSVG` — selector de ciudad
   - `CheckSVG` — micro-signal en hero
   - `UsersSVG` — micro-signal en hero

---

## Imágenes

- Source: `https://picsum.photos/seed/{seed}/600/600` para cards (imagen cuadrada, crop 4:3 vía CSS)
- Hero background: `https://picsum.photos/seed/hero_concert_wide/1400/400`
- Seeds fijos por evento para consistencia entre renders

---

## Responsive / Breakpoints

| Breakpoint | Comportamiento |
|------------|----------------|
| `≤1100px` | Grid de 4 → 3 columnas |
| `≤820px` | Hero: se oculta imagen lateral, layout se apila |
| `≤768px` | Header: se ocultan nav links, trust badge, sell CTA → aparece hamburger |
| `≤680px` | Grid de 3 → 1 columna |

---

## Estructura de página

```
Header (sticky, z:100)
│
├── [BG: #f3f3f0, padding: 24px]
│   ├── Hero Box (border-radius: 20px, bg: white)
│   │   └── Imagen fondo + overlay + copy + CTAs + micro-signals
│   │
│   └── Search + Filters Box (border-radius: 16px, bg: white)
│       └── [Search input] | [Ciudad dropdown] | [Category pills]
│
├── Events Grid (padding: 0 24px 56px)
│   └── 4×N cards de eventos
│
├── Trust Section (bg: white, full-width)
│   └── 3 cards de confianza
│
└── Footer (bg: #0f0f1a, full-width)
    └── 5 columnas + línea de copyright
```

---

## Convenciones de código

```js
// Tokens como constantes en el scope del módulo
const V      = "#6d28d9";
const VLIGHT = "#f0ebff";
const BLUE   = "#1e3a5f";
const DARK   = "#0f0f1a";
const MUTED  = "#6b7280";
const BG     = "#f3f3f0";
const CARD   = "#ffffff";
const BORDER = "#e5e7eb";
const BORD2  = "#d1d5db";

// Shortcuts de fontFamily
const S = { fontFamily: "'Plus Jakarta Sans', sans-serif" };  // sans
const E = { fontFamily: "'DM Serif Display', serif" };         // editorial/serif

// Todos los estilos via inline style objects (no Tailwind, no CSS modules)
// CSS global mínimo vía <style> tag para: grid responsive, media queries,
// hover states que necesitan :hover pseudo-selector, scrollbar hiding
```

---

## Anti-patterns a evitar

- ❌ No usar Inter, Roboto, Arial, System UI
- ❌ No fondos oscuros fuera del hero (el único bloque que puede ser oscuro)
- ❌ No gradientes de color saturado en secciones que no sean el hero
- ❌ No cards con imagen en proporción 1:1 — usar 4:3
- ❌ No mostrar fecha y hora en campos separados — siempre juntas: `"28 Mar · 21:00hs"`
- ❌ No layouts de template predecibles o estética genérica de AI
- ❌ No usar `localStorage` ni `sessionStorage`
- ❌ No colapsar search y filtros dentro del hero — son elementos separados
- ❌ No pill de categoría sin separador visual respecto al dropdown de ciudad
