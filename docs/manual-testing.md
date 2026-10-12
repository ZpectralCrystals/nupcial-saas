# Pruebas manuales

Esta guía prueba **un solo SaaS multi-cuenta**. Desarrollo incluye una cuenta demo y pago ficticio; son adaptadores del mismo sistema, no versiones distintas del producto. Producción desactiva acceso demo y checkout mock.

## Arranque

```bash
npm install
npm start
```

Base: `http://127.0.0.1:4173/`

Cuenta demo local: `demo@boda.local` / `demo123`. Para probar aislamiento SaaS, solicitar cuentas con correos ficticios y crear una contraseña de 12 caracteres o más al abrir el enlace de verificación. En desarrollo, registro y recuperación muestran el enlace local directamente; no necesitan proveedor de correo.

## Rutas UI

### Públicas y de acceso

| Ruta | Prueba |
|---|---|
| `/` o `/#/home` | Landing principal. |
| `/#/home?section=platform` | Scroll a plataforma. |
| `/#/home?section=how` | Scroll a cómo funciona. |
| `/#/home?section=faq` | Scroll a preguntas frecuentes. |
| `/#/bodas` | Catálogo de tres diseños y nueve paletas. |
| `/#/plans` | Planes. Sin sesión dirige a login; con sesión abre checkout mock en desarrollo. |
| `/#/playground?tema=versalles&paleta=dorado&plan=premium` | Probador interactivo de diseño, color, plan y vista móvil/escritorio. |
| `/#/start?tema=versalles&paleta=dorado&plan=premium` | Alta de celebración en tres pasos. |
| `/#/login` | Login demo o cuenta verificada. |
| `/#/login?next=plans` | Login y regreso a planes. |
| `/#/register` | Solicita registro con correo; todavía no fija contraseña. |
| `/#/verify?token=<token>` | Verifica el correo y permite crear la contraseña. |
| `/#/forgot-password` | Solicitud de recuperación. |
| `/#/reset-password?token=<token>` | Cambio de contraseña. |
| `/#/public` | Vista previa del evento activo cuando existe sesión. |
| `/?event=<slug>#/public` | Invitación publicada general. |
| `/?event=<slug>#/public?guest=<code>` | Invitación personalizada. |
| `/?event=<slug>#/public?section=gallery` | Acceso directo a galería. |
| `/?event=<slug>#/public?guest=<code>&section=gallery` | Galería con invitado personalizado. |
| `/#/payment-result?id=<payment-uuid>` | Resultado verificado del checkout mock. |
| `/docs/system-map.html` | Diagramas de flujo, arquitectura y cardinalidades. |

Valores admitidos:

- `tema`: `versalles`, `terra`, `classic`.
- `paleta`: `dorado`, `navy`, `verde_olivo`, `celeste`, `terracota`, `rojo`, `verde_esmeralda`, `rosado`, `multicolor`.
- `plan`: `essential`, `premium`, `deluxe`.
- Parámetros inválidos del playground vuelven a valores predeterminados.

### Panel protegido

| Ruta | Prueba |
|---|---|
| `/#/events` | Lista, creación, cambio y aislamiento entre celebraciones. Solo cuenta SaaS. |
| `/#/dashboard` | Resumen, publicación, despublicación y copia de enlace. |
| `/#/guests` | CRUD, filtros, importación CSV/XLSX, exportación y links personalizados. |
| `/#/rsvp` | Confirmaciones, filtros, exportación y respuesta manual. |
| `/#/tables` | Plano local grupo→mesa, objetos, drag/drop, cupos, autoasignación e impresión. Las sillas todavía no se persisten individualmente. |
| `/#/songs` | Búsqueda y moderación de sugerencias. |
| `/#/invitation` | Editor. Pestañas internas: diseño, datos, itinerario, familia, detalles, regalos, música y fotos. |
| `/#/gallery` | Activación, carga, selección, ZIP, borrado, enlace y QR. |
| `/#/settings` | Tema, respaldo, restauración y herramientas locales. |
| `/#/checkout?id=<payment-uuid>` | Simulación de compra: pendiente, aprobada, rechazada o cancelada. |

Sin sesión, rutas protegidas redirigen a `/#/login`. Cuenta SaaS sin evento activo dirige a `/#/events` o `/#/start`. Hash desconocido vuelve al inicio.

## Recorrido manual completo

1. Abrir inicio, sus tres secciones, catálogo, planes y playground.
2. Probar los tres temas, nueve paletas y vistas escritorio/móvil.
3. Completar onboarding; solicitar cuenta; abrir enlace local, crear contraseña y luego iniciar sesión.
4. Confirmar creación de celebración y panel vacío.
5. Crear segundo evento desde `/#/start`; cambiar entre ambos desde `/#/events`; comprobar que invitados y cambios no se mezclan.
6. Recorrer las ocho pestañas del editor y guardar datos.
7. Crear invitado, importar CSV/XLSX, exportar y copiar enlace personalizado.
8. Publicar desde dashboard. Cerrar sesión y abrir enlace general/personal.
9. Enviar RSVP, canción y foto. Regresar al panel y comprobar datos en Confirmaciones, Canciones y Galería.
10. Crear mesas y objetos, asignar grupos, ejecutar autoasignación, revisar cupos e imprimir. Verificar que un grupo ocupa `confirmedCount` lugares y que la UI no afirme haber persistido una silla específica.
11. Ir a Planes con sesión. Crear checkout mock y probar `pending`, `approved`, `rejected` y `cancelled` en intentos separados. Solo `approved` activa plan.
12. Solicitar recuperación, cambiar contraseña y confirmar que sesiones anteriores quedaron revocadas.
13. Despublicar evento. Su URL pública debe responder “Invitación no publicada”. Probar también slug y código de invitado inválidos.

## Checklist de paridad pendiente para plano persona↔silla

La referencia funcional completa está en [reference-festejabonito-client-seating.md](reference-festejabonito-client-seating.md). Estos casos deben añadirse cuando Nupcial implemente el nuevo modelo:

1. Cada acompañante confirmado conserva ID estable y aparece una sola vez en el pool.
2. Cada silla tiene ID estable dentro de su mesa; una silla admite máximo una persona.
3. Drag/drop y alternativa de teclado asignan persona→silla; liberar devuelve persona al pool.
4. Asignar familia completa no excede capacidad ni duplica integrantes.
5. Autoasignación muestra preview antes de aplicar, conserva familias y ofrece mesas sugeridas.
6. Reducir RSVP o reabrir respuesta aplica una política explícita sobre sillas existentes.
7. Dos sesiones que intentan la misma silla producen un ganador y un conflicto recuperable.
8. Alinear, espaciar, reset confirmado, undo y save no afectan otro evento.
9. Exportación genera PDF A3 horizontal de dos páginas sin datos de otro tenant.

## Prueba de aislamiento obligatoria

1. Crear cuenta A, evento A e invitado A; publicar A.
2. Cerrar sesión. Crear cuenta B y evento B.
3. Desde B intentar seleccionar UUID de A mediante API: debe devolver `404`.
4. Desde B consultar pago de A: debe devolver pago nulo o `404`, nunca datos.
5. Abrir URL pública A: solo campos públicos; teléfono, notas, mesas y datos internos no deben aparecer.

## Rutas API

| Método | Ruta | Acceso | Objetivo |
|---|---|---|---|
| `GET` | `/api/health` | Público | Proceso vivo. |
| `GET` | `/api/ready` | Público | Storage disponible y modo de pagos. |
| `GET` | `/api/config` | Público | Configuración segura para frontend. |
| `GET` | `/api/auth/session` | Cookie opcional | Estado de sesión. |
| `POST` | `/api/auth/register` | Público | `{email}`; no fija una contraseña utilizable. |
| `POST` | `/api/auth/verify` | Público | `{token,password}`; activa cuenta y fija la clave. |
| `POST` | `/api/auth/password-reset/request` | Público | `{email}`. |
| `POST` | `/api/auth/password-reset/confirm` | Público | `{token,password}`. |
| `POST` | `/api/auth/login` | Público | `{email,password}`; crea cookie. |
| `POST` | `/api/auth/logout` | Cookie opcional | Revoca sesión y cookie. |
| `GET` | `/api/state` | Sesión | Estado y revisión del evento activo. |
| `PUT` | `/api/state` | Sesión + edición | `{state,version}`; guardado optimista. |
| `GET` | `/api/events` | Sesión | Eventos accesibles de cuenta. |
| `POST` | `/api/events` | Cuenta SaaS | Crea y activa evento desde `{state}`. |
| `POST` | `/api/events/:uuid/select` | Miembro | Selecciona evento activo. |
| `POST` | `/api/events/:uuid/publish` | Owner/editor | `{published:boolean}`. |
| `GET` | `/api/public/state?event=<slug>&guest=<code>` | Público | Proyección pública sanitizada. |
| `POST` | `/api/public/rsvp` | Público limitado | RSVP general o personalizado. |
| `POST` | `/api/public/songs` | Público limitado | Sugerencia musical. |
| `POST` | `/api/public/gallery` | Público limitado | Imagen JPG/PNG/WebP data URL, máximo 2 MB. |
| `POST` | `/api/payments/checkout` | Sesión | Checkout ficticio para un plan válido. |
| `GET` | `/api/payments/:uuid` | Dueño/evento | Estado de intento propio. |
| `POST` | `/api/payments/:uuid/demo-result` | Sesión, solo desarrollo mock | Cambia resultado ficticio. |

No existe webhook de Mercado Pago ni captura de tarjeta. Producción usa `PAYMENT_PROVIDER=external`; integración de cobro vive fuera de esta aplicación.

## Verificación automática

```bash
npm test
node --check server.mjs
node --check app.js
node --check experience.js
node --check marketing.js
```

