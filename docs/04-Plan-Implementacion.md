# Plan de Implementación Granular

> Cada etapa es lo suficientemente chica como para poder revisarla y testearla de forma aislada antes de pasar a la siguiente. **Ninguna etapa se da por finalizada sin que todos sus tests indicados pasen** (ver criterio general en PRD §11 y AGENTS.md §6). No saltar etapas ni agrupar varias en una sola sesión de trabajo sin revisión intermedia.

> **Regla de Git para todas las etapas**: antes de implementar cualquier etapa o funcionalidad no documentada, crear una rama nueva desde `develop`, aunque el agente/desarrollador esté parado en otra rama. Trabajar solo en esa rama hasta que la etapa esté verificada. Luego abrir PR o mergear hacia `develop`.

> **Modo de desarrollo**: el MVP se desarrolla localmente y se sube a GitHub por etapas cerradas. Frontend, backend y PostgreSQL deben funcionar localmente antes de pasar a despliegue.

---

## FASE 0 — Setup e infraestructura base

### Etapa 0.1 — Git, GitHub y reglas de trabajo
**Objetivo**: dejar listo el flujo de ramas y subida por etapas antes de iniciar el desarrollo.
**Tareas**:
- Confirmar que existen las ramas base `main` y `develop` en GitHub.
- Configurar protección o regla operativa: todo trabajo nuevo nace desde `develop` y vuelve por PR/merge a `develop`.
- Documentar comandos base de trabajo (`git switch develop`, `git pull`, `git switch -c etapa/<nombre>`).
- Confirmar que no se implementa ninguna etapa directamente sobre `main` ni sobre una rama heredada de otra tarea.
**Tests / criterio de cierre**: repo conectado a GitHub, ramas base disponibles y regla de ramas documentada. No hay tests automatizados en esta etapa.

### Etapa 0.2 — Repositorio monorepo y estructura base
**Objetivo**: crear el monorepo con los 2 proyectos (backend/frontend) vacíos y funcionando localmente.
**Tareas**:
- Crear rama de trabajo desde `develop`.
- Definir raíz de repo con `backend/`, `frontend/`, `docs/` y `.gitignore` común.
- `nest new backend` con TypeScript.
- `create-next-app` con App Router + TypeScript, sin Tailwind.
- Estructura de carpetas según PRD §4.1 y §4.2 (carpetas vacías con `.gitkeep` donde aplique).
- `.env.example` en ambos proyectos.
- README breve en cada proyecto con comandos de arranque.
**Tests**: `npm run build` corre sin errores en ambos proyectos. Backend levanta en `localhost:3001` con el endpoint default de Nest. Frontend levanta en `localhost:3000` con la página default de Next.

### Etapa 0.3 — Conexión a base de datos y primera migración
**Objetivo**: backend conectado a Postgres, con TypeORM configurado y la primera migración corriendo.
**Tareas**:
- Agregar `docker-compose.yml` local con PostgreSQL 16 y variables de desarrollo.
- Configurar `TypeOrmModule.forRootAsync` leyendo `DATABASE_URL`.
- `env.validation.ts` con `class-validator` validando variables obligatorias al boot.
- Migración inicial vacía de prueba (crear y dropear una tabla dummy) para confirmar el pipeline de migraciones.
**Tests**: `docker compose up -d postgres` levanta la base local. `npm run migration:run` y `npm run migration:revert` corren limpio contra la base local de desarrollo. La app bootea sin errores de conexión.

### Etapa 0.4 — Verificación local end-to-end del esqueleto
**Objetivo**: confirmar que base, backend y frontend funcionan juntos localmente antes de avanzar a modelo de datos.
**Tareas**:
- Levantar PostgreSQL local con Docker Compose.
- Levantar backend en `localhost:3001`.
- Levantar frontend en `localhost:3000`.
- Confirmar CORS local y `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`.
**Tests**: smoke test local documentado: frontend carga, backend responde endpoint health/default y backend conecta a la base local.

---

## FASE 1 — Modelo de datos completo

### Etapa 1.1 — Enums y tablas de catálogo (stages, size_curves, fabrics, supplies)
**Tareas**: migraciones para `stages`, `size_curves`, `size_curve_values`, `fabrics`, `supplies` + sus enums. Seeds de `stages` (las 10 etapas del PRD §3.3, con `sequence_order`, `is_optional`, `execution_type`, `excluded_from_bottleneck_alerts`) y de al menos 2 `size_curves` de ejemplo (una alfabética, una numérica).
**Tests**: migración corre limpio desde cero. Seed corre y deja las 10 filas de `stages` esperadas (test de integración simple que cuenta filas y verifica que "CONFECCION" tenga `excluded_from_bottleneck_alerts = true`).

### Etapa 1.2 — Usuarios, clientes, talleres
**Tareas**: migraciones + entidades TypeORM de `users`, `clients`, `workshops`. Seed de 1 usuario Admin inicial (password desde variable de entorno, no hardcodeada).
**Tests**: migración limpia. Seed crea el admin y se puede loguear (test manual vía Swagger, documentado en el reporte de la etapa).

### Etapa 1.3 — Artículos (con telas y partes de decoración)
**Tareas**: migraciones + entidades de `articles`, `article_fabrics`, `article_decoration_parts`.
**Tests**: migración limpia. Test unitario de la entidad: crear un artículo con 2 telas (principal + secundaria) y 1 parte decorada, y leerlo de vuelta con sus relaciones cargadas.

### Etapa 1.4 — Órdenes y partes (el corazón del sistema)
**Tareas**: migraciones + entidades de `orders`, `order_requested_items`, `order_parts` (con self-reference `parent_part_id`), `part_stage_events`, `part_supplies`.
**Tests**: migración limpia. Test unitario: crear una orden con 1 `order_requested_item`, verificar que se puede crear una `order_part` raíz asociada, que se puede crear una `order_part` hija apuntando a la raíz vía `parent_part_id`, y que los campos `split_mode`, `is_component_branch`, `status=REINTEGRADA` y `recombined_into_part_id` funcionan correctamente en TypeORM.

### Etapa 1.5 — Notificaciones y configuración
**Tareas**: migraciones + entidades de `notifications`, `system_settings`. Seed de `bottleneck_threshold_days = 3`.
**Tests**: migración limpia. Test que lee el setting sembrado y confirma el valor.

**Cierre de Fase 1**: correr `migration:run` desde una base completamente vacía y confirmar que las 5 etapas anteriores en conjunto arman el esquema completo del PRD §3.3 sin errores de FK ni de orden de dependencias.

---

## FASE 2 — Autenticación y autorización

### Etapa 2.1 — Login y JWT
**Tareas**: `AuthModule`, `AuthService.login()` (bcrypt compare + firma JWT), `JwtStrategy`, endpoint `POST /auth/login`, endpoint `GET /auth/me`.
**Tests**: test e2e — login con credenciales correctas devuelve token válido; login con credenciales incorrectas devuelve 401; `GET /auth/me` sin token devuelve 401, con token devuelve el usuario correcto.

### Etapa 2.2 — Guards de roles y de sector
**Tareas**: `JwtAuthGuard` global, `RolesGuard` + decorator `@Roles()`, `SectorOwnershipGuard` custom (compara `user.stageId` contra un recurso).
**Tests**: unit tests de cada guard con mocks de `ExecutionContext` — Admin siempre pasa, User de sector correcto pasa, User de sector incorrecto es rechazado con 403.

---

## FASE 3 — Módulos ABM (CRUD simples)

> Cada uno de estos módulos sigue el mismo patrón; se listan como sub-etapas cortas para poder testear cada uno de forma aislada.

### Etapa 3.1 — Clientes (backend)
**Tests**: e2e CRUD completo (crear, listar con filtro `search`, editar, soft-delete) + verificación de que `POST/PATCH/DELETE` requieren rol Admin (403 para User).

### Etapa 3.2 — Talleres externos (backend)
**Tests**: idem 3.1, más verificación de que el campo `specialties` (array de `sector_code`) se guarda y filtra correctamente (`GET /workshops?specialty=CONFECCION`).

### Etapa 3.3 — Telas, Avíos, Curvas de talles (backend)
**Tests**: e2e CRUD de cada uno. Test específico: crear una curva de talles tipo `DOBLE` con valores "30/32", "34/36" y verificar el `sort_order`.

### Etapa 3.4 — Artículos (backend)
**Tests**: e2e de creación de artículo con telas y partes de decoración anidadas en el mismo request (verificar que el DTO anidado con `class-validator` + `class-transformer` valida bien).

### Etapa 3.5 — Usuarios (backend)
**Tests**: e2e CRUD. Test específico: crear un usuario con `role=USER` sin `stageId` debe fallar con 400 (regla: obligatorio si es USER). Password nunca debe aparecer en la respuesta JSON.

### Etapa 3.6 — Frontend: pantallas ABM
**Tareas**: pantallas de listado + alta/edición para Clientes, Talleres, Artículos, Usuarios, usando componentes `ui/` (Table, Modal, Input, Select, Button) y `lib/api/*.api.ts`.
**Tests**: por cada pantalla, prueba manual documentada (captura o descripción) de: listar, crear, editar, error de validación visible en formulario. No se exige testing automatizado de UI en el MVP salvo que el usuario lo pida explícitamente.

**Cierre de Fase 3**: Admin puede loguearse y gestionar completamente los 4 maestros desde el navegador.

---

## FASE 4 — Creación de órdenes y partes

### Etapa 4.1 — Backend: crear orden
**Tareas**: `OrdersService.create()` — recibe cliente, artículo, lista de `order_requested_items` (talle/color/tela/cantidad), genera `internal_code` autoincremental (`OC-2026-000123`), crea la `order_part` raíz automáticamente con `quantity` = suma de lo pedido.
**Tests**: e2e — crear orden válida devuelve 201 con `internal_code` generado y 1 `order_part` raíz asociada. Crear orden con `external_code` duplicado devuelve 409 (constraint único).

### Etapa 4.2 — Backend: consulta de árbol de partes
**Tareas**: `GET /orders/:id` devuelve la orden con su árbol completo de `order_parts` (recursivo o con query plana + armado en memoria — documentar cuál se eligió y por qué). `GET /orders/:orderId/parts?stageId=` filtra por etapa actual.
**Tests**: test de integración con una orden que tiene 1 parte raíz + 2 hijas + 1 nieta (3 niveles), verificar que la respuesta arma el árbol correctamente.

### Etapa 4.3 — Backend: dividir una parte (split)
**Tareas**: `OrderPartsService.split()` con toda la validación de PRD §3.4 reglas 2 y 3: `LOTE` conserva cantidades, `COMPONENTE` permite ramas paralelas por partes decorativas y exige reunificación antes de Confección.
**Tests**: unit tests exhaustivos —
- split `LOTE` válido (2 hijas que suman exactamente la cantidad del padre) → OK.
- split `LOTE` inválido (suma supera la cantidad del padre) → 400.
- split `COMPONENTE` válido (ej: mangas a bordar + frente a estampar + resto en espera, todas con la quantity del padre) → OK.
- split `COMPONENTE` sin `splitReason` descriptivo por rama → 400.
- split `COMPONENTE` intentado en una etapa posterior a Bordado/Estampado/espera previa a Confección → 400.
- split con 1 sola sub-parte → 400 (mínimo 2, si no no es división).
- después del split, la parte padre tiene `is_split=true` y `current_stage_id=null`.
- se puede volver a dividir una parte hija (split de segundo nivel).

### Etapa 4.3.1 — Backend: reunificar componentes
**Tareas**: `OrderPartsService.recombine()` — recibe ramas `COMPONENTE` compatibles, las marca `REINTEGRADA`, setea `recombined_into_part_id` y crea una nueva `order_part` activa que representa la prenda completa antes de Confección.
**Tests**: unit tests —
- reunificar ramas `COMPONENTE` del mismo padre y misma orden → OK, crea nueva parte con quantity correcta.
- intentar reunificar ramas de padres distintos → 400.
- intentar iniciar Confección sobre rama `COMPONENTE` no reunificada → 400.
- ramas reunificadas no aparecen como hojas activas del Kanban ni cuentan para finalización de orden.

### Etapa 4.4 — Frontend: crear orden
**Tareas**: formulario `OrderForm` — selección de cliente, artículo (precarga telas/partes decoradas sugeridas del artículo si existen), agregar N `order_requested_items` con talle (según curva del artículo)/color/cantidad.
**Tests**: prueba manual documentada de creación de una orden con al menos 2 talles distintos y verificación de que aparece en el listado con su `internal_code`.

### Etapa 4.5 — Frontend: detalle de orden con árbol de partes
**Tareas**: `PartTree` — visualización del árbol (componente recursivo), `StageSelector` para filtrar qué etapa se muestra expandida.
**Tests**: prueba manual con una orden que tenga partes divididas en al menos 2 niveles, confirmando que el árbol se ve correctamente y el selector de etapa filtra bien.

### Etapa 4.6 — Frontend: dividir parte y reunificar componentes
**Tareas**: `PartSplitModal` — formulario para ingresar N sub-partes, elegir `LOTE` o `COMPONENTE`, validar suma en cliente solo para `LOTE`, exigir descripción de componente para `COMPONENTE`, y acción de reunificación cuando las ramas componentes estén listas.
**Tests**: prueba manual — intentar dividir de más en modo `LOTE` debe mostrar error antes de llamar al backend; división `COMPONENTE` con mangas/bordado/resto permite quantities repetidas; reunificar refresca el árbol y habilita Confección sobre la parte reunificada.

---

## FASE 5 — Motor de etapas (iniciar/finalizar)

### Etapa 5.1 — Backend: iniciar etapa
**Tareas**: `StageEventsService.start()` con validaciones de PRD §3.4 regla 1 (no permitir 2 eventos activos), regla 3 (no iniciar Confección sobre componentes no reunificados) y regla 4 (EXTERNO requiere workshopId).
**Tests**: unit tests —
- iniciar etapa en parte sin evento activo → OK, `part.status` pasa a `EN_PROCESO`, `part.currentStageId` se actualiza.
- iniciar etapa en parte que ya tiene evento activo → 409.
- iniciar etapa EXTERNO sin `workshopId` → 400.
- iniciar etapa EXTERNO con `workshopId` válido → OK, se guarda la referencia al taller.
- iniciar CONFECCION sobre una rama `COMPONENTE` no reunificada → 400.
- usuario de sector distinto al de la etapa intenta iniciar → 403 (salvo Admin).

### Etapa 5.2 — Backend: finalizar etapa
**Tareas**: `StageEventsService.finish()` — cierra el evento activo (`finished_at`), recalcula `part.status` (si era la última etapa del flujo → `FINALIZADA`; si no → `PENDIENTE` esperando el próximo `start`). Dispara verificación de finalización de la orden completa (PRD §3.4 regla 8). Implementa el caso especial de Atraque incluido en Confección externa (PRD §3.4 regla 10).
**Tests**: unit tests —
- finalizar evento activo → OK, `duration_days` se calcula (columna generada, verificar que el valor leído es coherente).
- finalizar sin evento activo → 409.
- finalizar la etapa Terminación de la única parte de una orden → la orden pasa a `FINALIZADA` y se genera 1 notificación `FINALIZACION_ORDEN` por cada Admin.
- finalizar Terminación de una parte cuando otras partes hermanas siguen activas → la orden **no** se finaliza todavía.
- **finalizar CONFECCION con `execution_type=EXTERNO` y `includesAtraque=true`** → se auto-genera un `part_stage_event` de ATRAQUE ya cerrado (`started_at=finished_at`) para la misma parte, y la parte queda lista para avanzar a la siguiente etapa aplicable sin pasar por acción manual del sector Atraque.
- finalizar CONFECCION con `execution_type=EXTERNO` y `includesAtraque=false` (o `INTERNO`) → **no** se genera evento de Atraque automático; si el artículo requiere Atraque, la parte queda pendiente en esa etapa esperando `start` manual del sector.
- intentar iniciar una etapa ATRAQUE con `execution_type=EXTERNO` o con `workshopId` seteado → 400 (Atraque nunca admite taller propio).

### Etapa 5.3 — Backend: checklist de avíos
**Tareas**: `PATCH /order-parts/:id/supplies/:supplyId`.
**Tests**: e2e — actualizar completeness de un avío, verificar que queda registrado `updated_by` y `updated_at`. Confirmar que un usuario que no es de sector Avíos (ni Admin) recibe 403.

### Etapa 5.4 — Backend: estado de "Arreglo"
**Tareas**: `POST /orders/:id/repair` y `/repair/resolve`.
**Tests**: e2e — marcar en arreglo cambia `status` y genera notificación a Admins; resolver vuelve a `ACTIVA`; intentar resolver una orden que no está en arreglo devuelve error claro.

### Etapa 5.5 — Frontend: panel de acción de etapa
**Tareas**: `StageActionPanel` — botón iniciar/finalizar según estado actual de la parte, selector interno/externo + taller, campo de fecha estimada opcional, campo de nota.
**Tests**: prueba manual del ciclo completo: iniciar etapa interna, finalizar; iniciar etapa externa con taller, finalizar; verificar que el panel refleja correctamente el estado tras cada acción.

### Etapa 5.6 — Frontend: checklist de avíos y estado de Arreglo
**Tareas**: `SupplyChecklist` component; botón/modal de marcar y resolver Arreglo visible según rol.
**Tests**: prueba manual documentada de ambos flujos.

**Cierre de Fase 5**: se puede llevar una orden de punta a punta (crear → cortar → dividir → bordar una parte → confeccionar interno una parte y externo otra → terminación) completamente desde el navegador, con los datos reflejándose correctamente en la base.

---

## FASE 6 — Notificaciones

### Etapa 6.1 — Backend: servicio y endpoints de notificaciones
**Tareas**: `NotificationsService.create()`, `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`.
**Tests**: e2e — un usuario solo ve sus propias notificaciones (nunca las de otro); marcar como leída persiste correctamente.

### Etapa 6.2 — Backend: cron de cuellos de botella
**Tareas**: `SchedulerService` con `@Cron` diario, lógica de PRD §7.3, respetando `excluded_from_bottleneck_alerts` y el umbral de `system_settings`.
**Tests**: unit test del método de detección (sin depender del cron real) — dado un set de `order_parts` con eventos activos de distinta antigüedad, confirmar que solo se notifican los que superan el umbral y que Confección nunca se notifica aunque supere el umbral.

### Etapa 6.3 — Backend: cron de fechas estimadas incumplidas
**Tareas**: lógica de PRD §7.4.
**Tests**: unit test — evento con `estimated_finish_at` vencida y `overdue_notified=false` genera notificación y marca el flag; correr el chequeo una segunda vez no debe duplicar la notificación.

### Etapa 6.4 — Backend: WebSocket gateway
**Tareas**: `NotificationsGateway` — emite `new_notification` al usuario correspondiente en tiempo real.
**Tests**: test de integración simple con un cliente WS de prueba conectándose con JWT válido y recibiendo el evento al crear una notificación.

### Etapa 6.5 — Frontend: campanita de notificaciones
**Tareas**: `NotificationBell` (conteo de no leídas + listado desplegable) + pantalla completa `/notificaciones`, conexión WS para tiempo real.
**Tests**: prueba manual — generar una notificación desde el backend (ej: forzando un cuello de botella con un evento viejo en la base de test) y confirmar que aparece en tiempo real sin recargar.

---

## FASE 7 — Dashboard

### Etapa 7.1 — Backend: endpoint Kanban
**Tareas**: `GET /dashboard/kanban` — agrupa `order_parts` activas por `current_stage_id`.
**Tests**: test de integración con datos de prueba en varias etapas, confirmar agrupación correcta y que partes `is_split=true` o `status=REINTEGRADA` no aparecen (ya no están "activas" por sí mismas).

### Etapa 7.2 — Backend: endpoint de resumen
**Tareas**: `GET /dashboard/summary` — cuenta de órdenes activas, en arreglo, cuellos de botella actuales, incumplimientos actuales.
**Tests**: test de integración con datos de prueba verificando cada contador.

### Etapa 7.3 — Frontend: vista Kanban
**Tareas**: `KanbanBoard` + `KanbanColumn` (una columna por etapa, tarjetas `OrderCard`).
**Tests**: prueba manual — confirmar que mover una parte de etapa (desde el detalle de orden) actualiza el Kanban al recargar/refrescar.

### Etapa 7.4 — Frontend: vista lista/tabla filtrable
**Tareas**: tabla de órdenes con filtros por estado, cliente, etapa, búsqueda por código.
**Tests**: prueba manual de cada filtro combinado.

**Cierre de Fase 7**: Gerencia/Producción tiene visibilidad completa del estado de todas las órdenes activas desde ambas vistas.

---

## FASE 8 — Endurecimiento (hardening) y cierre de MVP

### Etapa 8.1 — Revisión de permisos end-to-end
**Tareas**: recorrer cada endpoint del PRD §6 y confirmar que su guard coincide exactamente con la tabla de permisos documentada.
**Tests**: matriz de tests e2e — por cada endpoint sensible, 1 test con rol correcto (pasa) y 1 test con rol incorrecto (403).

### Etapa 8.2 — Manejo de errores y casos edge
**Tareas**: implementar todos los casos de la tabla del PRD §7.5 que no hayan quedado cubiertos en fases anteriores.
**Tests**: 1 test por cada fila de esa tabla.

### Etapa 8.3 — Seeds de datos de demostración
**Tareas**: script de seed con datos ficticios completos (clientes, talleres, artículos, 5-10 órdenes en distintos estados de avance) para que el cliente pueda probar el sistema sin cargar todo a mano.
**Tests**: el seed corre limpio sobre una base vacía tras `migration:run`.

### Etapa 8.4 — Verificación del VPS y deploy a producción
**Tareas**: verificar recursos del VPS Hostinger KVM2 (`free -h`, `df -h`, `docker stats --no-stream`), documentar contenedores existentes (n8n, Postgres, app de consultas), decidir si usar la misma instancia de Postgres con una base nueva o un contenedor nuevo, preparar Dockerfiles finales, configuración en Dokploy, migraciones corridas en el VPS, verificación de backup automático.
**Tests**: checklist manual de PRD §10 (sección Deployment) completo, con evidencia de cada ítem tildado. Smoke test post-deploy: login real + crear una orden real + avanzar una etapa, todo contra la URL de producción.

---

## Resumen de dependencias entre fases

```
Fase 0 (setup) → Fase 1 (modelo de datos) → Fase 2 (auth)
                                            → Fase 3 (ABM) ─┐
                                                             ├→ Fase 4 (órdenes/partes) → Fase 5 (motor de etapas)
                                                             ┘                                      ↓
                                            Fase 6 (notificaciones) ←───────────────────────────────┘
                                                             ↓
                                            Fase 7 (dashboard)
                                                             ↓
                                            Fase 8 (hardening y deploy)
```

No se puede empezar Fase 4 sin Fase 3 (necesita clientes/artículos ya cargables). No se puede empezar Fase 6 sin Fase 5 (las notificaciones dependen de eventos de etapa reales). Fase 7 puede arrancar en paralelo a Fase 6 si hay dos desarrolladores, pero ambas requieren Fase 5 cerrada.
