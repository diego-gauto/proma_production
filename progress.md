# Progress

## 2026-08-21

- Leidos documentos obligatorios: `01-Vision-Proyecto.md`, `02-PRD.md`, `04-Plan-Implementacion.md`.
- Usadas skills aplicables: `brainstorming`, `planning-with-files`, `monorepo-management`.
- Inicializado Git en la raiz real del monorepo.
- Copiado `AGENTS.md` desde `docs/` a la raiz.
- Eliminado `docs/.git` vacio.
- Creada documentacion inicial de seguimiento: `task_plan.md`, `findings.md`, `progress.md`.
- Instalado Node.js `v22.23.2` y seteado como default con nvm.
- Definida convencion de `pnpm` en raiz, AGENTS y backend.
- Generado scaffold inicial de frontend con `pnpm dlx create-next-app@15.5.23`; la instalacion interna fallo por frozen lockfile y queda pendiente instalar desde la raiz.
- Verificacion: backend compila con `pnpm --filter backend run build`.
- Verificacion: backend tests pasan con `pnpm --filter backend run test`.
- Verificacion: frontend no esta concluido; `pnpm --filter frontend run build` falla porque `next` no esta instalado y falta `frontend/node_modules`.

## 2026-10-01

- Continuada Fase 0 en rama `etapa/0-setup-monorepo`.
- Confirmado que no hay remoto Git configurado; 0.1 queda parcial por falta de `origin`/GitHub.
- Restauradas dependencias con `CI=true pnpm install --frozen-lockfile` usando permiso de red por fallo `EAI_AGAIN`.
- Ajustado frontend para quitar scaffold promocional/default y dependencia de `next/font/google`; queda pantalla base de Proma Production.
- Agregado script placeholder `frontend:test` porque aun no hay suite de tests frontend en Fase 0.
- Corregidos scripts de migracion backend para usar runners TS explicitos.
- Agregado `backend/revert-migration.ts`.
- Verificacion: `pnpm --dir backend run build` OK.
- Verificacion: `pnpm --dir backend run test` OK; incluye test nuevo de coercion numerica de env.
- Verificacion: `pnpm --dir backend run test:e2e` OK.
- Verificacion: `pnpm --dir frontend run build` OK.
- Verificacion: `pnpm --dir frontend run lint` OK.
- Verificacion: `pnpm --dir frontend run test` OK.
- Verificacion: `docker compose up -d postgres` OK; contenedor `proma-postgres` running/healthy.
- Verificacion: conexion backend a PostgreSQL OK con `test-conn.ts`.
- Verificacion: `pnpm --dir backend run migration:revert` OK.
- Verificacion: `pnpm --dir backend run migration:run` OK.
- Smoke 0.4: backend dev server arranca en `localhost:3001`, conecta a DB y responde `GET /api/v1`.
- Smoke 0.4: frontend dev server arranca en `localhost:3000` y responde `200 OK`.
- Smoke 0.4: CORS backend devuelve `Access-Control-Allow-Origin: http://localhost:3000`.

## 2026-10-01 - remoto GitHub

- Configurado `origin` como `https://github.com/diego-gauto/proma_production.git`.
- Verificacion: `git remote --verbose` muestra `origin` para fetch/push.
- Verificacion: `git ls-remote --heads origin` responde OK pero no lista ramas remotas; queda pendiente publicar ramas base `main` y `develop`.
- Commit de cierre de Fase 0 creado: `cf55dd9 chore: complete phase 0 setup`.
- Integrada la rama `etapa/0-setup-monorepo` a `develop` con fast-forward.
- Publicadas en GitHub las ramas `main`, `develop` y `etapa/0-setup-monorepo`.
- Etapa 0.1 cerrada operativamente: ramas base disponibles en remoto y regla de trabajo documentada.
