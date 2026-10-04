# Fase 5 Motor de Etapas Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar operación por etapa para iniciar/finalizar partes, checklist de avíos y estado Arreglo según PRD Fase 5.

**Architecture:** El backend mantiene la lógica dentro de `OrdersModule`, agregando DTOs, endpoints y un servicio específico para eventos de etapa. El frontend actual es mínimo, así que esta etapa prioriza API completa y deja una superficie básica de cliente/API para operación.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, Jest e2e, Next.js/TypeScript/CSS Modules.

---

### Task 1: Backend Stage Events Tests

**Files:**
- Modify: `backend/test/orders.e2e-spec.ts`
- Create: `backend/src/modules/orders/stage-events.service.ts`
- Modify: `backend/src/modules/orders/order-parts.controller.ts`

**Steps:**
1. Add failing e2e coverage for `POST /order-parts/:id/stage-events/start`: valid start, duplicate active event conflict, external without workshop bad request, wrong sector forbidden.
2. Run `pnpm --dir backend run test:e2e -- orders.e2e-spec.ts` and confirm RED.
3. Add DTOs and `StageEventsService.start()` with permission checks, active-event guard, external workshop validation and Atraque internal-only validation.
4. Re-run targeted e2e and confirm GREEN.

### Task 2: Backend Finish Tests

**Files:**
- Modify: `backend/test/orders.e2e-spec.ts`
- Modify: `backend/src/modules/orders/stage-events.service.ts`

**Steps:**
1. Add failing e2e coverage for finish active event, finish without event conflict, final Terminacion finishing order, and external Confeccion with `includesAtraque=true`.
2. Run targeted e2e and confirm RED.
3. Implement `StageEventsService.finish()` to close active events, update part/order state, and auto-create closed Atraque event when required.
4. Re-run targeted e2e and confirm GREEN.

### Task 3: Supplies And Repair

**Files:**
- Modify: `backend/test/orders.e2e-spec.ts`
- Modify: `backend/src/modules/orders/orders.controller.ts`
- Modify: `backend/src/modules/orders/order-parts.controller.ts`
- Modify: `backend/src/modules/orders/orders.service.ts`

**Steps:**
1. Add failing e2e coverage for `PATCH /order-parts/:id/supplies/:supplyId`, `POST /orders/:id/repair`, and `POST /orders/:id/repair/resolve`.
2. Run targeted e2e and confirm RED.
3. Implement service methods with Admin/permission checks and DTO validation.
4. Re-run targeted e2e and confirm GREEN.

### Task 4: Verification

**Files:**
- All touched backend/frontend files.

**Steps:**
1. Run `pnpm --dir backend run build`.
2. Run `pnpm --dir backend run test`.
3. Run `pnpm --dir backend run test:e2e`.
4. If frontend files are touched, run `pnpm --dir frontend run build` and `pnpm --dir frontend run test`.
5. Perform at least one real API smoke flow against the local backend if the environment is available.
