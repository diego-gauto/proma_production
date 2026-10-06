# Findings

- PRD actual todavia declara stock fuera de MVP y fabrics/supplies con supplier textual.
- Frontend ya consume `PaginatedResponse`, pero `listMasters` no envia `page`/`limit`.
- Backend ya pagina ABMs.

- El seed demo dependia de supplier en fabrics/supplies; se actualizo.
- TypeORM falla con getManyAndCount cuando combina leftJoinAndSelect, skip/take y orderBy; proveedores usa findAndCount.
