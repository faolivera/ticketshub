# Edit Event Modal — Layout 2 columnas + campos nuevos

**Fecha:** 2026-03-26

## Objetivo

1. Agregar `ticketApp`, `transferable`, y `artists` al flujo de edición de eventos (backend + frontend).
2. Eliminar `description` (campo muerto: no existe en el modelo Prisma ni en el service).
3. Reorganizar el modal en layout 2 columnas para reducir el scroll.
4. Aumentar el ancho del modal.

---

## Cambios Backend

### 1. `backend/src/modules/admin/admin.api.ts`

En `AdminUpdateEventRequest`:
- Agregar: `ticketApp?: string`, `transferable?: boolean`, `artists?: string[]`
- Quitar: `description?: string` (no existe en el modelo)

### 2. `backend/src/modules/admin/schemas/api.schemas.ts`

En `AdminUpdateEventRequestSchema`:
- Agregar: `ticketApp: z.string().optional()`, `transferable: z.boolean().optional()`, `artists: z.array(z.string()).optional()`
- Quitar: `description: z.string().min(10).max(5000).optional()`

Sin `.superRefine` para ticketApp/transferable — en el import tiene sentido la validación cruzada, pero en el update manual el admin puede editarlos de forma independiente.

### 3. `backend/src/modules/events/events.service.ts`

En `adminUpdateEventWithDates`, agregar al bloque de asignación `eventUpdates` (línea ~1112):
```typescript
if (data.ticketApp !== undefined) eventUpdates.ticketApp = data.ticketApp;
if (data.transferable !== undefined) eventUpdates.transferable = data.transferable;
if (data.artists !== undefined) eventUpdates.artists = data.artists;
```

---

## Cambios Frontend

### 1. `frontend/src/api/types/admin.ts`

En `AdminUpdateEventRequest`:
- Agregar: `ticketApp?: string`, `transferable?: boolean`, `artists?: string[]`
- Quitar: `description?: string`

### 2. `frontend/src/app/pages/admin/components/EditEventModal.tsx`

#### Estado — quitar
- `description` / `setDescription`

#### Estado — agregar
```typescript
const [ticketApp, setTicketApp] = useState('');
const [transferable, setTransferable] = useState<boolean | undefined>(undefined);
const [artists, setArtists] = useState<string[]>([]);
const [newArtist, setNewArtist] = useState('');
```

#### useEffect — quitar inicialización de `description`, agregar:
```typescript
setTicketApp(event.ticketApp ?? '');
setTransferable(event.transferable ?? undefined);
setArtists(event.artists ?? []);
```

#### handleSave — quitar `description`, agregar:
```typescript
...(ticketApp.trim() && { ticketApp: ticketApp.trim() }),
...(transferable !== undefined && { transferable }),
artists,
```

#### Campos removidos del Event Details card
- Eliminar el `<Textarea>` de description y su `<Label>` y `<div>` contenedor.

#### Campos nuevos en Event Details card
Al final del CardContent (después de location), agregar:

**Fila 1** — `grid gap-4 sm:grid-cols-2`:
- **Ticket App**: `<Input>` text, label "Ticket App", placeholder `"entradas, movistararena..."`
- **Transferible**: `<Checkbox>` + label "Transferible"

**Fila 2** — Artists (full width):
- Label "Artists"
- Input text + botón "Agregar" inline: al presionar Enter o click Agregar, añade el valor al array `artists` y limpia el input
- Lista de chips debajo: cada chip muestra el nombre + botón X para eliminar
- Si `artists` está vacío, no se muestra la lista

#### Ancho del modal
`max-w-3xl` → `max-w-5xl`

#### Layout 2 columnas
Cambiar el contenedor de cards de `space-y-6` a `grid grid-cols-1 lg:grid-cols-2 gap-6`:
- **Columna izquierda**: Card "Detalles del Evento" (con todos los campos actualizados)
- **Columna derecha**: `<div className="space-y-6">` con Card "Banners", Card "Fechas", Card "Secciones"

Los alerts de error/warnings se mantienen encima del grid (full-width).

### 3. i18n

Agregar en `en.json` y `es.json` bajo `admin.events.edit`:
- `ticketApp`: `"Ticket App"` / `"Ticket App"`
- `transferable`: `"Transferable"` / `"Transferible"`
- `artists`: `"Artists"` / `"Artistas"`
- `addArtist`: `"Add"` / `"Agregar"`

---

## Notas

- `description` no tiene columna en Prisma — removerlo es una limpieza, no un breaking change.
- No hay tests de servicio que cubrir (no hay lógica nueva, solo pasar campos existentes al repositorio).
