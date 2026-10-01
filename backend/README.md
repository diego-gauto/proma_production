# Backend

Backend NestJS del Sistema de Seguimiento de Produccion Textil.

## Requisitos

- Node.js 22.x
- pnpm 10.x

## Comandos

```bash
pnpm install
pnpm run start:dev
pnpm run build
pnpm run test
pnpm run test:e2e
pnpm run migration:run
pnpm run migration:revert
```

El backend corre localmente en `http://localhost:3001`.

## Variables de entorno

Crear `backend/.env.local` desde `backend/.env.example`.

La base local esperada para desarrollo usa PostgreSQL en `localhost:55432`.
