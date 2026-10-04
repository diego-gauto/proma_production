# Etapa 4 - Ordenes de corte y partes

## Goal
Implementar Fase 4 del plan: creacion/listado/detalle de ordenes, arbol de partes, split/recombine y UI de listado/creacion/detalle, respetando PRD v1.1.

## Phases
1. Backend tests rojos para crear orden real, detalle/arbol, split y recombine. Status: complete.
2. Backend implementacion de DTOs, entidades/relaciones faltantes, servicios y endpoints. Status: complete.
3. Frontend API, listado, formulario y detalle/arbol con acciones. Status: complete.
4. Verificacion: backend tests/build/e2e, frontend tests/build y smoke funcional. Status: complete.

## Decisions
- Extender el sistema visual existente del frontend; no redisenar identidad.
- Mantener cambios en rama `etapa/4-ordenes-partes` nacida desde `develop`.
- Agregar migracion nueva `1791055200000-AddOrderCreationRelations.ts` para mapear `fabric_id`, `size_curve_id` e `initial_workshop_id` en `orders` sin editar migraciones aplicadas.

## Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
| `error building bubblewrap command: mountinfo path is not absolute` | comandos `git status`, `find`, `rg`, script Impeccable, apply_patch y algunos pnpm en sandbox | Reintentar comandos/ediciones necesarios con `require_escalated`; registrar la causa. |
| `next start -- -p 3000` interpreta `-p` como directorio | smoke frontend | Usar `pnpm --dir frontend exec next start -p 3002`. |
| Puerto 3000 ocupado | smoke frontend | Verificar este build en puerto 3002. |
