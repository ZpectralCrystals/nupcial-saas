# Auditoría del panel cliente

> Nota de estado (11 de octubre de 2026): secciones “observado” conservan auditoría histórica de interfaz de referencia. Nupcial ya añadió registro, recuperación, aislamiento multi-cuenta, eventos 1:N y publicación por slug. Para estado ejecutable actual ver [architecture.md](architecture.md) y [manual-testing.md](manual-testing.md).

**Fecha inicial:** 10 de octubre de 2026. **Revisión ampliada:** 11 de octubre de 2026. **Base:** pantallas autenticadas visibles en una cuenta con plan Premium y análisis de recursos cliente del plano. **Alcance:** estructura y comportamiento observable; sin recopilar datos de las personas de la cuenta.

## Qué significa “completo” en este documento

La lista cubre las rutas y controles que aparecieron en las pantallas revisadas. No demuestra que cada botón termine correctamente, ni revela reglas del backend, procesos de pago, permisos de otros planes o pantallas que no estuvieron disponibles. Por eso cada flujo distingue UI vista de acción verificada. “100% de la estructura observable” es un objetivo defendible; “100% de toda la lógica del sistema original” no se puede certificar desde una sesión de solo lectura.

## Navegación observada

| Sección | Qué permite explorar |
|---|---|
| Inicio | Resumen del evento, accesos frecuentes, plan y avisos de mejoras |
| Tus invitados | Grupos, altas, importación, filtros, mensajes y acciones por grupo |
| Confirmaciones | Asistentes, no asistentes, búsqueda, orden, detalle y exportación |
| Plano de mesas | Diseño espacial, elementos del salón, asignación y exportación |
| Canciones | Sugerencias, estados, moderación y exportación |
| Mi invitación | Editor dividido en siete apartados |
| Galería | Cupo, enlace, QR, selección, descarga y administración de fotos |

El panel también muestra plan y botones para consultar o pedir ampliaciones. No se observó una sección separada de facturación, perfil o gestión de otros usuarios.

En encabezado también aparecen ver invitación, cambiar tema claro/oscuro, actualizar la vista y cerrar sesión.

## Flujos y controles por módulo

### 1. Inicio, acceso y plan

- La sesión de referencia ya estaba autenticada; el panel muestra nombre del plan y opciones de gestión. No se reintrodujeron ni se copiaron credenciales.
- El inicio resume el evento y ofrece atajos a invitados, confirmaciones, mesas e invitación/galería.
- Hay ofertas para ampliar pases y fotos, además de accesos a consultar por check-in QR y mensajes personalizados.
- No se inspeccionó login desde cero, alta de cuenta, checkout, pago, recibos, activación del plan, renovación, reembolsos, administración de usuarios o permisos.

### 2. Invitados

- Alta visible para `Grupo/Familia` o `Individual + Acompañantes`.
- Campos visibles: nombre del grupo/persona, teléfono, pases disponibles, categoría, lado (novia/novio/ambos) y nota interna. La interfaz indica máximo de 10 pases por grupo.
- Importación visible: Excel `.xlsx`/`.xls` o CSV. La interfaz describe plantilla con nombre, cantidad de pases, tipo de invitación, categoría, lado y teléfono. Indica revisar una vista previa antes de guardar; teléfono puede tener país seleccionado.
- Búsqueda; filtros por confirmación (`Pendiente`, `Confirmado`, `No asistirá`), envío (`Enviada`, `Sin enviar`), categoría y lado; orden alfabético o recientes.
- Columnas configurables: contacto/mensaje, pases, estado, tipo de invitación, categoría, lado y ver invitación; grupos por página; paginación; descarga de lista y selección de filas.
- Acciones visibles: expandir acompañantes, reenviar, editar, copiar mensaje, menú por invitado, WhatsApp, habilitar respuesta otra vez y eliminar; respuesta manual con estado, nombres y mensaje.
- Nupcial añade acciones separadas por invitado: copiar mensaje con URL personal, copiar solo el enlace y abrir esa invitación para previsualizarla. WhatsApp abre mensaje preparado; el organizador debe enviarlo.
- Cada enlace publicado combina slug y código (`?event=<slug>#/public?guest=…`). RSVP personal vuelve a actualizar ese registro, no crea otro; RSVP general crea registro y devuelve código para editar después. El formulario distingue evento completo/solo ceremonia y valida asistentes contra los pases.
- Código desconocido, invitación aún no publicada o error del servidor muestran estado no disponible; no caen silenciosamente a la boda ficticia ni anuncian que se guardó la respuesta.
- No se importó archivo ni se guardó/editaron/eliminaron grupos. No se comprobó deduplicación, rollback, errores de archivo o entrega real de mensajes.

### 3. Confirmaciones

- Tablero de métricas y pantalla dividida en asistentes y no asistentes; búsqueda, filtro por tipo, orden y páginas.
- Cada respuesta presenta grupo, personas confirmadas y detalle. Hay exportación diferenciada de confirmados y no asistentes.
- La confirmación manual vive en acciones del invitado: sí/no, nombres limitados por pases y mensaje. La reapertura también se expone en ese menú.
- Los nombres confirmados, no los pases abstractos, alimentan el pool del plano. Envío automático de notificaciones y política exacta al reabrir una respuesta siguen sin verificarse.

### 4. Plano de mesas

- Editor SVG nativo. Crear mesa redonda o rectangular, color y entre 1 y 20 sillas. Los nodos identifican mesa/silla con `data-mesa-id` y `data-silla-id`.
- Elementos disponibles: entrada, pista, DJ, escenario, mesa de dulces, mesa de quesos y barra.
- El pool contiene solo personas confirmadas y conserva agrupación por familia/pases. Permite asignar una persona a una silla o colocar el grupo completo; una silla ocupada es draggable y el clic derecho libera la asignación observada.
- La distribución automática primero muestra preview, intenta mantener la familia completa y ofrece mesas sugeridas; el algoritmo interno y sus desempates no se certifican.
- Selección múltiple, mover, alinear, espaciar, zoom, paneo, ver todo, minimapa, vista limpia, revisión, deshacer, guardar y restablecer.
- Exportación con jsPDF 4.2.1: A3 horizontal de dos páginas. Es generación PDF, no solo el diálogo de impresión.
- La referencia persiste conceptualmente persona↔silla. Nupcial local todavía guarda grupo↔mesa y dibuja ocupación agregada; esta diferencia está detallada en [reference-festejabonito-client-seating.md](reference-festejabonito-client-seating.md).

### 5. Editor de invitación

La sesión muestra siete pestañas; cada una tiene `Guardar cambios` y `Descartar`. La ayuda indica que se puede cambiar de apartado y volver sin perder la edición en curso.

| Apartado | Estructura visible |
|---|---|
| Datos del evento | Nombres y orden, frase, fecha, formatos de hora, ubicación/dirección/mapa de ceremonia y recepción, fecha límite y confirmación |
| Itinerario | Hora, título, icono y descripción por momento; agregar, quitar y subir/bajar; máximo indicado de 10 |
| Familia | Títulos y nombres de padres; grupos de padrinos y nombres |
| Detalles | Vestimenta, notas, colores sugeridos/a evitar, aviso de solo adultos y agradecimiento |
| Mesa de regalos | Tarjetas, títulos/descripción, billeteras, banco/cuenta/CCI, tipo de cuenta y carga de QR |
| Música | Archivo musical opcional con formatos y tope indicados en la UI |
| Fotos | Portada, sobre, fotos secundarias y encuadre focal/zoom |

No apareció pestaña separada de Diseño en el panel revisado. No se alteraron formularios o archivos. Valores personales, nombres, ubicaciones, cuentas e imágenes no se recopilaron en este informe.

### 6. Canciones

- Lista con búsqueda por canción, artista o sugerente.
- Filtros: todos, aprobadas, rechazadas y pendientes; orden por más recientes.
- Aprobar, rechazar y eliminar por sugerencia; actualizar lista; exportar PDF.
- Efecto de moderación, restricciones por plan y contenido entregado al invitado no comprobados.

### 7. Galería

- Activar/pausar galería y mostrar uso/cupo.
- Copiar enlace, abrir la galería, mostrar código QR, descargar QR en PNG y copiar enlace desde el QR.
- Ver fotos, seleccionar individuales/todas, descargar ZIP, eliminar individualmente.
- Solicitar ampliación del cupo; paquetes de fotos llevan a coordinación por WhatsApp.
- No se tocó el switch, QR, selección, descarga, eliminación, carga ni solicitud. No se verificaron permisos de invitados, moderación, retención, límites efectivos o pago.

## Diferencias importantes con Nupcial local

| Capacidad | Referencia observada | Nupcial local hoy |
|---|---|---|
| Cuenta / plan | Sesión y plan visibles; ofrece ampliaciones | Registro/verificación, cuentas aisladas y checkout falso con cuatro resultados; sin cobro real ni UI de colaboradores |
| Invitados | Excel `.xls`/`.xlsx`, CSV, preview, filtros múltiples, columnas, paginación y respuestas manuales | CRUD, preview/importación CSV y `.xlsx`, filtros estado/categoría/lado, A–Z/recientes, selección, páginas 10/25/50, CSV y compartir URL personal/mensaje/WhatsApp |
| Confirmaciones | Dos listas, tipo de evento, búsqueda, orden, detalle y exportaciones | Tres listas (incluye pendientes), búsqueda, filtros estado/tipo, orden reciente/A–Z, fecha de respuesta y CSV separado de asistentes/no asistentes |
| Mesas | SVG; persona↔silla, grupo completo, preview automático, sugerencias, alinear/espaciar y PDF A3 propio | DOM; grupo↔mesa, sillas visuales agregadas, minimapa, zoom, auto-distribución inmediata, revisión, deshacer e impresión vía navegador. Sin silla persistida ni PDF propio |
| Invitación / link | Invitación pública y respuestas por invitado | Link general y personal, saludo por grupo, enlace copiable/abrible, RSVP completo/ceremonia y edición por código. Link local solo vale en esta instalación; aún sin dominio ni vista previa OG por invitado |
| Canciones | Estados, borrar, filtro/orden y PDF | Agregar, aprobar, rechazar, eliminar, buscar canción/artista/sugerente, filtrar/ordenar y CSV; PDF original no replicado |
| Galería | Activación, QR PNG, selección y ZIP | Activar, subir, seleccionar individual/todo, ZIP local, borrar individual/múltiple. QR depende de servicio externo. En maqueta estática las fotos viven en el navegador; con `npm start` se guardan en el estado JSONB del evento mediante API, todavía sin object storage |
| Ampliaciones | Coordinación manual visible por WhatsApp | Checkout mock server-side local. Producción bloquea checkout y delega cobros a un servicio externo aún no conectado |

En modo estático, Nupcial persiste en navegador y no sincroniza entre dispositivos. Con `npm start`, cuenta SaaS usa sesión/API y estado por evento; PostgreSQL es obligatorio en producción. RSVP separa ceremonia/evento completo y fecha. Galería ZIP crea archivos sin compresión. Ocultar sección no elimina datos. Panel local no está conectado a cuenta de referencia.

## Pendientes de Nupcial por prioridad

- **Bloqueante para producción:** proveedor de correo validado, almacenamiento privado de medios, dominio HTTPS, privacidad, registro operativo, copias restaurables y pruebas E2E en infraestructura final. Auth, recuperación, API multi-cuenta y publicación por slug ya existen.
- **Paridad funcional/visual aún no certificada:** persona↔silla, preview automático que mantiene familias, mesas sugeridas, alineación/espaciado y PDF A3 propio; además formato legado `.xls`, columnas/estado de envío, PDF de canciones, encuadre avanzado y QR PNG offline. La UI toma como guía controles observados; no afirma acceso al código interno.
- **Servicios reales pendientes:** envío/entrega de mensajes, límites y permisos por plan, ampliaciones de cupo, check-in QR y contrato del servicio externo de cobros. El simulador local no cobra; no hay adaptador de pasarela en esta app.
- **Distribución de enlaces pendiente:** dominio público estable, enlaces de previsualización social por evento y métricas de aperturas/entrega. En local, la URL usa `localhost` y no sirve para invitados externos; WhatsApp no se envía automáticamente.

Las últimas iteraciones amplían Invitados, Confirmaciones, Canciones y Galería. Cobertura sigue local y comprobada por pruebas de lógica/markup; no equivale a pruebas con backend ni a paridad visual exacta de cada acción.

## Cierre de demo Nupcial con servidor

Iteración del 10 de octubre de 2026. Se agregó a la implementación propia un servidor Node del mismo origen (`npm start`), cookie firmada HttpOnly/SameSite, límite de intentos de acceso, API privada para guardar el estado del panel y almacenamiento en archivo local o PostgreSQL. La invitación pública obtiene solo los campos autorizados y un registro invitado cuando llega su código; sus respuestas, canciones y carga de fotos ya pueden persistir en el servidor. El archivo de respaldo continúa disponible.

El checkout demo usa precio calculado en servidor; representa tarjeta, billetera y transferencia sin campos ni datos reales. Se puede dejar pendiente, aprobar, rechazar o cancelar. Solo aprobación de demo cambia el plan local; los demás resultados dejan el plan intacto. No cobra. El adaptador Mercado Pago fue retirado del backend principal; producción bloquea checkout con `PAYMENT_PROVIDER=external`. Cobros quedan fuera de alcance.

Preparación añadida: `Dockerfile`, `docker-compose.yml` con PostgreSQL persistente, variables de entorno de muestra, endpoint de salud y arranque que exige configuración de producción. El plano local cubre asignación de grupo a mesa, selección múltiple móvil, filtros, vistas, minimapa, auto-distribución, revisión y guardado. Las sillas dibujadas no son registros persistidos.

Iteración posterior convirtió base en un solo SaaS multi-cuenta: alta, recuperación, eventos 1:N, selección, publicación y aislamiento A/B están implementados. Despliegue productivo aún requiere almacenamiento de objetos/CDN, proveedor de correo validado, backup operativo, observabilidad, privacidad y E2E sobre infraestructura final. Cobros siguen excluidos y requieren servicio independiente.

## Iteración: recorrido de cliente nuevo

Probado en navegador contra una instancia temporal aislada, sin leer ni cambiar el estado existente de `4173`:

1. Inicio → catálogo → probador: selecciona modelo, paleta y plan; abre invitación previa.
2. Configuración de 3 pasos: datos requeridos → diseño/paleta/plan → resumen. Validación impide fechas inválidas y conserva selección al volver.
3. Acceso demo: en instalación vacía crea un estado nuevo; invitados, mesas, canciones, itinerario, regalos y fotos parten vacíos. Apartados opcionales sin contenido se omiten de invitación pública.
4. Planes → checkout mock: precio server-side, compra pendiente; aprobación simulada activa plan. No se ingresan datos de tarjeta ni se mueve dinero.
5. Panel: plan, métricas en cero y módulos del cliente; se creó un grupo ficticio, se abrió su URL personal y se comprobó RSVP de ceremonia reflejado en Confirmaciones.
6. Protección: usuario ya autenticado no vuelve a onboarding. Si una instalación tiene evento, alta no reemplaza ni mezcla ese estado; se conserva y se redirige al evento actual con aviso.

Ese recorrido demo histórico fue reemplazado por alta real de desarrollo: cada cuenta verificada puede crear múltiples eventos aislados y seleccionarlos desde `/#/events`. Billing separado queda fuera de alcance.

## Cobertura de diagramas

El visor [system-map.html](system-map.html) tiene 23 mapas: seis generales/de arquitectura, ocho de detalle cliente, tres de datos/cobro/cuentas y seis flujos transversales de identidad, publicación, sincronización, medios, entitlements y operación. [architecture.md](architecture.md) detalla tecnologías, persistencia, arquitectura y pendientes. Los diagramas editables están en [system-map.js](system-map.js); se exportan como SVG/Mermaid a [diagrams](diagrams/).

Leyenda: azul = control visto en la UI; verde = comportamiento local de Nupcial; discontinuo = proceso no verificado o propuesta. Ninguna flecha azul significa que el paso se haya ejecutado con éxito. No se han probado mutaciones en la cuenta real.

Brechas restantes para afirmar lógica completa del producto original: checkout/activación y políticas de plan; restricciones de acceso; ejecución/guardado de las acciones visibles; sincronización entre dispositivos; errores y reintentos; entrega de mensajes; operación de medios y privacidad; compatibilidad móvil/roles no visibles. Requieren documentación/ambiente autorizado o pruebas específicas; la interfaz por sí sola no las expone.

## Privacidad y procedencia

No se copiaron personas invitadas, respuestas, teléfonos, correos personales, códigos, fechas privadas, textos de mensajes, imágenes, archivos ni credenciales al código, diagramas o documentación. La revisión se limitó a etiquetas, campos, botones, límites declarados y flujo visible.
