# Matriz de permisos MVP

Esta matriz documenta los endpoints sensibles revisados en etapa 8. Los endpoints no listados requieren JWT por guard global.

| Area | Endpoint | Permiso esperado | Cobertura |
|---|---|---|---|
| Auth | `POST /auth/login` | Publico | `auth.e2e-spec.ts` |
| Auth | `GET /auth/me` | Usuario autenticado | `auth.e2e-spec.ts` |
| Ordenes | `POST /orders` | Admin | `orders.e2e-spec.ts` |
| Ordenes | `POST /orders/:id/repair` | Usuario autenticado del flujo / Admin | `orders.e2e-spec.ts` |
| Ordenes | `POST /orders/:id/repair/resolve` | Admin | `orders.e2e-spec.ts` |
| Partes | `POST /order-parts/:id/split` | Admin o `FORZAR_CAMBIO` global/sector actual | `orders.e2e-spec.ts` |
| Partes | `POST /order-parts/recombine` | Admin o `FORZAR_CAMBIO` global/sector padre si existe | `orders.e2e-spec.ts` |
| Etapas | `POST /order-parts/:id/stage-events/start` | Admin o `INICIAR_ETAPA` del sector | `orders.e2e-spec.ts` |
| Etapas | `POST /order-parts/:id/stage-events/finish` | Admin o `FINALIZAR_ETAPA` del sector | `orders.e2e-spec.ts` |
| Avios de parte | `PATCH /order-parts/:id/supplies/:supplyId` | Admin o `EDITAR` de Avios | `orders.e2e-spec.ts` |
| Notificaciones | `GET /notifications` | Solo notificaciones propias | `notifications.e2e-spec.ts` |
| Notificaciones | `PATCH /notifications/:id/read` | Solo notificacion propia | `notifications.e2e-spec.ts` |
| Dashboard | `GET /dashboard/*` | Usuario autenticado, filtrado segun visibilidad implementada | `dashboard.e2e-spec.ts` |
| Maestros | `POST/PATCH/DELETE` clientes/talleres/telas/avios/curvas/articulos/usuarios | Admin o permiso de administracion/edicion/eliminacion segun modulo | `masters.e2e-spec.ts` |

## Criterio operativo

- `ADMIN` siempre pasa en endpoints operativos.
- Permisos con `sector_code = NULL` representan Produccion/Gerencia con alcance global.
- Atraque no admite taller propio; si viene incluido por Confeccion externa se registra automaticamente desde `StageEventsService.finish()`.
