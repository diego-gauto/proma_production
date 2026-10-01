# Proma Production

Monorepo del Sistema de Seguimiento de Produccion Textil.

## Estructura

```txt
backend/   # NestJS + TypeORM + PostgreSQL
frontend/  # Next.js App Router + TypeScript + CSS Modules
docs/      # Vision, PRD, plan de implementacion y reglas del proyecto
```

## Flujo de trabajo

Todo trabajo nuevo nace desde `develop`:

```bash
git switch develop
git pull
git switch -c etapa/<nombre>
```

La rama se mergea o pasa por PR hacia `develop` solamente despues de compilar, testear y verificar la etapa.

## Desarrollo local

Fase 0 deja funcionando localmente:

- PostgreSQL 16 con Docker Compose.
- Backend en `http://localhost:3001`.
- Frontend en `http://localhost:3000`.

```bash
docker compose up -d postgres
pnpm --dir backend run migration:run
pnpm --dir backend run start:dev
pnpm --dir frontend run dev
```

Smoke test esperado:

- Backend: `curl http://localhost:3001/api/v1` responde `Hello World!`.
- Frontend: `curl -I http://localhost:3000` responde `200 OK`.
- CORS local: el backend devuelve `Access-Control-Allow-Origin: http://localhost:3000`.

## Package Manager

Este proyecto usa `pnpm` para todo lo que se pueda.

```bash
corepack enable
corepack prepare pnpm@10.17.1 --activate
pnpm install
```

No usar `npm install` ni commitear `package-lock.json`.

## Verificacion

```bash
pnpm --dir backend run build
pnpm --dir backend run test
pnpm --dir frontend run build
pnpm --dir frontend run lint
pnpm --dir frontend run test
```
