# Flujos de Nupcial

Abrir [system-map.html](system-map.html) directamente en el navegador. Funciona sin servidor ni conexión y no utiliza datos del evento. [project-status.md](project-status.md) resume inventario, avance y roadmap; [architecture.md](architecture.md) explica tecnologías/arquitectura; [database.md](database.md) documenta migración PostgreSQL y alcance; [database-erd.mmd](diagrams/database-erd.mmd) muestra relaciones; [client-audit.md](client-audit.md) contiene inventario general; [reference-festejabonito-client-seating.md](reference-festejabonito-client-seating.md) conserva el contrato observado de invitados, confirmaciones y plano persona↔silla; [next-iteration.md](next-iteration.md) prioriza brechas.

## Diagramas

1. General: inicio → diseños → probador → datos → registro/verificación → evento aislado → panel → publicación → RSVP; planes/mock quedan como recorrido opcional.
2. Paletas: tema → colores por función → vista previa → selección persistida → invitación.
3. Cliente (resumen): módulos, archivos y relaciones con invitados.
4. Invitado: código válido, fecha límite, respuesta, cupos, guardado, errores y actualización.
5. Datos: relaciones entre evento, invitados, RSVP, mesas, canciones, galería y almacenamiento.
6. Arquitectura: SaaS multi-cuenta implementada y límites operativos para producción pública.
7–14. Cliente (detalle): acceso/plan, invitados, confirmaciones, plano, editor, canciones, galería y ampliaciones. El mapa del invitado detalla link personal, código, RSVP, error, repetición y edición.
15. Cardinalidad 1:N: cuenta → eventos ya activa; colecciones internas permanecen en JSONB por evento.
16. Cobros: checkout ficticio solo local; en producción se bloquea hasta conectar billing externo.
17. Cuentas y aislamiento: propietario 1:N eventos, membresías N:M, autorización, proyección pública y pruebas A/B.
18. Identidad: registro por correo, clave elegida al verificar, sesiones, logout y recuperación con revocación.
19. Evento y publicación: onboarding, selección de evento, borrador/publicado, slug, códigos y despublicación.
20. Estado y respaldo: revisión optimista, conflicto 409, exportación, validación, identidad canónica y reset solo demo.
21. Medios: validaciones actuales y objetivo de moderación, object storage, URL firmada y retención.
22. Planes y cupos: preferencia/mock actual frente a entitlement y enforcement todavía pendientes.
23. Operación y privacidad: despliegue, secretos, observabilidad, backup/restore y ciclo de datos.

Cada vista se puede ampliar, imprimir como PDF o descargar como SVG y Mermaid editable. El botón de impresión exporta el diagrama seleccionado. La definición editable está en `system-map.js`; no requiere herramientas externas. Los 23 SVG y sus fuentes Mermaid están en `diagrams/`; regenerar con `node docs/export-diagrams.cjs`.

Cada diagrama tiene SVG y fuente Mermaid en `diagrams/`. Para regenerarlos después de editar el mapa: `node docs/export-diagrams.cjs` desde la carpeta del proyecto.

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
- En Nupcial actual, `guest.table` asigna el grupo completo a una mesa; las sillas son representación visual, no registros. La referencia usa persona↔silla.
- El plano de mesas conserva posiciones y asignaciones de grupo en estado demo; no publicar hasta configurar dominio/HTTPS y revisar la privacidad del evento.
- Fallos de almacenamiento deben revertir la mutación y no anunciar éxito.
- En modo servidor, el panel usa sesión/API y la invitación toma una proyección pública del estado del servidor. En modo de maqueta estática, los datos solo viven en el navegador.

Documentado el 10 de octubre de 2026, America/Lima. Archivos y diagramas sin credenciales, nombres, teléfonos, invitaciones, mensajes ni conteos de la cuenta de referencia.
