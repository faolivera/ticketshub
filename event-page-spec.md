# TicketsHub — Event Page Redesign Spec
> Archivo de referencia visual para Claude Code. NO es código a copiar —
> es la especificación de lo que debe quedar. Los tokens están expresados
> en Tailwind cuando es posible.

---

## Estructura general de la página

```
[Header — sin cambios]
[BG: bg-[#f3f3f0] — toda la página]
  ├── Breadcrumb
  ├── Hero Box  ← contenido en caja, NO full-bleed
  ├── Listing header (título + sort)
  ├── Filter pills
  ├── Grid 2 columnas → EventTicketCard × N
  └── Sell Banner
```

---

## 1. Fondo de página

```
bg-[#f3f3f0]  (warm off-white, igual que el landing)
```
Antes era oscuro. Ahora todo el layout vive sobre este fondo claro.

---

## 2. Hero Box

### Contenedor
```
rounded-[20px]  overflow-hidden  shadow-sm
mb-3.5          (14px gap hasta el search/listing)
min-h-[320px]   relative
```

El hero sigue siendo oscuro adentro — la imagen borrosa del evento
con overlay oscuro se mantiene igual. Lo que cambia es que ahora
está CONTENIDO en una caja que flota sobre el fondo #f3f3f0,
con border-radius. NO es full-bleed.

### Imagen de fondo + blur
```
absolute inset-0
bg-cover bg-center
[filter:blur(0px)]   ← la imagen actual sin blur extra está bien
```
Mantener exactamente como está hoy, solo asegurarse de que quede
dentro del contenedor con overflow-hidden.

### Overlay
```
absolute inset-0
bg-gradient-to-r
  from-[rgba(15,15,26,0.94)]
  via-[rgba(15,15,26,0.72)]
  to-[rgba(15,15,26,0.10)]
```

### Contenido del hero (sobre el overlay)
```
relative z-10  p-11  max-w-xl
flex flex-col
```

#### Badge de categoría
```
inline-flex items-center
bg-[rgba(109,40,217,0.75)] backdrop-blur-sm
text-white text-[11px] font-bold tracking-widest uppercase
px-3 py-1 rounded-full  mb-3.5
```

#### Título del artista
```
font-['DM_Serif_Display']
text-[clamp(30px,3.6vw,46px)]
text-white  leading-[1.1]  tracking-tight  mb-2.5
```

#### Venue
```
flex items-center gap-1.5
text-[13.5px] font-medium text-white/65  mb-6
```

#### Pills de fecha
- Inactiva: `border border-white/20 text-white/65 bg-transparent`
- Activa:   `bg-[#6d28d9] border-[#6d28d9] text-white`
```
px-3.5 py-1.5 rounded-full text-xs font-semibold
transition-all duration-150  cursor-pointer
font-['Plus_Jakarta_Sans']
```

#### Resumen de stock (REEMPLAZA el CTA "Ver entradas")
```
text-[13px] text-white/55  mb-5
```
Texto: `"{N} entradas disponibles · desde ${precio_min} ARS"`
Datos reales del evento. NO es un botón.

#### Trust micro-signals
```
flex gap-5 flex-wrap
```
Cada item:
```
flex items-center gap-1.5
text-xs text-white/55
```
Iconos en `text-[#a78bfa]`

---

## 3. Listing header

```
flex items-start justify-between flex-wrap gap-3  mb-3.5
```

### Título
```
font-['DM_Serif_Display'] text-2xl tracking-tight text-[#0f0f1a]
```
Texto: "Entradas disponibles"

### Subtítulo/meta
```
text-[12.5px] text-[#6b7280]  mt-0.5
```
Texto: "20/03/2026 · 00:00hs · 5 opciones"

### Sort select
```
font-['Plus_Jakarta_Sans'] text-[13px] font-medium
bg-white border border-[#e5e7eb] rounded-[10px]
px-3 py-1.5
focus:border-[#6d28d9] focus:ring-2 focus:ring-[#6d28d9]/10
```

---

## 4. Filter pills (sector/categoría)

- Inactiva: `border-[1.5px] border-[#d1d5db] text-[#6b7280] bg-transparent`
- Activa:   `bg-[#6d28d9] border-[#6d28d9] text-white`
```
px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold
transition-all duration-150  cursor-pointer
```

---

## 5. Grid

```
grid grid-cols-2 gap-3.5
md:grid-cols-2   (mantener 2 columnas)
sm:grid-cols-1   (1 columna en mobile ≤768px)
```

---

## 6. EventTicketCard.tsx — rediseño

### Wrapper
```
bg-white border border-[#e5e7eb] rounded-[14px]
p-5 pb-4
shadow-[0_1px_4px_rgba(0,0,0,0.05)]
flex flex-col
transition-all duration-[220ms] [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]
hover:-translate-y-[3px]
hover:shadow-[0_10px_28px_rgba(109,40,217,0.12),0_2px_6px_rgba(0,0,0,0.06)]
```

---

### A) Top row
```
flex items-center justify-between  mb-4
```

**Categoría** (izquierda):
```
text-[11.5px] font-bold text-[#6b7280] uppercase tracking-[0.07em]
```

**Badges** (derecha) — mantener lógica actual, solo cambiar estilos:

Badge cantidad (ej. "1 entrada"):
```
text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full
bg-[#f3f3f0] text-[#6b7280] border-[1.5px] border-[#d1d5db]
```

Badge rango (ej. "Comprá 1 a 3"):
```
text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full
bg-[#f0ebff] text-[#6d28d9] border-[1.5px] border-[#c4b5fd]
```

Badge urgencia ("Última"):
```
text-[11px] font-bold px-2.5 py-0.5 rounded-full
bg-[#fef3c7] text-[#92400e] border border-[#fde68a]
```

---

### B) Bloque de precio ← CAMBIO MÁS IMPORTANTE

```
mb-1
```

Eyebrow label:
```
text-[10.5px] font-bold text-[#6b7280] uppercase tracking-[0.08em]  mb-0.5
```
Texto fijo: "Total a pagar"

Precio principal (total con comisión):
```
text-[26px] font-extrabold text-[#6d28d9] tracking-tight leading-none
flex items-baseline gap-1
```
Sufijo "ARS":
```
text-xs font-semibold text-[#6b7280]
```

Breakdown:
```
text-[11.5px] text-[#6b7280]  mt-1.5 leading-snug
```
Texto: "Precio base $X · +10% comisión incluida"

> ⚠️ IMPORTANTE: el número grande es el TOTAL (precio base + comisión).
> El precio base queda como referencia secundaria debajo.
> Esto es intencional — es el diferencial de transparencia de TicketsHub.

---

### C) Slot fijo "Acepta ofertas"

```
h-7  mt-2.5   flex items-center
```
Este div SIEMPRE se renderiza en todas las cards (height fija).
Cuando acepta_ofertas === true, mostrar el badge adentro.
Cuando es false, el div queda vacío pero mantiene el espacio.

Badge "Acepta ofertas" (cuando aplica):
```
inline-flex items-center gap-1.5
text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full
bg-[#f0ebff] text-[#6d28d9] border-[1.5px] border-[#c4b5fd]
```

---

### D) Separador
```
border-t border-[#e5e7eb]  my-3.5
```

---

### E) Fila de vendedor — MANTENER LÓGICA ACTUAL

```
flex items-center gap-2.5  mb-4
```

Avatar con iniciales:
- Vendedor verificado: `bg-[#f0ebff] text-[#6d28d9]`
- Vendedor nuevo:      `bg-[#f3f4f6] text-[#6b7280]`
```
w-9 h-9 rounded-full flex-shrink-0
flex items-center justify-center
text-xs font-extrabold tracking-tight
```

Info del vendedor:
```
min-w-0
```

Nombre:
```
text-[13px] font-bold text-[#0f0f1a]
```

Badge verificado (lógica existente — solo estilo):
```
inline-flex items-center gap-1
text-[11px] font-semibold text-[#0f766e]
```
+ checkmark icon en `text-[#0f766e]`

Vendedor nuevo (lógica existente — solo estilo):
```
text-[11px] font-semibold text-[#b45309]
```
Texto: "Vendedor nuevo · sin historial"

Meta (reseñas):
```
text-[11.5px] text-[#6b7280]  mt-0.5
```

---

### F) CTA Comprar
```
w-full
font-['Plus_Jakarta_Sans'] text-[14px] font-bold
bg-[#6d28d9] text-white
rounded-[10px] py-3
shadow-[0_4px_18px_rgba(109,40,217,0.28)]
transition-all duration-150
hover:shadow-[0_6px_24px_rgba(109,40,217,0.40)] hover:-translate-y-px
active:scale-[0.98]
mb-3
```

---

### G) Footer de card
```
flex items-center justify-between
text-[11px] text-[#6b7280]
mt-auto
```

Izquierda: shield icon + "Compra protegida"
Derecha:   "Comisión incluida"

```
flex items-center gap-1  (para el item con ícono)
```

---

## 7. Sell Banner (nuevo — al pie del listing)

```
mt-9
bg-white border border-[#e5e7eb] rounded-[14px] p-6 px-7
flex items-center justify-between gap-4 flex-wrap
shadow-[0_1px_4px_rgba(0,0,0,0.04)]
```

Título:
```
font-['DM_Serif_Display'] text-[18px] tracking-tight text-[#0f0f1a]  mb-1
```

Subtítulo:
```
text-[13px] text-[#6b7280]
```

Botón outline:
```
font-['Plus_Jakarta_Sans'] text-[13px] font-bold text-[#6d28d9]
border-[1.5px] border-[#6d28d9] rounded-[10px] px-5 py-2.5
bg-transparent hover:bg-[#f0ebff]
transition-colors duration-150  whitespace-nowrap
```

---

## Animación de entrada de cards (opcional)
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* aplicar con animation-delay escalonado por índice */
```

---

## Lo que NO cambia
- Toda la lógica de qué badges mostrar y cuándo
- Props que recibe EventTicketCard
- Lógica de vendedor verificado vs nuevo (solo el estilo visual)
- Selector de fechas (lógica) — solo aplicar los tokens de pills de arriba
- Ordenamiento y filtros (lógica)
- Routing y navegación
- Estructura de datos del evento
