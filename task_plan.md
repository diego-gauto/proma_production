# Task Plan - Fase 0

## Goal

Inicializar el monorepo de Proma Production y dejar lista la base de trabajo local para backend, frontend, base de datos y Git.

## Phases

| Phase | Status | Notes |
|---|---|---|
| 0.1 Git, GitHub y reglas de trabajo | complete | Ramas locales y remotas `main`, `develop` y `etapa/0-setup-monorepo` confirmadas. `origin` configurado en GitHub. Regla operativa de trabajar desde `develop` y volver por PR/merge documentada. |
| 0.2 Repositorio monorepo y estructura base | complete | Monorepo con `backend/`, `frontend/`, `docs/`, workspace pnpm, READMEs y `.env.example`. Backend y frontend compilan. |
| 0.3 Base local y primera migracion | complete | PostgreSQL 16 en Docker Compose, TypeORM con `synchronize:false`, validacion de env, migracion dummy y scripts `migration:run`/`migration:revert` verificados. |
| 0.4 Verificacion local end-to-end | complete | Postgres, backend y frontend levantan localmente. Smoke HTTP documentado y verificado. Fase 0 lista para avanzar a Fase 1. |

## Decisions

- Se usa monorepo con `backend/`, `frontend/` y `docs/`.
- Se usa `pnpm` para instalar dependencias, correr scripts y generar lockfiles.
- `AGENTS.md` vive en la raiz real del repo.
- El desarrollo se verifica localmente antes de subir a GitHub o desplegar en Dokploy.

## Errors Encountered

| Error | Attempt | Resolution |
|---|---|---|
| `/docs` tenia un `.git` vacio y no era un repo valido | `git status` desde `/docs` fallo | Se inicializo Git en la raiz real y se elimino `docs/.git`. |
| Node local era `v20.18.0`, PRD pide Node 22 LTS | Verificacion de entorno | Instalado Node.js `v22.23.2` con nvm y seteado como default. |
| Backend fue generado inicialmente con npm antes de fijar pnpm | Scaffold backend | Convertir a `pnpm`: eliminar `package-lock.json`, reinstalar y generar `pnpm-lock.yaml`. |
| `pnpm install` intento resolver `@typescript-eslint/visitor-keys@8.67.0`, no disponible en registry | Primera instalacion pnpm | Fijar `@typescript-eslint/eslint-plugin` y `@typescript-eslint/parser` en `8.66.0`, version disponible reportada por pnpm. |
| `create-next-app` fallo instalando dependencias por `frozen-lockfile` en CI | Scaffold frontend | Ejecutar `pnpm install --no-frozen-lockfile` desde la raiz del workspace para actualizar `pnpm-lock.yaml`. |
| `pnpm install --no-frozen-lockfile` fallo por timeout descargando `@rushstack/eslint-patch` | Instalacion frontend | Pendiente reintentar con red estable o mas retries; frontend no tiene `node_modules` y `next` no esta disponible. |
| `pnpm install --frozen-lockfile` aborto por falta de TTY al recrear `node_modules` | Verificacion Fase 0 | Reejecutado con `CI=true`; luego se requirio permiso de red por `EAI_AGAIN` y finalizo OK. |
| Builds lanzados mientras `pnpm install` seguia reconstruyendo dependencias | Verificacion inicial | Se espero/finalizo instalacion y se repitieron builds limpios. |
| `pnpm --dir backend run migration:*` con TypeORM CLI quedaba colgado | Verificacion 0.3 | Se reemplazaron scripts por runners TS explicitos con `runMigrations()` y `undoLastMigration()`. |
| Acceso a Docker, DB local y puertos localhost bloqueado por sandbox | Verificacion 0.3/0.4 | Se ejecutaron los comandos necesarios con permiso escalado. |
| `frontend` build fallaba por webpack sin detalle en el scaffold default | Verificacion 0.2 | Se reemplazo el template default por una pantalla base local y se quito `next/font/google`. |

## Verification

| Check | Result |
|---|---|
| Rama actual | `etapa/0-setup-monorepo` |
| Node 22 con nvm cargado | OK: `v22.23.2` |
| pnpm con nvm cargado | OK: `10.17.1` |
| Backend build | OK: `pnpm --filter backend run build` |
| Backend tests | OK: `pnpm --filter backend run test` |
| Frontend build | OK: `pnpm --dir frontend run build` |
| Frontend lint | OK: `pnpm --dir frontend run lint` |
| Frontend test | OK: placeholder `No frontend tests configured yet` |
| Backend e2e | OK: `pnpm --dir backend run test:e2e` |
| PostgreSQL Docker | OK: `proma-postgres` running/healthy en `localhost:55432` |
| DB connection | OK: `pnpm --dir backend exec ts-node test-conn.ts` |
| Migration revert | OK: `pnpm --dir backend run migration:revert` |
| Migration run | OK: `pnpm --dir backend run migration:run` |
| Backend dev server | OK: Nest arranca en `localhost:3001`, conecta a PostgreSQL y registra `/api/v1` |
| Frontend dev server | OK: Next arranca en `localhost:3000` |
| Smoke backend | OK: `GET http://localhost:3001/api/v1` -> `Hello World!` |
| Smoke CORS | OK: `Access-Control-Allow-Origin: http://localhost:3000` |
| Smoke frontend | OK: `HEAD http://localhost:3000` -> `200 OK` |
| Remote branches | OK: `main`, `develop` y `etapa/0-setup-monorepo` publicadas en GitHub |
