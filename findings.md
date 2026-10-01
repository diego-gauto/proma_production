# Findings

## 2026-08-21

- La raiz real del proyecto es `/home/hpadmin/proyectos/Proma_production`.
- Antes solo existia `docs/`; `docs/.git` estaba vacio y rompia comandos Git.
- Node inicial instalado: `v20.18.0`.
- npm instalado: `10.8.2`.
- Docker instalado: `28.3.3`.
- Se instalo Node.js `v22.23.2` con npm `10.9.8` usando nvm y quedo como default.
- El proyecto debe usar `pnpm` para dependencias y scripts; `npm` queda solo como herramienta incluida con Node, no como package manager del repo.
- En shells nuevos del sandbox, `node` aparece como `v18.19.1` y `pnpm` no esta en PATH si no se ejecuta `source /home/hpadmin/.nvm/nvm.sh && nvm use 22`.
- Backend quedo instalado y verificado con pnpm.
- Frontend fue scaffolded, pero la instalacion quedo incompleta por timeout de red contra registry.npmjs.org.

## 2026-10-01

- El repo ahora tiene remoto Git `origin` apuntando a `https://github.com/diego-gauto/proma_production.git`. Para cerrar 0.1 en GitHub falta publicar/confirmar `main` y `develop` remotas y protecciones/regla de PR.
- `proma-postgres` ya existia y estaba running/healthy en Docker.
- El sandbox bloquea conexiones TCP a `localhost` y al daemon Docker para algunos comandos; las verificaciones de DB/servidores requieren permiso escalado.
- El CLI `typeorm-ts-node-commonjs ... migration:*` quedo colgado durante la verificacion; los runners TS explicitos (`runMigrations`, `undoLastMigration`) funcionan correctamente.
- `migration:revert` emite un warning de `pg` sobre `client.query()` concurrente, pero la migracion revierte correctamente.
- El build frontend del scaffold default fallaba con "webpack errors" sin detalle; al quitar `next/font/google` y assets promocionales, `next build` pasa.
- El e2e backend exponia que `PORT` y `BOTTLENECK_THRESHOLD_DAYS` no se convertian de string a number en `env.validation.ts`; se corrigio con `@Type(() => Number)` y se agrego test unitario.
