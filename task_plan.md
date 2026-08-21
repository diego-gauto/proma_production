# Task Plan - Fase 0

## Goal

Inicializar el monorepo de Proma Production y dejar lista la base de trabajo local para backend, frontend, base de datos y Git.

## Phases

| Phase | Status | Notes |
|---|---|---|
| 0.1 Git, GitHub y reglas de trabajo | in_progress | Git inicializado localmente en la raiz. Falta confirmar/configurar remoto GitHub y rama `develop`. |
| 0.2 Repositorio monorepo y estructura base | pending | Crear `backend/`, `frontend/`, `.env.example` y READMEs especificos. |
| 0.3 Base local y primera migracion | pending | Agregar Docker Compose con PostgreSQL 16 y configurar TypeORM. |
| 0.4 Verificacion local end-to-end | pending | Levantar DB, backend y frontend localmente. |

## Decisions

- Se usa monorepo con `backend/`, `frontend/` y `docs/`.
- `AGENTS.md` vive en la raiz real del repo.
- El desarrollo se verifica localmente antes de subir a GitHub o desplegar en Dokploy.

## Errors Encountered

| Error | Attempt | Resolution |
|---|---|---|
| `/docs` tenia un `.git` vacio y no era un repo valido | `git status` desde `/docs` fallo | Se inicializo Git en la raiz real y se elimino `docs/.git`. |
| Node local era `v20.18.0`, PRD pide Node 22 LTS | Verificacion de entorno | Instalado Node.js `v22.23.2` con nvm y seteado como default. |
