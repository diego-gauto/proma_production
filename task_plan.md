# Etapa 6 - Notificaciones

## Goal
Implementar Fase 6 del plan: backend de notificaciones, deteccion de cuellos de botella, fechas estimadas incumplidas y frontend con campanita/listado/marcar leidas.

## Phases
1. Relevar implementacion actual de notificaciones, eventos, permisos y UI. Status: complete.
2. Backend TDD: tests rojos para endpoints, cuello de botella y vencimientos. Status: complete.
3. Backend implementacion: servicio, controlador, schedule/configuracion y reglas anti-duplicado. Status: complete.
4. Frontend TDD/implementacion: API, campanita, listado y marcar leidas con polling simple. Status: complete.
5. Verificacion: build/test backend y frontend, e2e relacionado y smoke funcional. Status: complete.

## Decisions
- Trabajar en rama `etapa/6-notificaciones` nacida desde `develop`.
- Mantener notificaciones in-app por polling en frontend, segun PRD MVP; no agregar WebSocket si no existe base previa.
- Implementar chequeos periodicos con intervalo diario propio del modulo para no agregar `@nestjs/schedule` en esta etapa.
- Destinatarios automaticos de cuellos de botella/vencimientos: usuarios ADMIN activos, coherente con visibilidad de control/gerencia del MVP actual.

## Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
| `error building bubblewrap command: mountinfo path is not absolute` | comandos `git status`, `rg`, script de planning y apply_patch en sandbox | Reintentar comandos/ediciones necesarios con `require_escalated`; registrar la causa. |
| `pnpm run test -- --runInBand` paso `--runInBand` como patron de Jest | suite backend completa | Usar `pnpm --dir backend exec jest --runInBand` y equivalente para e2e. |
