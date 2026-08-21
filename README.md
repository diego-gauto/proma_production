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

El objetivo de Fase 0 es que funcionen localmente:

- PostgreSQL 16 con Docker Compose.
- Backend en `http://localhost:3001`.
- Frontend en `http://localhost:3000`.

Los comandos definitivos se agregan al cerrar las etapas 0.2 y 0.3.
