# Findings - Etapa 8

- `AGENTS.md`, `docs/01-Vision-Proyecto.md`, `docs/02-PRD.md` completo y `docs/04-Plan-Implementacion.md` leidos en esta sesion.
- Etapa 8 incluye 8.1 permisos end-to-end, 8.2 UX final, 8.3 seeds demo, 8.4 hardening de errores/casos edge y 8.5 deploy MVP.
- Riesgo/limite: 8.5 involucra produccion/VPS, backup y smoke real. No se debe ejecutar migracion/deploy productivo sin backup reciente verificado.
- Estado inicial: rama base era `main`, se cambio a `develop` y se creo `etapa/8-hardening-demo-deploy`.
- Backend existente: modulos auth, users, masters/catalog, orders/stage-events, notifications y dashboard.
- Frontend existente: app principal concentrada en `frontend/src/app/page.tsx`, componentes UI basicos, APIs de masters/orders/dashboard/notifications.
- No se detecto carpeta de seeds dedicada bajo `backend/src/database`; solo migraciones existentes.
- Brecha encontrada en 8.1: `POST /order-parts/:id/split` y `POST /order-parts/recombine` no recibian usuario autenticado y permitian operar a cualquier usuario autenticado.
- El modelo no tiene constraint unico en `clients.tax_id`; el seed demo debe hacer select/update manual en clientes en vez de `ON CONFLICT (tax_id)`.
