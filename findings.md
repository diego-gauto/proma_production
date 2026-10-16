# Findings

- PRD actual todavia declara stock fuera de MVP y fabrics/supplies con supplier textual.
- Frontend ya consume `PaginatedResponse`, pero `listMasters` no envia `page`/`limit`.
- Backend ya pagina ABMs.

- El seed demo dependia de supplier en fabrics/supplies; se actualizo.
- TypeORM falla con getManyAndCount cuando combina leftJoinAndSelect, skip/take y orderBy; proveedores usa findAndCount.


---

# Hallazgos Avíos
- El PRD §3.4-9 permitía finalizar con faltantes. El usuario confirma inicio libre y cierre condicionado por avíos correspondientes.
- Nunca crear eventos abiertos paralelos: preparación vive en checklist.
- quantityNeeded actual se precarga por unidad, sin multiplicar por prendas. Usar cantidad del artículo por prendas y devolver total calculado.
- Corte usa CorteSector.module.css; detalle sectorial propio. Se preservará este sistema visual.
- El catálogo no distingue botones: pendiente confirmación de marca explícita.
- Sandbox falla al montar bubblewrap; comandos autorizados mediante escalación.
