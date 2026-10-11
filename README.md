# Nupcial

Demo funcional de invitaciones y organización de bodas. Marca, interfaz, contenido de ejemplo y código propios; no usa datos, credenciales ni código del sitio de referencia.

## Arranque local

Con Node.js 20 o superior:

```bash
npm install
npm start
```

Abrir `http://localhost:4173`. Acceso local: `demo@boda.local` / `demo123`. En modo local el servidor persiste la demo en `.data/demo-state.json`; esa carpeta no se versiona. Se puede usar `python3 -m http.server 4173` para ver solo la maqueta, pero API, sincronización y checkout requieren `npm start`.

Para probar el mismo recorrido con PostgreSQL:

```bash
docker compose up --build
```

La demo está en `http://localhost:4173`; datos de acceso iguales. PostgreSQL local conserva los datos en el volumen `nupcial-db`. Las contraseñas del archivo Docker Compose solo sirven para tu máquina local.

## Recorrido listo para demo

Inicio → modelos → 27 combinaciones de diseño/paleta → datos del evento → acceso demo → espacio limpio (solo si instalación no tiene evento) → Planes → compra ficticia → panel → invitados / RSVP / mesas / canciones / invitación / galería → enlace personalizado → respuesta pública. El servidor devuelve solo los detalles autorizados; nunca expone teléfonos/notas privadas en la invitación. Si la instalación ya contiene un evento, el alta nueva vuelve al evento actual sin modificarlo.

En el panel, `Planes` permite elegir Esencial, Premium o Deluxe. El servidor calcula el importe y crea un checkout. En modo `mock`, la demo muestra aprobación/rechazo simulados; no cobra ni envía datos a una pasarela. La activación depende del resultado del servidor. Las funciones existentes del panel siguen disponibles para ensayar toda la estructura.

Incluye inicio comercial, probador, invitación pública de muestra, login con cookie de sesión, almacenamiento JSON local o PostgreSQL, sincronización del panel, respuestas públicas, sugerencias musicales, galería pública limitada, exportaciones/importaciones y copia de respaldo. Planes de referencia en soles: S/ 69, S/ 119 y S/ 199; ajustar a la decisión comercial antes de cobrar.

## Producto, tecnologías y arquitectura

Nupcial es **un solo SaaS multi-cuenta**, no varias versiones o instalaciones por cliente. Una aplicación sirve frontend y API; cada cuenta y celebración se aísla por `account_id`/`event_id`. El acceso demo y el archivo JSON son adaptadores exclusivos de desarrollo.

Frontend HTML/CSS/JavaScript sin framework; servidor Node.js ES Modules y HTTP nativo; PostgreSQL con `pg`; Docker/Compose; pruebas con `node:test`. Arquitectura: monolito modular de mismo origen, no microservicios. Detalle: [arquitectura](docs/architecture.md), [base de datos + cardinalidades](docs/database.md), [ERD Mermaid](docs/diagrams/database-erd.mmd).

## Cobros — fuera del alcance actual

No se hizo ni probó cobro real. Checkout ficticio funciona solo en local. Retiré adaptador Mercado Pago del backend principal; producción usa `PAYMENT_PROVIDER=external`, que bloquea checkout hasta conectar servicio billing aparte. Contrato entitlement queda pendiente; sin claves de pasarela en esta app.

## Despliegue

La base SaaS ya incluye registro, verificación, recuperación, sesiones revocables, cuentas aisladas, múltiples eventos por cuenta, publicación por slug, estado con revisión y límites persistentes en PostgreSQL. El servidor aplica las migraciones `001` y `002` al iniciar.

Antes de aceptar usuarios reales aún deben validarse PostgreSQL y correo en el proveedor final, ejecutar pruebas E2E sobre el dominio HTTPS, ensayar backup/restauración, mover medios a almacenamiento de objetos, añadir monitoreo y publicar privacidad/términos. `/api/health` y `/api/ready` comprueban proceso/DB; no certifican operación completa.

## Límites actuales

- Producción requiere un proveedor HTTPS de correo para verificación y recuperación. El contrato configurado debe adaptarse/probarse con el proveedor elegido.
- Imágenes y audio todavía se guardan dentro del documento de estado; falta almacenamiento de objetos/CDN y cuotas comerciales.
- Hay URL pública estable por slug; no hay dominios personalizados ni metadatos sociales dinámicos por invitado.
- El esquema incluye memberships editor/viewer, pero todavía no existe interfaz para invitar colaboradores.
- Sin correo, WhatsApp automatizado, check-in QR ni renovaciones/reembolsos autogestionados.
- El checkout mock no mueve dinero. Producción bloquea pagos hasta conectar servicio billing aparte.
- El almacenamiento local por archivo sirve solo para desarrollo. Producción exige PostgreSQL.

## Diagramas y verificación

Rutas y recorrido manual: [docs/manual-testing.md](docs/manual-testing.md). Mapa navegable (incluye cardinalidad 1:N y flujo multi-cuenta): [docs/system-map.html](docs/system-map.html). Arquitectura y brechas: [docs/architecture.md](docs/architecture.md), [docs/next-iteration.md](docs/next-iteration.md). Auditoría de módulos: [docs/client-audit.md](docs/client-audit.md). Regenerar diagramas Mermaid/SVG con `node docs/export-diagrams.cjs`.

```bash
npm test
```
