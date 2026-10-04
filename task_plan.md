# Etapa 8 - Hardening, Demo y Deploy MVP

## Goal
Implementar Fase 8 del plan: matriz/cobertura de permisos, UX final verificable, seeds demo, hardening de errores/casos edge y preparacion de deploy MVP sin tocar produccion sin backup/confirmacion.

## Phases
1. Relevar estado actual de permisos, seeds, errores de negocio, frontend y deploy. Status: complete.
2. Backend TDD: agregar tests rojos para permisos sensibles, seed demo y edge cases documentados. Status: complete.
3. Backend implementacion: permisos faltantes, seed demo idempotente y errores de negocio claros. Status: complete.
4. Frontend UX hardening: formularios/flujos compactos, estados de error/carga y documentar verificacion responsive. Status: complete.
5. Deploy readiness: Dockerfiles/config/env docs/checklist VPS sin ejecutar produccion sin backup. Status: complete.
6. Verificacion: build/test/e2e backend y frontend, smoke local y reporte final. Status: complete.

## Decisions
- Rama de trabajo: `etapa/8-hardening-demo-deploy`, creada desde `develop`.
- La etapa 8.5 se prepara y documenta; el deploy productivo real requiere backup reciente/verificado y acceso/confirmacion operativa antes de tocar VPS.
- Mantener TDD para cambios de comportamiento: escribir test, verlo fallar, implementar minimo, verificar verde.

## Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
| `error building bubblewrap command: mountinfo path is not absolute` | `pwd`, `rg --files`, `git status`, `apply_patch` y otros comandos en sandbox | Reintentar comandos/ediciones necesarios con `require_escalated` y permisos acotados. |
| `pnpm run test -- --runInBand` pasa `--runInBand` como patron de Jest | Verificacion backend completa | Usar `pnpm --dir backend exec jest --runInBand` y `pnpm --dir backend exec jest --config test/jest-e2e.json --runInBand`. |
