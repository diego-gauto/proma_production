# Vista de Avíos — plan de implementación

**Objetivo:** operar Avíos de confección y terminación en paralelo a producción, con la misma estética de Corte.
**Arquitectura:** checklist por parte independiente de part_stage_events. API calcula totales por prendas, valida permisos de categoría y guarda preparación. La finalización de sectores consumidores verifica avíos; iniciarlos permanece libre.
**Stack:** NestJS/TypeORM/Postgres, Next.js/TypeScript/CSS Modules, pnpm.

1. Tests en backend/src/modules/orders para preparación, sobrantes, faltantes, permisos y cierre condicionado. Ejecutar pnpm --dir backend test -- --runInBand.
2. Extender orders.service.ts, dto/order.dto.ts, order-parts.controller.ts y stage-events.service.ts; conservar invariantes de eventos, componentes y Atraque.
3. Crear componentes SupplySector y SupplyOrderDetail usando CorteSector.module.css y CSS Modules propios. Integrar sesión y navegación desde órdenes/sectores.
4. Actualizar PRD y plan con regla confirmada. No consumir stock automáticamente.
5. Verificar pnpm --dir frontend exec tsc --noEmit, tests frontend/backend, e2e de orders y flujo real en localhost:3000/3001. No next build concurrente con next dev.
