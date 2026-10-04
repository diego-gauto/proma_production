# Findings - Etapa 6

- `AGENTS.md`, `docs/01-Vision-Proyecto.md`, `docs/02-PRD.md` y `docs/04-Plan-Implementacion.md` leidos en esta sesion.
- Etapa 6 requiere: `NotificationsService.create()`, `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, cron de cuellos de botella respetando `stages.excluded_from_bottleneck_alerts`, umbral configurable, deteccion de fechas estimadas vencidas sin duplicar notificaciones, y frontend con conteo/listado/marcar leida.
- Se eligio polling simple para el frontend porque el PRD permite polling o WS y no conviene agregar infraestructura WebSocket para el MVP si no existe.
