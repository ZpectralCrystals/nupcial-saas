# Brechas y siguiente iteración

**Revisado:** 11 de octubre de 2026. **Resultado:** un solo SaaS multi-cuenta funcional para demo; aún no certificado para usuarios y datos reales. Cobro real queda fuera.

## Cerrado en implementación actual

- Registro, verificación de correo, login, logout y recuperación de contraseña.
- Sesiones revocables, hash scrypt y límites persistentes.
- Cuenta 1:N eventos, selector de evento y autorización por cuenta/evento.
- Publicación/despublicación por slug y enlaces personalizados por invitado.
- Proyección pública; RSVP, canciones y galería vuelven al evento correcto.
- Prueba A/B de aislamiento entre dos cuentas.
- Migraciones automáticas `001` y `002`.
- Inicio, catálogo, 27 combinaciones, onboarding y todos los paneles cliente.
- Checkout ficticio sin tarjeta/dinero; billing real separado.

## Pendientes priorizados

| Prioridad | Área | Cierre requerido |
|---|---|---|
| P0 | PostgreSQL productivo | Ejecutar migraciones y E2E en instancia administrada; probar concurrencia, backup y restauración. |
| P0 | Email | Elegir proveedor, adaptar contrato, verificar dominio, entregabilidad, rebotes y rate limits. |
| P0 | Medios | Object storage privado, URLs firmadas, antivirus/tipo real, cuotas, retención y borrado. |
| P0 | Privacidad | Términos, aviso, consentimiento, exportación/borrado de cuenta y calendario de retención. |
| P1 | Operación | Logs estructurados, métricas, alertas, trazas, rotación de secretos y runbooks. |
| P1 | E2E | Navegador real: registro, dos tenants, eventos, publicación, RSVP, medios y recuperación. |
| P1 | Colaboradores | UI/API para invitar editor/viewer; expiración/revocación de invitaciones. |
| P1 | Datos | Migrar módulos desde documento JSONB a repositorios relacionales cuando escala/concurrencia lo exijan. |
| P1 | Mensajes | Email/WhatsApp transaccional con consentimiento, estados y reintentos. |
| P2 | Producto | Check-in QR, dominios personalizados, OG dinámico, PDF propio y analítica de aperturas. |

## Criterio de salida a nube pública

1. Dos cuentas y varios eventos pasan E2E sin acceso cruzado.
2. Proveedor de email verifica y recupera cuentas en dominio real.
3. Medios no se guardan como base64 en PostgreSQL.
4. Backup se restaura en ambiente limpio y documentado.
5. Alertas detectan errores, latencia y abuso.
6. Privacidad, términos y eliminación de datos están disponibles.
7. Prueba de carga y revisión de seguridad no encuentran bloqueantes.
8. Billing externo, si se contrata, activa entitlements mediante contrato firmado e idempotente.

Guía manual completa: [manual-testing.md](manual-testing.md).
