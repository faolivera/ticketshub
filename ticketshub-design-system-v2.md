# TicketsHub — Design System v2

> Documento de referencia para mantener consistencia visual en todos los componentes de la plataforma.
> Actualizado con jerarquía tipográfica completa, tokens semánticos de estado y reglas de uso de color para números.

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
| `V` | `#6d28d9` | CTAs primarios, precios de browse, precios totales en checkout, badges activos, pills seleccionadas, focus states |
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
| `DARK` | `#0f0f1a` | Títulos, texto principal, números de desglose en checkout |
| `MUTED` | `#6b7280` | Subtítulos, metadatos, labels, precio unitario ARS |
| Blanco | `#ffffff` | Texto sobre hero oscuro, botones primarios |
| Blanco secundario | `rgba(255,255,255,0.7)` | Subtítulo de hero, venue/ciudad en hero de evento |
| Blanco terciario | `rgba(255,255,255,0.6)` | Trust micro-signals en hero |

### Colores semánticos de estado *(nuevo en v2)*

Estos tokens son los únicos verdes, ambar y rosados permitidos en el sistema. No usar otros valores de green, red o amber fuera de estos.

#### SUCCESS — Completado / Verificado

| Token | Valor | Uso |
|-------|-------|-----|
| `SUCCESS` | `#16a34a` | Texto "Completado", "Verificado", checkmarks de stepper, heading "Transacción completada" |
| `SUCCESS_LIGHT` | `#dcfce7` | Fondo de caja "Transacción completada", fondo de badge "Vendedor Verificado" |
| `SUCCESS_BORDER` | `#bbf7d0` | Borde de badge/box de éxito |
| `SUCCESS_ICON` | `#15803d` | Íconos dentro de fondos SUCCESS_LIGHT |

```
Ejemplo de uso: badge "Vendedor Verificado"
background: SUCCESS_LIGHT (#dcfce7)
color: SUCCESS (#16a34a)
border: 1px solid SUCCESS_BORDER (#bbf7d0)
```

#### PENDING — En espera / Fondos protegidos

| Token | Valor | Uso |
|-------|-------|-----|
| `PENDING` | `#d97706` | Dot de estado "Esperando a TicketsHub", "Fondos protegidos" |
| `PENDING_LIGHT` | `#fef3c7` | Fondo de badge de estado pendiente |
| `PENDING_BORDER` | `#fde68a` | Borde de badge pendiente |

#### URGENT — Tiempo limitado / Últimas entradas

| Token | Valor | Uso |
|-------|-------|-----|
| `URGENT` | `#be185d` | Texto "Tiempo limitado para pagar" |
| `URGENT_LIGHT` | `#fce7f3` | Fondo del badge de urgencia temporal |
| `URGENT_BORDER` | `#fbcfe8` | Borde del badge de urgencia temporal |

> **Nota:** El badge "últimas entradas" en cards de browse mantiene el estilo existente de ámbar (`#fef3c7` / `#92400e`). El token URGENT es exclusivo para urgencia de tiempo en flujo de compra (checkout, mis entradas).

#### CANCELLED — Cancelada / Inactivo

No usar rojo. Las transacciones canceladas se muestran en `MUTED (#6b7280)` sobre fondo blanco. La ausencia de color comunica neutralidad, no error.

#### INFO — Mensajes informativos / Escrow

| Token | Valor | Uso |
|-------|-------|-----|
| `INFO` | `#2563eb` | Íconos informativos (escrow, shield) |
| `INFO_LIGHT` | `#eff6ff` | Fondo de caja informativa ("Tu compra está protegida...") |
| `INFO_BORDER` | `#bfdbfe` | Borde de caja informativa |

### Badges de urgencia en cards de browse

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

---

### Jerarquía tipográfica completa *(revisada en v2)*

La regla estructural es simple: **DM Serif Display para títulos que dan nombre e identidad; Plus Jakarta Sans para todo lo que organiza y explica.**

#### T1 — Display Hero

| Propiedad | Valor |
|-----------|-------|
| Familia | DM Serif Display |
| Tamaño | `clamp(24px, 3.2vw, 40px)` |
| Weight | 400 |
| Line-height | 1.18 |
| Letter-spacing | `-0.5px` |
| Color | blanco (sobre hero oscuro) |
| Uso | Nombre del artista/evento en el hero del homepage y en el hero de la página de evento |

```jsx
// Ejemplo: hero homepage y evento
<h1 style={{ fontFamily: E, fontSize: "clamp(24px,3.2vw,40px)", fontWeight: 400, letterSpacing: "-0.5px", lineHeight: 1.18, color: "white" }}>
  Fito Paez
</h1>
```

---

#### T2 — Page Title (H1 de páginas utilitarias)

> ⚠️ **Bug actual:** "Mis Entradas", "Mis Ventas" y "Mi Perfil" están usando Plus Jakarta Sans. Deben migrar a DM Serif Display.

| Propiedad | Valor |
|-----------|-------|
| Familia | DM Serif Display |
| Tamaño | `28px` |
| Weight | 400 |
| Letter-spacing | `-0.3px` |
| Color | `DARK (#0f0f1a)` |
| Uso | "Mis Entradas", "Mis Ventas", "Mi Perfil". Toda página cuya ruta es `/mis-*` o `/perfil` |

```jsx
<h1 style={{ ...E, fontSize: 28, fontWeight: 400, letterSpacing: "-0.3px", color: DARK }}>
  Mis Entradas
</h1>
```

---

#### T3 — Section Heading (H2)

| Propiedad | Valor |
|-----------|-------|
| Familia | DM Serif Display |
| Tamaño | `clamp(20px, 2.4vw, 26px)` |
| Weight | 400 |
| Letter-spacing | `-0.3px` |
| Color | `DARK` |
| Uso | Secciones mayores dentro de una página: "Próximos eventos", "Entradas disponibles" |

---

#### T4 — Card / Panel Heading (H3) *(nuevo en v2)*

Headings funcionales dentro de cards, paneles laterales y secciones de formulario. **Siempre Plus Jakarta Sans**, nunca DM Serif — son funcionales, no editoriales.

| Propiedad | Valor |
|-----------|-------|
| Familia | Plus Jakarta Sans |
| Tamaño | `16px` |
| Weight | `700` |
| Line-height | 1.3 |
| Color | `DARK` |
| Uso | "Resumen de Pago", "Estado de la Transacción", "Dejar una Reseña", "Información del Vendedor", "¿Necesitás Ayuda?", "Información de Pago" |

```jsx
<h3 style={{ ...S, fontSize: 16, fontWeight: 700, lineHeight: 1.3, color: DARK }}>
  Estado de la Transacción
</h3>
```

---

#### T5 — Card Title (título de item en listing/historial) *(nuevo en v2)*

Nombre de artista/evento dentro de una card de browse o fila de historial. No confundir con T1 (hero) ni con T4 (heading de panel).

| Propiedad | Valor |
|-----------|-------|
| Familia | Plus Jakarta Sans |
| Tamaño | `14px` |
| Weight | `700` |
| Line-height | 1.25 |
| Color | `DARK` |
| Uso | "Fito Paez" en tarjeta de browse, "Bersuit Vergarabat" en historial |

---

#### T6 — Body

| Propiedad | Valor |
|-----------|-------|
| Familia | Plus Jakarta Sans |
| Tamaño | `14px` |
| Weight | `400` |
| Line-height | 1.65 |
| Color | `DARK` o `MUTED` según contexto |
| Uso | Descripciones, texto de soporte, copy de vendor, mensajes informativos |

---

#### T7 — Label / Eyebrow

Uppercase siempre. No usar para texto de longitud mayor a 4 palabras.

| Propiedad | Valor |
|-----------|-------|
| Familia | Plus Jakarta Sans |
| Tamaño | `11px` |
| Weight | `700` |
| Text-transform | `uppercase` |
| Letter-spacing | `0.07em` |
| Color | `MUTED (#6b7280)` |
| Uso | "SECTOR", "CANTIDAD", "VENDEDOR", "MÉTODO DE PAGO", "CORREO", "TELÉFONO", "SELECCIONÁ UNA FECHA", "RESEÑA DE LA OTRA PARTE" |

```jsx
<span style={{ ...S, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: MUTED }}>
  SECTOR
</span>
```

---

#### T8 — Meta / Caption

| Propiedad | Valor |
|-----------|-------|
| Familia | Plus Jakarta Sans |
| Tamaño | `12–13px` |
| Weight | `400` (datos) / `500` (destacado) |
| Color | `MUTED` |
| Uso | Venue, ciudad, fechas en cards, "2 ventas · 100% positivas", "Comisión incluida", "Compra protegida" |

---

#### T9 — Nav / Links

| Propiedad | Valor |
|-----------|-------|
| Familia | Plus Jakarta Sans |
| Tamaño | `13.5px` |
| Weight | `500` |
| Color | `MUTED` |
| Uso | Links de navegación en header, breadcrumbs "← Atrás" |

---

### Tipografía de precios y números *(regla crítica, nueva en v2)*

Los números tienen su propia sub-jerarquía con reglas de color explícitas:

#### Precio primario de browse (tarjetas, headers de evento)

```
"DESDE $180.000 ARS"

"DESDE" / "ARS":  Plus Jakarta Sans 500, 10–11px, MUTED
"$180.000":        Plus Jakarta Sans 800, 17px, V (#6d28d9)
```

Aplica a: tarjetas en homepage, filtros de sector ("General $180.000"), header de evento ("5 entradas disponibles · desde $180.000 ARS").

#### Precio de listing (TOTAL A PAGAR en cards de ticket)

```
"TOTAL A PAGAR"  → T7 Label
"$198.000"       → Plus Jakarta Sans 800, 22–24px, DARK (#0f0f1a)
"ARS"            → Plus Jakarta Sans 500, 12px, MUTED
```

> **Regla:** El precio en una card de oferta individual (listing de tickets para comprar) usa **DARK**, no violeta. El color violeta queda para el total final en checkout y para el precio orientativo de browse. Esto crea una jerarquía visual: "este es el número que importa ahora" (checkout, V) vs. "este es el precio de esta oferta específica" (listing, DARK).

#### Total en checkout

```
"Total"           → Plus Jakarta Sans 600, 15px, DARK
"$207.000,00"     → Plus Jakarta Sans 800, 22px, V (#6d28d9)
```

#### Desglose en checkout (line items)

```
"Precio por entradas   $180.000,00"
"Precio por servicio   $27.000,00"

Label:    Plus Jakarta Sans 400, 14px, DARK
Valor:    Plus Jakarta Sans 600, 14px, DARK
Subtexto: Plus Jakarta Sans 400, 12px, MUTED  ("$180.000 x 1", "15%")
```

#### Regla de formato de número *(nueva en v2)*

| Contexto | Formato | Ejemplo |
|----------|---------|---------|
| Browse (cards, filtros, headers) | Sin decimales | `$180.000` |
| Checkout (desglose y total) | Con decimales | `$180.000,00` |
| Transaction detail (desglose e historial) | Con decimales | `$220.000,00` |

> Usar siempre punto como separador de miles (`.`) y coma como separador decimal (`,`), consistente con el estándar argentino.

---

## Tabla resumen de jerarquía tipográfica

| Nivel | Nombre | Familia | Size | Weight | Color | Casos de uso |
|-------|--------|---------|------|--------|-------|-------------|
| T1 | Display Hero | DM Serif Display | clamp(24,3.2vw,40px) | 400 | white | Hero homepage, hero evento |
| T2 | Page Title | DM Serif Display | 28px | 400 | DARK | "Mis Entradas", "Mi Perfil", "Mis Ventas" |
| T3 | Section Heading | DM Serif Display | clamp(20,2.4vw,26px) | 400 | DARK | "Próximos eventos", "Entradas disponibles" |
| T4 | Card/Panel Heading | Plus Jakarta Sans | 16px | 700 | DARK | "Resumen de Pago", "Estado de la Transacción" |
| T5 | Card Title | Plus Jakarta Sans | 14px | 700 | DARK | Nombre de evento en card de browse/historial |
| T6 | Body | Plus Jakarta Sans | 14px | 400 | DARK/MUTED | Texto general, descripciones |
| T7 | Label/Eyebrow | Plus Jakarta Sans | 11px | 700 | MUTED | "SECTOR", "CANTIDAD" (uppercase siempre) |
| T8 | Meta/Caption | Plus Jakarta Sans | 12–13px | 400–500 | MUTED | Venue, fecha, stats de vendedor |
| T9 | Nav | Plus Jakarta Sans | 13.5px | 500 | MUTED | Links de header, breadcrumbs |
| P1 | Precio browse | Plus Jakarta Sans | 17px | 800 | V | "DESDE $180.000" en cards |
| P2 | Precio listing | Plus Jakarta Sans | 22–24px | 800 | DARK | "TOTAL A PAGAR $198.000" en listing |
| P3 | Total checkout | Plus Jakarta Sans | 22px | 800 | V | Total final en checkout y resumen de pago |

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
| Badge de estado (SUCCESS, PENDING, URGENT) | `100px` (fully rounded) |

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
- Overlay: `linear-gradient(to top, rgba(15,15,26,0.55) 0%, transparent 52%)`
- Hover: `scale(1.05)` con `transition: 0.38s ease`

#### Badges sobre imagen
- **Urgencia (top-left):** pill amarilla/roja según tipo (ver tabla de badges)
- **Multi-fecha (top-right):** `background: rgba(109,40,217,0.82)`, `backdrop-filter: blur(6px)`, texto blanco — muestra "N fechas"
- **Disponibles (bottom-right):** `background: rgba(0,0,0,0.45)`, texto blanco

#### Selector de fechas
- Pill única estática: `border: 1.5px solid BORD2`, `color: MUTED`, `background: transparent`
- Pills de múltiples fechas — inactiva: `border: 1.5px solid BORD2`, `color: MUTED`
- Pills de múltiples fechas — activa: `border: 1.5px solid V`, `color: V`, `background: VLIGHT`
- Formato: `"28 Mar · 21:00hs"` (fecha y hora siempre juntas)
- `font-size: 11.5px`, `font-weight: 600`, `padding: 4px 10px`, `border-radius: 100px`

#### Hover state de card
- `transform: translateY(-3px)`
- `box-shadow: 0 10px 28px rgba(109,40,217,0.12), 0 2px 6px rgba(0,0,0,0.06)`
- `transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)`
- Botón "Ver →": al hacer hover, `background: V`, `color: white`

### Badge de estado (Verified / Status) *(nuevo en v2)*

```jsx
// Vendedor Verificado
{
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "3px 9px",
  borderRadius: 100,
  background: SUCCESS_LIGHT,   // #dcfce7
  color: SUCCESS,              // #16a34a
  border: `1px solid ${SUCCESS_BORDER}`,
  fontSize: 12,
  fontWeight: 600,
}

// Cancelada (historial)
{
  color: MUTED,
  fontSize: 13,
  fontWeight: 500,
}

// Tiempo limitado para pagar
{
  background: URGENT_LIGHT,   // #fce7f3
  color: URGENT,              // #be185d
  border: `1px solid ${URGENT_BORDER}`,
  borderRadius: 100,
  fontSize: 12,
  fontWeight: 600,
  padding: "3px 10px",
}
```

### Transaction Stepper *(nuevo en v2)*

- Círculo completado: `background: SUCCESS (#16a34a)`, ícono check blanco
- Línea completada: `background: SUCCESS`
- Círculo activo (en progreso): `border: 2px solid V`, `background: white`, número en `V`
- Círculo pendiente: `border: 2px solid BORD2`, `background: white`, número en `MUTED`
- Labels de paso: T8 (Meta), `font-size: 12px`, `font-weight: 500`, `color: MUTED` (completado: `color: DARK`)

### Trust Section

- `background: white`, `border-top` y `border-bottom` con `BORDER`
- Eyebrow label: T7 style, color `BLUE`
- 3 cards en grid `repeat(auto-fit, minmax(250px, 1fr))`, gap `18px`
- Cada card: icon container `44×44px`, `border-radius: 11px`, colores semánticos propios
- Título card: T4 style (`16px`, `700`)
- Texto card: T8 style (`13.5px`, `line-height: 1.65`, `MUTED`)

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

// Marca
const V        = "#6d28d9";
const VLIGHT   = "#f0ebff";
const BLUE     = "#1e3a5f";
const BLIGHT   = "#e4edf7";

// Base
const DARK     = "#0f0f1a";
const MUTED    = "#6b7280";
const BG       = "#f3f3f0";
const CARD     = "#ffffff";
const BORDER   = "#e5e7eb";
const BORD2    = "#d1d5db";

// Estado: Success
const SUCCESS        = "#16a34a";
const SUCCESS_LIGHT  = "#dcfce7";
const SUCCESS_BORDER = "#bbf7d0";

// Estado: Pending
const PENDING        = "#d97706";
const PENDING_LIGHT  = "#fef3c7";
const PENDING_BORDER = "#fde68a";

// Estado: Urgent
const URGENT         = "#be185d";
const URGENT_LIGHT   = "#fce7f3";
const URGENT_BORDER  = "#fbcfe8";

// Estado: Info
const INFO           = "#2563eb";
const INFO_LIGHT     = "#eff6ff";
const INFO_BORDER    = "#bfdbfe";

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
- ❌ No usar Plus Jakarta Sans para H1 de páginas utilitarias — siempre DM Serif Display (T2)
- ❌ No usar violeta (`V`) para números en cards de listing individual — solo para precios de browse y totales de checkout
- ❌ No inventar un verde, ámbar o rosa nuevo — usar exclusivamente los tokens SUCCESS / PENDING / URGENT definidos
- ❌ No mostrar decimales en precios de browse — solo en contextos de checkout y detalle de transacción
- ❌ No aplicar DM Serif Display a headings funcionales dentro de cards (T4) — esos van en Plus Jakarta Sans 700
