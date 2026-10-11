# Flujos de Nupcial

Abrir [system-map.html](system-map.html) directamente en el navegador. Funciona sin servidor ni conexión y no utiliza datos del evento. [architecture.md](architecture.md) explica tecnologías/arquitectura; [database.md](database.md) documenta migración PostgreSQL y alcance; [database-erd.mmd](diagrams/database-erd.mmd) muestra relaciones; [client-audit.md](client-audit.md) contiene inventario y límites observados; [next-iteration.md](next-iteration.md) prioriza brechas y criterios de cierre.

## Diagramas

1. General: inicio → diseños → probador → datos → registro/verificación → evento aislado → elección de plan sin cobro → panel → publicación → RSVP público.
2. Paletas: tema → colores por función → vista previa → selección persistida → invitación.
3. Cliente (resumen): módulos, archivos y relaciones con invitados.
4. Invitado: código válido, fecha límite, respuesta, cupos, guardado, errores y actualización.
5. Datos: relaciones entre evento, invitados, RSVP, mesas, canciones, galería y almacenamiento.
6. Arquitectura: SaaS multi-cuenta implementada y límites operativos para producción pública.
7–14. Cliente (detalle): acceso/plan, invitados, confirmaciones, plano, editor, canciones, galería y ampliaciones. El mapa del invitado detalla link personal, código, RSVP, error, repetición y edición.
15. Cardinalidad 1:N: cuenta → eventos ya activa; colecciones internas permanecen en JSONB por evento.
16. Cobros: checkout ficticio solo local; en producción se bloquea hasta conectar billing externo.

Cada vista se puede ampliar, imprimir como PDF o descargar como SVG y Mermaid editable. El botón de impresión exporta el diagrama seleccionado. La definición editable está en `system-map.js`; no requiere herramientas externas. Los 17 SVG y sus fuentes Mermaid están en `diagrams/`; regenerar con `node docs/export-diagrams.cjs`.

Cada diagrama tiene SVG y fuente Mermaid en `diagrams/`. Para regenerarlos después de editar el mapa: `node docs/export-diagrams.cjs` desde la carpeta del proyecto.

17. Cuentas y aislamiento: registro, autorización tenant-aware, rutas públicas y pruebas A/B implementadas; operación cloud aún pendiente.

## Criterio de alcance

- Azul: elementos de interfaz observados en la cuenta de referencia. Ver el control no prueba que se haya guardado, enviado, comprado o activado.
- Verde: comportamiento de la implementación local; no equivale a producción.
- Discontinuo: comportamiento no comprobado o propuesta pendiente.
- Los diagramas de cliente (07–14) distinguen la interfaz observada de la implementación propia. Los mapas de arquitectura/checkout describen Nupcial y no procesos internos privados de Festeja Bonito.
- Nombres de modelos y paletas observados: Versalles, Terra, Classic y nueve paletas. Los HEX son elecciones de Nupcial, no una extracción certificada del original.
- El login demo, persistencia server-side y rutas públicas corren localmente con `npm start`. El checkout mock no recibe tarjeta ni mueve dinero. Adaptador y webhook de Mercado Pago fueron retirados; cobros quedan fuera del alcance actual.
- Alta SaaS empieza con estado limpio, cuenta verificada y evento aislado. Login demo conserva compatibilidad local únicamente.
- Diagrama 1:N distingue relación real cuenta → eventos del documento JSONB versionado que aún contiene colecciones internas.

## Reglas funcionales importantes

- Tema y paleta deben sobrevivir catálogo → probador → configuración → editor → invitación.
- Cambiar estilo no elimina contenido. Ocultar una sección tampoco elimina sus datos.
- Cupos asignados (`passes`) y asistentes reales (`confirmedCount`) son valores distintos.
- Una respuesta personal actualiza el invitado por código. Un código desconocido no crea una respuesta anónima.
- La confirmación general obtiene un enlace estable; actualizar desde ese enlace no duplica el invitado.
- Importación CSV inválida se rechaza; restauración JSON se valida antes de reemplazar el evento.
- Una mesa no puede superar capacidad; se cuentan asistentes reales.
- El plano de mesas conserva posiciones y asignaciones en estado demo; no publicar hasta configurar dominio/HTTPS y revisar la privacidad del evento.
- Fallos de almacenamiento deben revertir la mutación y no anunciar éxito.
- En modo servidor, el panel usa sesión/API y la invitación toma una proyección pública del estado del servidor. En modo de maqueta estática, los datos solo viven en el navegador.

Documentado el 10 de octubre de 2026, America/Lima. Archivos y diagramas sin credenciales, nombres, teléfonos, invitaciones, mensajes ni conteos de la cuenta de referencia.
