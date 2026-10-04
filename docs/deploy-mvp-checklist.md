# Deploy MVP Checklist

Este checklist cubre la etapa 8.5 sin ejecutar cambios productivos automaticamente.

## Pre-flight VPS

- Confirmar recursos libres: `free -h`, `df -h`, `docker stats`.
- Confirmar servicios existentes en Dokploy y Postgres compartido.
- Confirmar backup reciente de Postgres antes de correr migraciones.
- Crear base/app dedicada para Proma; no reutilizar una base de otra app.

## Build local de imagenes

```bash
docker build -f backend/Dockerfile -t proma-backend:local .
docker build -f frontend/Dockerfile -t proma-frontend:local .
```

## Variables requeridas

Backend:

- `NODE_ENV=production`
- `PORT=3001`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN=8h`
- `CORS_ORIGIN=https://<frontend>`
- `BOTTLENECK_THRESHOLD_DAYS=3`
- `ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_FULL_NAME`, `ADMIN_INITIAL_PASSWORD` solo para bootstrap inicial.

Frontend:

- `NEXT_PUBLIC_API_URL=https://<backend>/api/v1`

## Migraciones y seed demo

Las migraciones se corren como paso explicito, nunca al bootear la app:

```bash
pnpm --dir backend run migration:run
pnpm --dir backend run seed:demo
```

El seed demo es opcional en produccion; usarlo solo si el MVP necesita datos de demostracion visibles.

## Smoke productivo

- Login con usuario admin real.
- Crear una orden real de prueba.
- Iniciar y finalizar una etapa con datos validos.
- Ver dashboard lista/Kanban y campanita sin errores.
- Verificar logs sin errores de CORS, JWT ni conexion a base.
