# UX Prompt: Flujo "Reportar un problema" en TicketsHub

**Producto:** TicketsHub (marketplace de entradas; comprador y vendedor por transacción).  
**Uso:** Dar este prompt a una IA para que actúe como UX designer y analice/mejore el flujo.

---

## Prompt para la IA (rol UX Designer)

```
Eres una UX designer senior. Tu contexto es TicketsHub, un marketplace de venta de entradas donde:

- Hay transacciones entre **comprador** y **vendedor**.
- Durante la transacción ambos pueden **Reportar un problema** (abrir un dispute): el comprador puede reportar "entrada no recibida" o "entrada no funcionó"; el vendedor puede reportar "comprador no confirmó recepción".
- La plataforma tiene **chat entre comprador y vendedor** por transacción (historial de mensajes). El backend puede saber si ya hubo mensajes en ese chat.

**Flujo que quiero que analices:**

Cuando el usuario hace clic en "Reportar un problema" desde la página de la transacción (My Ticket), se abre un modal para describir el issue y enviar el reclamo a soporte. Estoy considerando **invitar antes a que intenten comunicarse entre ellos**. La idea es:

- En algún punto del proceso de "reportar un problema" (por ejemplo antes del formulario de descripción, o en un paso previo), **consultar si ya hablaron por el chat** de la transacción.
- Si **no** han intercambiado mensajes (o muy pocos), **mostrar una invitación** a intentar resolverlo hablando primero, con un enlace tipo "Hablar con vendedor" / "Hablar con comprador" que lleve al chat de la transacción.
- Si **sí** ya hablaron y aun así quieren reportar, no bloquear: dejarles seguir con el reporte (ya intentaron coordinar).

**Lo que necesito de vos (como UX designer):**

1. **¿Dónde colocar esta invitación?** ¿Antes de abrir el modal (un paso intermedio "¿Intentaste contactar al otro?"), dentro del modal como primer bloque, o en otro lugar? Considerá mobile y desktop.
2. **Copy y tono:** Cómo redactar el mensaje para que sea útil y no frustrante (no que suene a "no reportes", sino "probá hablar primero; si no se resuelve, acá está el reporte").
3. **Fricción vs. beneficio:** ¿Vale la pena el paso extra para reducir disputes que se podrían resolver por chat? ¿Cómo evitar que usuarios con urgencia (ej. entrada que no llegó y el evento es mañana) sientan que los frenamos?
4. **Estados:** Qué mostrar cuando ya hablaron (ej. "Ya te comunicaste con [vendedor/comprador]; si el problema continúa, describí el issue abajo") vs. cuando no hablaron (invitación + link al chat).
5. **Métricas o señales:** Qué mediríamos para saber si la intervención funciona (menos disputes, más resolución por chat, etc.).

Respondé en tono de diseño: priorizá experiencia, claridad y reducción de fricción innecesaria. No implementes código; enfocate en el flujo, los mensajes y las pantallas/pasos.
```

---

## Resumen del flujo actual (referencia para la IA)

- **Dónde:** Página "My Ticket" (`/my-ticket/:transactionId`). Botón "Reportar un problema" (rojo) cuando el usuario puede abrir dispute (según rol y estado de la transacción).
- **Qué pasa al clicar:** Se abre un modal con motivo del dispute (dropdown), asunto y descripción. Requiere email y teléfono verificados. Al enviar se crea un ticket de soporte (categoría dispute).
- **Chat:** En la misma página hay un botón "Contactar vendedor" / "Contactar comprador" que abre el panel de chat de la transacción. El backend ya expone si hay mensajes no leídos (`hasUnreadMessages`); para "¿ya hablaron?" se podría agregar algo como `hasExchangedMessages` o `messageCount >= 1` en la respuesta del BFF.

---

## Notas para implementación posterior

- Si la IA recomienda un paso previo o un bloque dentro del modal, el frontend puede usar un campo nuevo del BFF (ej. `chat.hasExchangedMessages` o `chat.messageCount`) para decidir qué mensaje mostrar.
- Mantener siempre la opción de continuar al reporte sin obligar a chatear (invitación, no bloqueo).
