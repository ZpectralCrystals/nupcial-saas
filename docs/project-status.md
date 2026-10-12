# Estado del proyecto y roadmap

**Corte:** 11 de octubre de 2026, America/Lima.
**Producto:** un solo SaaS multi-cuenta para invitaciones y gestión de bodas.
**Alcance del porcentaje:** preparación para operar con clientes y datos reales; el cobro real permanece fuera de esta aplicación.

## Resumen ejecutivo

- **Demo local funcional:** ~90%.
- **SaaS listo para producción:** ~68%.
- **Producto comercial estricto, contando billing real y operación madura:** ~44%.
- **Base fuerte:** recorrido comercial, onboarding, cuenta, eventos aislados, panel, invitación publicada y participación del invitado.
- **Bloqueo principal:** los módulos todavía guardan un documento JSONB completo por evento; medios también se embeben en ese documento.
- **Brecha funcional principal:** el plano asigna grupo a mesa, no persona confirmada a silla.
- **Supabase:** no está integrado. El servidor usa PostgreSQL estándar mediante `pg` y `DATABASE_URL`.

## Inventario implementado

### Estructura y stack

| Capa | Implementación actual | Estado |
|---|---|---|
| Frontend | SPA HTML/CSS/JavaScript sin framework ni build step | Funcional para demo |
| Router | Hash router en `app.js`; rutas públicas, auth y panel | Funcional |
| Backend | Node.js 20+, ES Modules, `node:http` | Funcional |
| Auth | Registro, verificación, login, logout, recuperación, scrypt, tokens de un uso, sesiones revocables | Funcional |
| Multi-tenant | Cuenta 1:N eventos; evento activo por sesión; aislamiento por cuenta/evento | Funcional y probado |
| Persistencia dev | `FileStore` en `.data/demo-state.json` | Solo desarrollo |
| Persistencia cloud | `PostgresStore` con `pg` | Implementada; falta certificar proveedor final |
| DB | Migraciones `001_core_schema.sql` y `002_tenant_runtime.sql` | Aplicadas automáticamente |
| Cobros | Proveedor `mock` para demo y frontera `external` para producción | Demo funcional; dinero real excluido |
| Entorno | Dockerfile, Compose con PostgreSQL 17, variables de ejemplo | Preparado |
| CI/QA | GitHub Actions, `node:test`, smoke PostgreSQL | Configurado |
| Documentación | Arquitectura, DB, pruebas manuales y 23 diagramas | Completa para estado actual |

Dependencia npm directa: `pg`. No existen React, Next.js, Express, ORM, SDK de Supabase ni SDK de pasarela.

### Recorridos funcionales

- Marketing: inicio, catálogo de 3 temas, 9 paletas, 27 combinaciones, planes y playground responsive.
- Alta: configuración en tres pasos; selección de tema/paleta/plan; registro y verificación.
- Cuenta: eventos múltiples, selección, publicación/despublicación y URL por slug.
- Panel: dashboard, invitados, confirmaciones, mesas, canciones, invitación, galería y configuración.
- Invitados: CRUD, filtros, selección, paginación, CSV/XLSX, exportación, enlace personal y WhatsApp preparado.
- RSVP: general/personal, cupos, nombres, evento completo/ceremonia, respuesta manual y exportación.
- Plano: mesas/objetos, posiciones, drag/drop de grupo, cupo, autoasignación, revisión, zoom, minimapa, undo e impresión.
- Invitación: editor, secciones configurables, diseño, agenda, familia, regalos, música y fotos.
- Participación pública: RSVP, canción y foto con proyección pública y límites.
- Respaldo: exportación/restauración JSON validada.
- Compra ficticia: checkout server-side con pendiente/aprobada/rechazada/cancelada; nunca recibe tarjeta.

Rutas completas: [manual-testing.md](manual-testing.md). Contrato observado del plano persona↔silla: [reference-festejabonito-client-seating.md](reference-festejabonito-client-seating.md).

## Base de datos y Supabase

Configuración real:

- `DATABASE_URL`: conexión PostgreSQL.
- `PGSSLMODE`: SSL del cliente `pg`.
- `PostgresStore`: identidad, sesiones, eventos, revisiones, publicación y límites.
- `event_application_states`: payload JSONB versionado por evento.
- Tablas normalizadas de invitados, RSVP, mesas, medios, actividad y entitlements: existen en DDL, pero el panel aún no las usa como repositorios.

Supabase puede alojar este PostgreSQL usando su URL de conexión, pero eso **no** convierte la app en una integración Supabase. Hoy faltan:

- Supabase Auth.
- Supabase Storage.
- Políticas RLS.
- Cliente `@supabase/supabase-js`.
- Variables `SUPABASE_URL` / keys.
- Migraciones administradas por CLI de Supabase.

Decisión recomendada: mantener auth/autorización en Node y usar PostgreSQL administrado + object storage S3-compatible. Adoptar Supabase Auth/RLS sería otra arquitectura y requiere migración explícita.

## Estimación ponderada

| Área | Peso | Avance | Aporte |
|---|---:|---:|---:|
| UX comercial, onboarding e invitación | 15% | 90% | 13.5 |
| Módulos del panel | 20% | 76% | 15.2 |
| Auth, API y aislamiento tenant | 20% | 80% | 16.0 |
| Persistencia y modelo de datos | 15% | 55% | 8.3 |
| Seguridad y QA | 10% | 72% | 7.2 |
| Integraciones y operación | 15% | 28% | 4.2 |
| Documentación y despliegue reproducible | 5% | 90% | 4.5 |
| **Total estimado** | **100%** |  | **68.9% ≈ 68%** |

No es porcentaje de líneas. El **68%** usa el alcance acordado: billing real pertenece a un servicio externo. El **44%** aplica una rúbrica más estricta que también exige ese servicio, entregabilidad, operación madura y cumplimiento completo.

## Brechas para 100%

### P0 — bloquean producción real

1. **Medios:** mover fotos/audio/base64 fuera de JSONB a object storage privado; URLs firmadas, cuotas, moderación, MIME real, antivirus, retención y borrado.
2. **Persistencia por módulo:** activar repositorios normalizados y endpoints transaccionales; evitar reescribir todo el evento por cada RSVP/foto/canción.
3. **Concurrencia:** resolver `409` con refresh/merge; separar revisiones por módulo; evitar que una respuesta pública invalide todo el panel abierto.
4. **PostgreSQL administrado:** ejecutar migraciones/E2E, carga, backup y restauración en proveedor final.
5. **Email real:** adaptar contrato del proveedor, dominio remitente, entregabilidad, rebotes, timeouts y reintentos.
6. **Privacidad:** términos, consentimiento, exportación, cierre/borrado, retención y contacto de soporte.
7. **Operación:** logs estructurados, request ID, métricas, alertas, trazas, rotación de secretos y runbooks.
8. **Seguridad final:** proxy/IP confiable para rate limit, buckets de cardinalidad/TTL controlados, revisión externa, pruebas de abuso, CSP/dependencias y manejo global de sesión expirada.
9. **QA de salida:** E2E en navegador, móvil/touch, accesibilidad, carga, recuperación de fallos y dos tenants simultáneos.
10. **Migraciones:** separar DDL del arranque, detectar drift, usar usuario runtime sin privilegios DDL y versionar también tablas demo/desarrollo.

### P1 — producto comercial completo

1. Plano persona↔silla: IDs estables, silla única, drag/drop individual, familia completa, preview automático y conflictos transaccionales.
2. Política de RSVP: reducir/reabrir respuesta sin perder asignaciones válidas; auditoría de cambios.
3. Entitlements: aplicar límites de plan en API y UI; hoy son informativos.
4. Colaboradores: invitación/aceptación/revocación para editor/viewer.
5. Onboarding durable: reemplazar borrador `sessionStorage` por almacenamiento server-side temporal.
6. Moderación de galería: pendiente/aprobada/rechazada antes de publicar.
7. Mensajería real: correo/WhatsApp con consentimiento, estados, reintentos y plantillas.
8. Autoservicio: perfil, cambio de correo/clave, sesiones/dispositivos, duplicar/archivar/eliminar evento y cuenta.
9. Admin/support: cuentas, abuso, auditoría, planes y diagnóstico.
10. Higiene de auth: conservar solo hash del token de sesión, purgar sesiones/tokens vencidos y limitar recuperación también por cuenta.

### P2 — paridad y crecimiento

- PDF A3 propio, alinear/espaciar plano, `.xls`, PDF de canciones y QR PNG offline.
- Check-in QR, dominios personalizados, OG dinámico y analítica de aperturas.
- Optimización de imágenes, i18n/timezones, MFA y políticas avanzadas.

## Roadmap por dependencias

1. **Congelar baseline:** tests, escaneo de secretos, commit y CI verde.
2. **Modelo transaccional:** migración persona/silla + repositorios normalizados + endpoints por módulo.
3. **Sincronización:** estrategia de revisión por recurso, refresh/merge y recuperación de sesión/UI.
4. **Medios:** abstracción de object storage, carga directa firmada, moderación y migración de data URLs.
5. **Cuenta y email:** proveedor real, onboarding durable, sesiones y autoservicio.
6. **Planes y roles:** entitlements en servidor; colaboradores y permisos completos.
7. **Operación/privacidad:** observabilidad, backup restaurado, retención y eliminación.
8. **QA de producción:** E2E, carga, accesibilidad, seguridad y ensayo de rollback.
9. **Despliegue gradual:** staging, dominio HTTPS, prueba cerrada, métricas y apertura controlada.

## Paso inmediato

Crear primero:

`db/migrations/003_attendee_seating.sql`

Debe definir asistentes estables, sillas estables y asignación única persona↔silla, con claves por `event_id`, índices y política transaccional. Dependencias siguientes: métodos `PostgresStore`, endpoints API y luego UI del plano. Empezar por `app.js` mantendría deuda grupo→mesa y obligaría a rehacer la interfaz.

## Evidencia de auditoría

- `npm test`: 82/82 pruebas pasan.
- `node --check`: fuentes JS/MJS principales pasan.
- `git diff --check`: sin errores de whitespace.
- `npm audit --omit=dev`: 0 vulnerabilidades conocidas.
- Escaneo local: sin credenciales ni PII de la cuenta de referencia en archivos del repo.
- Smoke PostgreSQL existe y CI lo ejecuta; en este corte no había PostgreSQL activo en la Mac para repetirlo localmente.
