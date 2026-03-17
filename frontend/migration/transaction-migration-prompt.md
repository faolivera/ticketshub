# Plan de migración: TicketsHubTransaction.jsx → MyTicket.tsx

## Contexto

Estás reemplazando el componente `MyTicket.tsx` (ruta `/transaction/:transactionId`) con
el diseño aprobado en `TicketsHubTransaction.jsx`. El archivo nuevo contiene lógica de
demo (dev switcher, estados hardcodeados) que debe eliminarse. Toda la lógica de
datos, estado real y efectos secundarios ya está implementada en `MyTicket.tsx` y
debe preservarse. El objetivo es trasladar SOLO el diseño visual.

---

## Regla fundamental

> **Preservar toda la lógica existente. Reemplazar solo el JSX que se renderiza.**

No tocar: llamadas a API, hooks, lógica de estado, efectos, Socket.IO, countdown,
polling, mapeo de errores, permisos por rol. Todo eso ya funciona.

---

## Design system

Tokens a usar en todos los componentes (ya definidos en `ticketshub-design-system.md`):

```ts
const V       = "#6d28d9";   // CTAs primarios, precios, badges activos
const VLIGHT  = "#f0ebff";   // fondo de pills/badges activos
const BLUE    = "#1e3a5f";   // íconos de confianza, trust badges
const BLIGHT  = "#e4edf7";   // fondo de trust badge
const DARK    = "#0f0f1a";   // texto principal
const MUTED   = "#6b7280";   // texto secundario
const HINT    = "#9ca3af";   // placeholders, hints
const BG      = "#f3f3f0";   // fondo de página
const CARD    = "#ffffff";   // fondo de cards
const SURFACE = "#f9f9f7";   // superficies internas (inputs, bloques)
const BORDER  = "#e5e7eb";   // bordes por defecto
const BORD2   = "#d1d5db";   // bordes de elementos inactivos
const GREEN   = "#15803d";   // éxito
const GLIGHT  = "#f0fdf4";   // fondo éxito
const GBORD   = "#bbf7d0";   // borde éxito
const AMBER   = "#92400e";   // advertencia texto
const ABG     = "#fffbeb";   // fondo advertencia
const ABORD   = "#fde68a";   // borde advertencia

const S = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const E = { fontFamily: "'DM Serif Display', serif" };
```

Fuentes: `DM Serif Display` (400, italic) + `Plus Jakarta Sans` (400–800) — ya cargadas.

---

## Paso 1 — Eliminar del mockup (no llevar a producción)

Eliminar el bloque completo del dev switcher:

```jsx
{/* ── DEV SWITCHER ── */}
<div style={{ background: DARK, padding: "12px 24px", ... }}>
  ...
</div>
```

Eliminar de `<style>`: `.role-tab`, `.state-btn`

Eliminar del estado raíz del componente:
```js
const [role,        setRole]        = useState("buyer");
const [buyerState,  setBuyerState]  = useState("B1");
const [sellerState, setSellerState] = useState("S1");
```

Eliminar el objeto `TX` hardcodeado — los datos vienen del BFF.

---

## Paso 2 — Datos reales: BFF endpoint

El componente ya llama a:
```
GET /api/bff/transaction-details/:transactionId
```

Que devuelve `GetTransactionDetailsResponse`:
```ts
{
  transaction:            TransactionWithDetails,
  paymentConfirmation:    PaymentConfirmation | null,
  bankTransferConfig:     BankTransferConfig | null,
  ticketUnits:            TransactionTicketUnit[],
  paymentMethodPublicName:string | null,
  reviews:                TransactionReviewsData,
  chat:                   TransactionDetailsChatConfig | null,
  counterpartyEmail:      string | null    // solo visible al vendedor
}
```

Variables derivadas ya calculadas en `MyTicket.tsx` (NO recalcular):
```ts
const isBuyer  = transaction.buyerId  === currentUser.id
const isSeller = transaction.sellerId === currentUser.id
const isManualPayment = bankTransferConfig !== null

// Expiración local (countdown llega a 0 antes del scheduler)
const isPaymentExpiredLocally = status === 'PendingPayment' && countdown === 0
const effectiveStatus = isPaymentExpiredLocally ? 'Cancelled' : transaction.status
const effectiveCancellationReason = isPaymentExpiredLocally
  ? 'PaymentTimeout'
  : transaction.cancellationReason
```

---

## Paso 3 — Mapeo completo de estados backend → UI

### BUYER — Todos los estados posibles

| `effectiveStatus` | `isManualPayment` | `paymentConfirmation` | Qué renderizar |
|---|---|---|---|
| `PendingPayment` | `true` | `null` | **B1-bank** Hero: instrucciones bancarias + countdown + upload comprobante |
| `PendingPayment` | `true` | `exists` | **B1-bank-uploaded** Hero: "comprobante subido, aguardando confirmación" + preview |
| `PendingPayment` | `false` | — | **B1-gateway** Hero: "procesando pago" (no manual upload) |
| `PaymentPendingVerification` | `true` | `exists` | **B2** Hero: "verificando tu pago" + spinner de espera + preview |
| `PaymentReceived` | — | — | Chat disponible. Hero: "pago confirmado, esperando que el vendedor transfiera la entrada" |
| `TicketTransferred` | — | — | **B3** Hero: "¡Tu entrada llegó! Confirmá la recepción" + CTA |
| `DepositHold` | — | — | **B4** Hero: "Fondos en escrow" + EscrowTimeline |
| `TransferringFund` | — | — | **B4-variant** Hero: "Fondos en proceso de liberación" |
| `Completed` | — | — | **B5** Hero: "Transacción completada" + ReviewForm si `canReview` |
| `Disputed` | — | — | Hero: "Disputa abierta" + link a `/support/:disputeId` |
| `Refunded` | — | — | Hero: "Reembolso procesado" |
| `Cancelled` | — | reason=`BuyerCancelled` | Hero: "Cancelaste esta transacción" |
| `Cancelled` | — | reason=`PaymentTimeout` | Hero: "El pago expiró" (puede ser `isPaymentExpiredLocally`) |
| `Cancelled` | — | reason=`AdminRejected` | Hero: "Pago rechazado" |
| `Cancelled` | — | reason=`AdminReviewTimeout` | Hero: "Tiempo de revisión expirado" |

### SELLER — Todos los estados posibles

| `effectiveStatus` | Qué renderizar |
|---|---|
| `PendingPayment` | Hero: "Esperando el pago del comprador" (estado de espera) |
| `PaymentPendingVerification` | Hero: "Verificando el pago del comprador" |
| `PaymentReceived` | **S1** Hero: "¡Pago confirmado! Transferí la entrada" + datos del comprador + CTA |
| `TicketTransferred` | **S3** Hero: "Esperando confirmación del comprador" + EscrowTimeline + chat |
| `DepositHold` | **S3-hold** Hero: "Fondos en escrow — liberación pendiente" + EscrowTimeline |
| `TransferringFund` | **S4-pending** Hero: "Fondos en proceso de liberación" |
| `Completed` | **S4** Hero: "¡Fondos liberados!" + desglose de pago + ReviewForm si `canReview` |
| `Disputed` | Hero: "Disputa abierta" + link a `/support/:disputeId` |
| `Refunded` | Hero: "Reembolso procesado — fondos devueltos al comprador" |
| `Cancelled` | Hero: "Transacción cancelada" + motivo si aplica |

---

## Paso 4 — Stepper unificado

El mockup usa 4 pasos. Mapear la lógica de `statusStep` existente a este stepper:

```ts
// 4 nodos compartidos para buyer y seller
const STEPS = [
  { id: "payment",   label: "Pago"          },
  { id: "transfer",  label: "Transferencia" },
  { id: "received",  label: "Recepción"     },
  { id: "released",  label: "Liberado"      },
];

// Paso activo por status (reemplaza el statusStep existente de 0-5)
const currentStep: Record<TransactionStatus, number> = {
  PendingPayment:              0,
  PaymentPendingVerification:  0,
  PaymentReceived:             1,
  TicketTransferred:           2,
  DepositHold:                 2,
  TransferringFund:            3,
  Completed:                   3,
  Disputed:                    2,   // freezeado en el último paso activo
  Refunded:                    0,
  Cancelled:                   0,
};

// Nodo "completado" = verde con checkmark
// Nodo "activo"     = violeta con ring exterior (#f0ebff)
// Nodo "pendiente"  = gris
```

El stepper renderiza diferente según el rol (buyer ve lo que le tocó hacer, seller también),
pero el progreso numérico es el mismo.

---

## Paso 5 — Interacciones del comprador (preservar lógica existente)

### B1-bank: Instrucciones bancarias + countdown

El bloque de `bankTransferConfig` ya existe en el código. Rediseñar visualmente:

```
┌─ ActionHero (color: BLUE, bg: BLIGHT) ──────────────────────────┐
│  Icono: CreditCard                                               │
│  Título: "Realizá la transferencia"                              │
│  Subtítulo: "Transferí exactamente $X a los datos de abajo..."  │
│                                                                  │
│  ┌─ BankDetailsBlock ─────────────────────────────────────────┐ │
│  │  Banco: [bankName]           [copy]                        │ │
│  │  CBU:   [cbu]                [copy — 2s feedback]          │ │
│  │  Titular: [holderName]                                     │ │
│  │  CUIT: [cuit]                                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ CountdownBlock (si no expiró) ───────────────────────────┐  │
│  │  Tiempo restante: HH:MM:SS   (usa paymentExpiresAt)       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [Upload area] ← onClick dispara el file input existente        │
│  [Botón: Enviar comprobante] ← llama POST /payment-confirmations│
└──────────────────────────────────────────────────────────────────┘
```

El countdown ya está implementado. NO reescribir. Solo envolver en el nuevo diseño.
El botón de cancelar pasa a ser un `link-btn` discreto debajo del CTA.

### B1-bank-uploaded / B2: Verificando pago

```
┌─ ActionHero (color: AMBER, bg: ABG) ────────────────────────────┐
│  Icono: Clock + badge "Esperando"                                │
│  Título: "Verificando tu pago"                                   │
│  Subtítulo: "Recibimos tu comprobante. Máx. 1 hora hábil."      │
│                                                                  │
│  ┌─ StatusRow ───────────────────────────────────────────────┐  │
│  │  ● amarillo  "Comprobante enviado · Esperando aprobación"  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [link: "Ver comprobante"] ← abre modal con iframe existente    │
│  [link: "Cancelar transacción"] ← llama POST .../cancel         │
└──────────────────────────────────────────────────────────────────┘
```

### B3 — `TicketTransferred`: Confirmar recepción

```
┌─ ActionHero (color: GREEN, bg: GLIGHT) ─────────────────────────┐
│  Icono: CheckCircle                                              │
│  Título: "¡Tu entrada llegó! Confirmá la recepción"             │
│  Subtítulo: "[SellerName] transfirió tu entrada."               │
│                                                                  │
│  ┌─ TransferMethodBlock ─────────────────────────────────────┐  │
│  │  Enviada como: [payloadType traducido]                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [Botón primario: Confirmar que recibí la entrada]               │
│    → abre ConfirmReceiptModal (lógica existente)                 │
│                                                                  │
│  [link: "¿Hay un problema? Reportar"] ← canOpenDispute          │
└──────────────────────────────────────────────────────────────────┘
```

`payloadType` traducido:
- `ticketera` → "Ticketera (Quentro, Venti, etc.)"
- `pdf_or_image` → "PDF o imagen (por email)"
- `other` → `payloadTypeOtherText` o "Otro"

### B4 — `DepositHold`: Fondos en escrow

```
┌─ ActionHero (color: V, bg: VLIGHT) ─────────────────────────────┐
│  Icono: Lock + badge "Fondos protegidos"                         │
│  Título: "Recepción confirmada · Fondos en escrow"               │
│  Subtítulo: "Los fondos se liberan al vendedor después del       │
│             evento. Si hay un problema, podés reportarlo."       │
│                                                                  │
│  <EscrowTimeline role="buyer" event={...} date={...} />         │
│                                                                  │
│  [link: "Reportar un problema"] ← canOpenDispute = true         │
└──────────────────────────────────────────────────────────────────┘
```

### B5 — `Completed`: Transacción completada

```
┌─ ActionHero (color: GREEN, bg: GLIGHT) ─────────────────────────┐
│  Icono: CheckCircle                                              │
│  Título: "Transacción completada"                                │
│  Subtítulo: "Disfrutá el evento. ¡Que lo pases increíble!"      │
│                                                                  │
│  ┌─ CompletionCard ───────────────────────────────────────────┐ │
│  │  [event.name] · [event.date]  ✓ Todo listo                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  {reviewData.canReview && !reviewData.buyerReview &&            │
│    <ReviewForm onSubmit={existingReviewHandler} />}              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Paso 6 — Interacciones del vendedor (preservar lógica existente)

### S1 — `PaymentReceived`: Transferir entrada

```
┌─ ActionHero (color: AMBER, bg: ABG) ────────────────────────────┐
│  Icono: Zap                                                      │
│  Título: "¡Pago confirmado! Transferí la entrada"               │
│  Subtítulo: "[BuyerName] pagó. Transferile la entrada..."        │
│                                                                  │
│  ┌─ BuyerDataBlock ───────────────────────────────────────────┐ │
│  │  Nombre: [buyer.name]                                       │ │
│  │  Email:  [counterpartyEmail]  (viene del BFF)               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [Botón: Confirmar que transferí la entrada]                     │
│    → abre TransferMethodModal (lógica existente, 2 pasos)       │
│                                                                  │
│  [link: "Reportar un problema"] ← canOpenDispute                │
└──────────────────────────────────────────────────────────────────┘
```

### S3 — `TicketTransferred` / `DepositHold`: Esperando comprador

```
┌─ ActionHero (color: V, bg: VLIGHT) ─────────────────────────────┐
│  Icono: Lock + badge "Esperando"                                  │
│  Título: "Esperando confirmación del comprador"                  │
│  Subtítulo: "[BuyerName] necesita confirmar la recepción.        │
│             Tus fondos están seguros en escrow."                 │
│                                                                  │
│  <EscrowTimeline role="seller" event={...} date={...} />        │
│                                                                  │
│  ┌─ TransferSentBlock ────────────────────────────────────────┐ │
│  │  Enviaste como: [payloadType]                               │ │
│  │  Si no confirma antes del evento, los fondos se liberan    │ │
│  │  automáticamente.                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [link: "Reportar un problema"] ← canOpenDispute                │
└──────────────────────────────────────────────────────────────────┘
```

### S4 — `Completed`: Fondos liberados

```
┌─ ActionHero (color: GREEN, bg: GLIGHT) ─────────────────────────┐
│  Icono: CheckCircle                                              │
│  Título: "¡Fondos liberados!"                                    │
│  Subtítulo: "Recibirás $[neto] ARS en 24hs hábiles."            │
│                                                                  │
│  ┌─ PayoutSummaryCard ────────────────────────────────────────┐ │
│  │  Precio de venta            $[price]                        │ │
│  │  Comisión TicketsHub (5%)  −$[commission]                  │ │
│  │  ─────────────────────────────────────────                  │ │
│  │  Recibís                    $[net]                 (verde)  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  {reviewData.canReview && !reviewData.sellerReview &&            │
│    <ReviewForm onSubmit={existingReviewHandler} />}              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Paso 7 — EscrowTimeline (componente nuevo)

Reutilizable para buyer y seller. Props: `role: "buyer" | "seller"`, `eventDate: string`, `depositReleaseAt: string | null`.

```
// Buyer view
● (verde)  Recepción confirmada
│
● (verde)  Fondos en custodia
│
● (violeta, activo)  Evento: [eventDate]
│
○ (gris)   Fondos liberados al vendedor

// Seller view
● (verde)  Pago recibido
│
● (verde)  Entrada transferida
│
● (violeta, activo)  Comprador confirma / Evento: [eventDate]
│
○ (gris)   Fondos liberados (aprox. [depositReleaseAt])
```

Nota: `depositReleaseAt` viene del objeto `transaction`. Vendedor verificado = evento + 24hs,
no verificado = evento + 48hs (ya calculado por el backend).

---

## Paso 8 — Sidebar derecho (3 cards fijas)

### CounterpartCard

```ts
// Buyer ve al seller, seller ve al buyer
const person = isBuyer ? transaction.seller : transaction.buyer
// counterpartyEmail viene del BFF (solo expuesto al seller)
```

Botón "Contactar [vendedor/comprador]":
- Si `chat.chatMode === 'enabled'` o `'only_read'` → abre el panel de chat (`isChatOpen = true`)
- Si `chat === null` → botón deshabilitado o no mostrar

### EscrowCard (sidebar)

Siempre visible mientras `effectiveStatus` no sea `Completed`, `Cancelled`, `Refunded`.

```ts
const escrowMessage = {
  buyer: {
    waiting:  "Tu dinero está seguro. No se libera al vendedor hasta que confirmes recibir la entrada y pase el evento.",
    released: "La transacción se completó correctamente.",
  },
  seller: {
    waiting:  "Tu dinero está en custodia. Se libera automáticamente después del evento o cuando el comprador confirme.",
    released: `Recibirás $[net] ARS en las próximas 24 horas hábiles.`,
  }
}
```

### HelpCard

Botón "Contactar soporte" → abre el sistema de soporte existente (no el flujo de dispute).

---

## Paso 9 — Modales (preservar lógica, reemplazar JSX)

### TransferMethodModal (seller, S1 → S3)

Ya implementado. Rediseñar visualmente según el mockup:
- Step 1: radio buttons con método de transferencia (`ticketera` / `pdf_or_image` / `other`)
- Si `other`: campo de texto libre (`payloadTypeOtherText`)
- Step 2: upload opcional de comprobante → `POST /api/transactions/:id/transfer-proof`
- Confirm → `POST /api/transactions/:id/transfer` con `{ payloadType, payloadTypeOtherText?, transferProof? }`

### ConfirmReceiptModal (buyer, B3 → B4)

Ya implementado. Rediseñar con las advertencias del mockup:
- Warning ámbar: "Al confirmar, reconocés que recibiste la entrada. Esta acción no se puede deshacer."
- Info violeta: "Los fondos quedan en escrow hasta [depositReleaseAt], no se liberan al vendedor todavía."
- Upload opcional: `POST /api/transactions/:id/receipt-proof`
- Confirm → `POST /api/transactions/:id/confirm`

### ReportModal (dispute, buyer/seller según `canOpenDispute`)

La lógica de dispute tiene 3 steps ya implementados: `choice` → `form` → `report_sent`.

**Step 'choice'**: solo aparece si `chat.chatMode === 'enabled' && !chat.hasExchangedMessages`.
Rediseñar con dos opciones:
- "Intentar resolver con el vendedor/comprador" → cierra modal, abre chat
- "Reportar un problema" → avanza a 'form'

**Step 'form'**:
```
POST /api/support/tickets
{ transactionId, category, subject, description }
```

Mapeo de errores de API (preservar EXACTAMENTE esta lógica):
```ts
BAD_REQUEST                    → "Ya existe un reporte para esta transacción"
CLAIM_TOO_EARLY                → "Es muy pronto para abrir una disputa"
CLAIM_TOO_LATE                 → "La ventana de disputa se cerró"
CLAIM_TICKET_NOT_TRANSFERRED   → "La entrada no fue transferida todavía"
CLAIM_CONFIRM_RECEIPT_FIRST    → "Confirmá la recepción antes de reportar"
```

**Step 'report_sent'**: muestra `supportTicket.id` + link a `/support/:ticketId`.

### Preview Modal (payment proof)

Buyer en B2 puede ver su comprobante. Lógica existente: fetcha signed blob URL del servidor
y la renderiza en un `<iframe>`. Solo rediseñar el modal contenedor.

---

## Paso 10 — Chat panel

### Visibilidad del botón

```ts
chat === null                  → no mostrar botón
chat.chatMode === 'enabled'    → "Mensaje a [counterpartName]"
chat.chatMode === 'only_read'  → "Ver conversación"
```

### Auto-apertura

En `useEffect` al montar:
```ts
if (chat?.hasUnreadMessages) {
  setIsChatOpen(true)
  chatWasAutoOpened.current = true
}
```

### Socket.IO (ya implementado, no tocar)

```ts
// Al montar
socket.emit('chat:join', { transactionId })

// Mensaje entrante
socket.on('chat:message', (payload) => {
  if (payload.transactionId === transactionId && payload.senderId !== currentUser.id) {
    chatWasAutoOpened.current = true
    setIsChatOpen(true)
  }
})

// Al desmontar
socket.emit('chat:leave', { transactionId })
```

### Polling fallback

```ts
// Solo cuando socket está desconectado
const interval = chat.chatPollIntervalSeconds
// GET /api/transactions/:id/chat/messages?afterId=<lastId>&markRead=true
```

### Marcar como leído

```ts
// Una sola vez cuando chatWasAutoOpened === true y el usuario interactúa
PATCH /api/transactions/:transactionId/chat/read
// Disparar en: primer click, focus o keydown dentro del panel
// Usar ref guard para que solo se llame una vez
```

### Input de mensaje

```
POST /api/transactions/:id/chat/messages
{ content: string }   // max 2000 caracteres
```

Solo habilitado cuando `chat.chatMode === 'enabled'`.
El chat en `only_read` muestra los mensajes pero sin input.

---

## Paso 11 — PaymentInfo (sidebar o sección inferior)

### Comprador ve:
```
Precio por entrada     $[price × qty]
  $[price] × [qty]
Cargo por servicio     $[fee]
  15% del subtotal
──────────────────────────────────
Total pagado           $[price + fee]   (violeta, 20px)

Método de pago: [paymentMethodPublicName]

ℹ Compra protegida por garantía TicketsHub. Si no recibís las entradas, te devolvemos el 100%.
```

### Vendedor ve:
```
Precio de venta        $[price × qty]
  $[price] × [qty]
Comisión TicketsHub   −$[commission]    (5%)
──────────────────────────────────
Recibís                $[price − commission]   (violeta, 20px)

Método de pago: [paymentMethodPublicName]
```

Los valores numéricos exactos vienen de `transaction.price`, `transaction.buyerFee`,
`transaction.sellerCommission`, etc. — usar los mismos campos que usa `MyTicket.tsx` hoy.

---

## Paso 12 — TxMeta y EventCard

### EventCard

Usar `transaction.event` para imagen, nombre, fecha, venue.
El badge de sector/tipo viene de `ticketUnits[0].sector` o el campo equivalente.

### TxMeta

```
ID: txn_xxxx…xxxx   [copy icon → clipboard]
Creada: [transaction.createdAt formateada]
```

---

## Paso 13 — ReviewForm (status === Completed)

Mostrar cuando:
```ts
effectiveStatus === 'Completed'
  && reviewData.canReview
  && (isBuyer  ? !reviewData.buyerReview  : !reviewData.sellerReview)
```

Implementación existente: rating (positive/neutral/negative) + comentario opcional.
```
POST /api/reviews
{ transactionId, rating, comment? }
```

Error: inline, usa i18n key `reviews.reviewError`.
Después de submit: `GET /api/reviews/transaction/:transactionId` para refresh.

---

## Paso 14 — Estados de carga y error

El mockup no tiene spinners. Agregar en producción:

```tsx
// Patrón para toda acción async
const [loading, setLoading] = useState(false)
const [error,   setError]   = useState<string | null>(null)

const handleAction = async () => {
  setLoading(true)
  setError(null)
  try {
    await existingApiCall()
    await refetch()
  } catch (e) {
    setError(mapApiError(e))   // usar el mapeo de errores existente
  } finally {
    setLoading(false)
  }
}
```

Todos los botones primarios: `disabled={loading}` + spinner inline mientras carga.
Errores: texto rojo pequeño (`fontSize: 12.5, color: "#dc2626"`) inmediatamente bajo el CTA.

---

## Paso 15 — Refetch triggers (no cambiar)

`refetch()` ya se llama después de:
- Cancelar la transacción
- Seller confirma transferencia
- Buyer confirma recepción
- Submit de dispute

No agregar ni quitar llamadas a `refetch()`.

---

## Paso 16 — ModalOverlay con `position: fixed`

En el mockup, `ModalOverlay` usó `position: fixed` dentro de un div que simula el viewport
(por limitaciones del iframe de Claude). En Next.js, usar directamente:

```tsx
function ModalOverlay({ children, title, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(15,15,26,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: CARD, borderRadius: 20, padding: 28,
        width: "100%", maxWidth: 460,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ ...E, fontSize: 20, fontWeight: 400, color: DARK }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

---

## Estructura de archivos propuesta

```
components/transaction/
  TransactionPage.tsx              ← raíz (sin dev switcher)
  EventCard.tsx
  TransactionStepper.tsx
  action-blocks/
    BuyerActionBlock.tsx           ← dispatch por effectiveStatus
    SellerActionBlock.tsx          ← dispatch por effectiveStatus
    ActionHero.tsx                 ← wrapper visual
    EscrowTimeline.tsx
    BankDetailsBlock.tsx           ← CBU + copy buttons + countdown
  sidebar/
    CounterpartCard.tsx
    EscrowCard.tsx
    HelpCard.tsx
    TxMeta.tsx
  payment/
    PaymentInfo.tsx
  chat/
    ChatPanel.tsx                  ← toda la lógica Socket.IO + polling
  modals/
    TransferMethodModal.tsx
    ConfirmReceiptModal.tsx
    ReportModal.tsx
    PaymentProofPreviewModal.tsx
  reviews/
    ReviewForm.tsx
```

---

## Checklist

### Eliminar
- [ ] Dev switcher (barra negra con botones de rol/estado)
- [ ] CSS classes `.role-tab`, `.state-btn`
- [ ] Estado `role`, `buyerState`, `sellerState` del componente raíz
- [ ] Objeto `TX` hardcodeado

### Preservar sin cambios
- [ ] BFF call: `GET /api/bff/transaction-details/:transactionId`
- [ ] `refetch()` y todos sus triggers
- [ ] Variables derivadas: `isBuyer`, `isSeller`, `isManualPayment`, `isPaymentExpiredLocally`, `effectiveStatus`
- [ ] Countdown timer (usa `paymentExpiresAt`)
- [ ] Socket.IO: `chat:join`, `chat:leave`, `chat:message`
- [ ] Polling fallback de chat
- [ ] Marcado de mensajes como leídos (ref guard)
- [ ] Mapeo de errores de dispute (6 códigos)
- [ ] Lógica de `canOpenDispute` por status y rol
- [ ] Lógica de `chat.chatMode` (null / enabled / only_read)
- [ ] Auto-apertura del chat si `hasUnreadMessages`
- [ ] `chatWasAutoOpened` ref guard

### Implementar
- [ ] Mapeo `effectiveStatus + rol` → componente de ActionHero correcto (ver tabla Paso 3)
- [ ] `EscrowTimeline` con versión buyer y seller
- [ ] `EscrowCard` en sidebar con mensajes diferenciados por rol y estado
- [ ] Stepper de 4 pasos unificado (reemplaza el de 3 y 5 pasos actuales)
- [ ] `TransferMethodModal` rediseñado (2 steps: método + proof opcional)
- [ ] `ConfirmReceiptModal` rediseñado (warning ámbar + info escrow violeta)
- [ ] `ReportModal` rediseñado (3 steps: choice → form → sent)
- [ ] `PayoutSummaryCard` en S4 con desglose neto
- [ ] `ReviewForm` en B5 y S4 cuando `canReview`
- [ ] Loading states en todos los botones async
- [ ] `ModalOverlay` con `position: fixed` real
- [ ] `payloadType` traducido a texto human-readable
- [ ] Layout 2 columnas desktop / 1 columna mobile

### Verificar
- [ ] El seller ve `counterpartyEmail` del BFF (no lo recalcules del lado cliente)
- [ ] `depositReleaseAt` en EscrowTimeline viene de `transaction.depositReleaseAt`
- [ ] El chat button cambia de label según `chatMode` (no solo disabled/enabled)
- [ ] El boton de cancelar aparece en B1 Y en B2 (`PendingPayment` Y `PaymentPendingVerification`)
- [ ] `Disputed`, `Refunded`, `Cancelled` tienen su propio hero state (no renderizar un ActionHero vacío)
- [ ] La opción `other` en TransferMethodModal habilita el campo de texto libre
- [ ] Los roles del modal de dispute se diferencian (buyer ve "vendedor", seller ve "comprador")
