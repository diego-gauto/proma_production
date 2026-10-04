# Findings - Etapa 4

- `AGENTS.md`, `docs/01-Vision-Proyecto.md`, `docs/02-PRD.md` y `docs/04-Plan-Implementacion.md` leidos en esta sesion.
- Etapa 4 requiere orden con `fabric_id` y `size_curve_id` a nivel orden, items por talle, parte raiz, checklist desde `article_supplies`, detalle con arbol, filtros de partes por etapa, split `LOTE`/`COMPONENTE`, recombine y UI.
- Backend ya tiene `OrdersService.create/findAll/findOne`, pero `CreateOrderDto` no incluye `fabricId` ni `sizeCurveId`; la entidad `Order` tampoco mapea esas relaciones todavia.
- Tests e2e existentes de ordenes usan inserciones legacy (`clients.name`, `articles.name`) que no reflejan PRD v1.1; se deben actualizar al modelo rectificado.
- Impeccable encontro implementacion visual existente sin `PRODUCT.md`/`DESIGN.md`; para esta tarea se hereda el estilo existente.
