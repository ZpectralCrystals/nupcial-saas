# Estructura PostgreSQL actual y evolución normalizada

Migraciones activas: [`001_core_schema.sql`](../db/migrations/001_core_schema.sql) y [`002_tenant_runtime.sql`](../db/migrations/002_tenant_runtime.sql). ERD editable: [`database-erd.mmd`](diagrams/database-erd.mmd). Requiere PostgreSQL 15+; IDs UUID los genera Node con `crypto.randomUUID()`.

El ERD distingue tres capas que conviven en la misma instalación:

1. **Runtime SaaS activo:** cuentas, tokens, sesiones, evento activo por sesión, eventos, memberships, estado JSONB versionado por evento y límites de autenticación.
2. **Modelo normalizado preparado:** tablas de invitados, RSVP, mesas, canciones, medios, actividad y entitlements ya existen por la migración `001`, pero el panel todavía no las usa como repositorios.
3. **Compatibilidad solo desarrollo:** `nupcial_demo_state`, `nupcial_demo_payments` y `nupcial_demo_sessions` son creadas por `PostgresStore.init()` fuera de las migraciones. Sostienen login/estado/checkout de la demo heredada; no pertenecen al modelo SaaS productivo.

## Entidades

| Dominio | Tablas | Cardinalidad clave |
|---|---|---|
| Cuenta y acceso | `accounts`, `account_sessions`, `email_verification_tokens`, `password_reset_tokens` | Cuenta 1:N sesiones/tokens. Se almacenan hashes, nunca clave ni token en claro. |
| Eventos y permisos | `events`, `event_memberships` | Cuenta propietaria 1:N eventos. Cuenta N:M eventos compartidos mediante memberships editor/viewer. |
| Runtime por evento | `account_sessions.active_event_id`, `event_application_states` | Sesión 0..1 evento activo autorizado. Evento 0..1 documento por restricción SQL y 1:1 en el flujo de creación transaccional; `revision` protege guardado concurrente. |
| Límites | `auth_rate_limit_buckets` | Bucket independiente por `scope + fingerprint`; no contiene correo/IP en claro ni FK a cuenta. |
| Invitación | `events`, `event_itinerary_items`, `event_gift_options`, `event_media` | Evento 1:N agenda/regalos/medios. Contenido flexible y switches de secciones viven en JSONB. |
| Invitados y RSVP | `guest_groups`, `guest_rsvp_responses`, `guest_rsvp_attendees` | Evento 1:N grupos; grupo 1:N historial RSVP; respuesta 1:N asistentes nombrados. Vista `current_guest_rsvps` entrega última respuesta. |
| Plano | `event_tables`, `guest_table_assignments`, `event_floor_objects` | Mesa 1:N grupos asignados; grupo 0..1 mesa. Claves compuestas impiden asignar invitado de otro evento. |
| Participación | `event_song_suggestions`, `event_activity_log` | Evento 1:N canciones y actividad. |
| Billing externo | `event_entitlements`, `billing_event_receipts` | Evento 0..1 entitlement vigente y 0:N recibos. Cada recibo puede tener `event_id` nulo si todavía no se asoció o fue eliminado. No se guardan órdenes, importes ni datos de tarjeta. |

Los principales datos personales quedan dentro del tenant/evento. En el modelo normalizado, fotos y audio guardan `object_key` y metadatos; binarios deben residir en almacenamiento privado tipo S3 compatible. El runtime actual todavía conserva medios como data URLs dentro de `event_application_states.payload`. El esquema no contiene datos de invitación de referencia ni seed personal.

## Brecha persona↔silla del plano

El runtime y `guest_table_assignments` modelan **grupo invitado → mesa**. No existe una entidad silla ni una asignación estable de cada acompañante. La referencia revisada el 11 de octubre de 2026 trabaja con personas confirmadas y sillas identificadas; por tanto, el DDL actual no alcanza paridad aunque sí evita sobrecupo agregado.

Evolución recomendada antes de migrar el plano fuera de JSONB:

- Dar ID estable a cada asistente vigente; no usar solo `display_name` ni posición del array.
- Crear `event_table_seats(id, event_id, table_id, seat_index, geometry, UNIQUE(table_id, seat_index))`.
- Crear `guest_seat_assignments(event_id, attendee_id, seat_id, assigned_by_account_id, assigned_at)` con unicidad por asistente y silla.
- Revalidar en una transacción pertenencia al evento, RSVP vigente, silla libre y capacidad.
- Definir política al reducir asistentes, reabrir RSVP, borrar mesa o regenerar sillas.

No se modifica todavía la migración `001`: estas entidades son diseño de paridad pendiente, no repositorios activos. Contrato observado: [reference-festejabonito-client-seating.md](reference-festejabonito-client-seating.md).

## Integridad que no resuelve un `CHECK`

- RSVP: aplicación debe validar `attendee_count <= guest_groups.pass_limit` y escribir respuesta + nombres en una transacción.
- Aforo: aplicación debe bloquear/serializar asignación de mesas y comparar asistentes confirmados contra capacidad antes de guardar; SQL solo asegura que cada grupo pertenezca al mismo evento y tenga máximo una mesa.
- Permisos: toda consulta/modificación debe filtrar por `owner_account_id` o `event_memberships`; no confiar en `event_id` enviado por navegador. Agregar pruebas cross-tenant antes de aceptar clientes reales.
- Links RSVP: `link_code` es bearer token opaco (mínimo 24 bytes aleatorios codificados URL-safe); no incluir nombre, email, teléfono ni IDs secuenciales. Rate limit y proyección pública siguen obligatorios.
- Eventos de billing: verificar firma, deduplicar `external_event_id` y aplicar entitlement en una misma transacción. Esta tabla no sustituye al servicio externo de cobros.

## Aplicación manual

Usar base nueva de desarrollo, no base conectada a la demo ni producción:

```bash
createdb nupcial_schema_dev
psql "$DATABASE_URL" -d nupcial_schema_dev -v ON_ERROR_STOP=1 -f db/migrations/001_core_schema.sql
psql "$DATABASE_URL" -d nupcial_schema_dev -v ON_ERROR_STOP=1 -f db/migrations/002_tenant_runtime.sql
```

Ambas instrucciones asumen que `DATABASE_URL` apunta al mismo servidor PostgreSQL de desarrollo. Revisar host/database antes de ejecutarlas. Las migraciones no borran ni reescriben tablas actuales.

## Límite de esta iteración

DDL se validó en PostgreSQL 15.18 temporal aislado con inserciones/relaciones/view de RSVP; transacción de prueba se revirtió.

`PostgresStore` aplica `001_core_schema.sql` y `002_tenant_runtime.sql` al iniciar. Registro, sesiones, cuentas, eventos, memberships, slug público y rate limits usan tablas tenant-aware. `account_sessions.active_event_id` selecciona como máximo un evento accesible por sesión. Estado funcional de cada celebración vive temporalmente en `event_application_states` como documento JSONB versionado por `event_id`; además sincroniza campos principales en `events`.

Tablas normalizadas de invitados, RSVP, mesas, canciones, medios, actividad y entitlements todavía no son repositorios activos del panel. Migrarlas será trabajo de escala/concurrencia, no requisito para separar cuentas: cada documento runtime ya pertenece a un evento autorizado. Las tres tablas `nupcial_demo_*` quedan solo para compatibilidad del login, estado y checkout ficticio de desarrollo; no tienen relaciones con cuentas/eventos SaaS y no deben convertirse en fuente productiva.
