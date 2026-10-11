# Estructura PostgreSQL propuesta

Migración inicial: [`db/migrations/001_core_schema.sql`](../db/migrations/001_core_schema.sql). ERD editable: [`database-erd.mmd`](diagrams/database-erd.mmd). Requiere PostgreSQL 15+; IDs UUID los genera Node con `crypto.randomUUID()`.

## Entidades

| Dominio | Tablas | Cardinalidad clave |
|---|---|---|
| Cuenta y acceso | `accounts`, `account_sessions`, `email_verification_tokens`, `password_reset_tokens` | Cuenta 1:N sesiones/tokens. Se almacenan hashes, nunca clave ni token en claro. |
| Eventos y permisos | `events`, `event_memberships` | Cuenta propietaria 1:N eventos. Evento puede compartir con cuentas editor/viewer. |
| Invitación | `events`, `event_itinerary_items`, `event_gift_options`, `event_media` | Evento 1:N agenda/regalos/medios. Contenido flexible y switches de secciones viven en JSONB. |
| Invitados y RSVP | `guest_groups`, `guest_rsvp_responses`, `guest_rsvp_attendees` | Evento 1:N grupos; grupo 1:N historial RSVP; respuesta 1:N asistentes nombrados. Vista `current_guest_rsvps` entrega última respuesta. |
| Plano | `event_tables`, `guest_table_assignments`, `event_floor_objects` | Mesa 1:N grupos asignados; grupo 0..1 mesa. Claves compuestas impiden asignar invitado de otro evento. |
| Participación | `event_song_suggestions`, `event_activity_log` | Evento 1:N canciones y actividad. |
| Billing externo | `event_entitlements`, `billing_event_receipts` | Evento 0..1 entitlement vigente; recibos de eventos externos se deduplican por ID. No se guardan órdenes, importes ni datos de tarjeta. |

Los principales datos personales quedan dentro del tenant/evento. Fotos y audio guardan `object_key` y metadatos; binarios deben residir en almacenamiento privado tipo S3 compatible. El esquema no contiene datos de invitación de referencia ni seed personal.

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
```

La segunda instrucción asume `DATABASE_URL` apunta al mismo servidor PostgreSQL de desarrollo. Revisar host/database antes de ejecutarla. Migración no borra ni reescribe tablas actuales.

## Límite de esta iteración

DDL se validó en PostgreSQL 15.18 temporal aislado con inserciones/relaciones/view de RSVP; transacción de prueba se revirtió.

`PostgresStore` aplica `001_core_schema.sql` y `002_tenant_runtime.sql` al iniciar. Registro, sesiones, cuentas, eventos, memberships, slug público y rate limits usan tablas tenant-aware. Estado funcional de cada celebración vive temporalmente en `event_application_states` como documento JSONB versionado por `event_id`; además sincroniza campos principales en `events`.

Tablas normalizadas de invitados, RSVP, mesas, canciones y medios todavía no son repositorios activos del panel. Migrarlas será trabajo de escala/concurrencia, no requisito para separar cuentas: cada documento runtime ya pertenece a un evento autorizado. `nupcial_demo_state` queda solo para compatibilidad del login demo de desarrollo.
