# AGENTS.md — Reglas Operativas para el Agente de Desarrollo

> Este archivo define cómo debe comportarse cualquier agente (Claude Code u otro) que trabaje en este repositorio. Es de lectura obligatoria antes de tocar código. Ante cualquier conflicto entre este archivo y una instrucción puntual del usuario, **se debe señalar el conflicto explícitamente antes de proceder**, no resolverlo en silencio.

## 0. Documentos de referencia obligatoria

Antes de empezar **cualquier tarea solicitada por el usuario**, incluso tareas chicas o urgentes, el agente debe leer este `AGENTS.md` completo en la sesión actual. No alcanza con recordarlo de contexto previo ni con haberlo leído en otra sesión. Si por cualquier motivo no puede leerlo, debe detenerse y reportarlo antes de tocar archivos o ejecutar cambios.

Antes de implementar cualquier funcionalidad, el agente debe haber leído:
1. `01-Vision-Proyecto.md` — contexto de negocio.
2. `02-PRD.md` — fuente de verdad técnica (modelo de datos, endpoints, reglas de negocio).
3. `04-Plan-Implementacion.md` — en qué etapa está el proyecto y qué corresponde hacer ahora.

Si una tarea pedida no está cubierta por el PRD o lo contradice, **el agente debe detenerse y preguntar** antes de inventar una solución. No asumir reglas de negocio no documentadas.

## 1. Alcance de trabajo (no hacer scope creep)

- No implementar nada de la sección "NO incluye" del PRD (§1.5) salvo pedido explícito y confirmado del usuario.
- No adelantar funcionalidad de "Visión a futuro" (QR, stock, notificaciones por Telegram, maestro de artículo con avíos preconfigurados) salvo pedido explícito.
- Si una etapa del plan de implementación depende de una decisión no tomada (marcada como supuesto en el PRD §1.6), el agente debe señalarlo antes de codear esa parte, no elegir por su cuenta sin avisar.

## 1.1 Git y ramas de trabajo

- Antes de implementar una nueva etapa del plan o cualquier funcionalidad no documentada, el agente debe crear una rama nueva desde `develop`, sin importar en qué rama esté parado al recibir el pedido.
- El trabajo de esa etapa/funcionalidad se hace únicamente en esa rama hasta verificar que la etapa finalizó correctamente y que pasan los tests definidos.
- Recién después de esa verificación se puede abrir PR o mergear hacia `develop`.
- Si existen cambios locales sin commitear antes de cambiar de rama, el agente debe informarlo y preservarlos; nunca debe descartarlos ni mezclarlos silenciosamente con la nueva etapa.

## 2. Stack tecnológico — reglas duras

| Regla | Detalle |
|---|---|
| Desarrollo local | El proyecto debe funcionar localmente completo: PostgreSQL en Docker Compose, backend NestJS en `localhost:3001` y frontend Next.js en `localhost:3000`. Los cambios se suben a GitHub por etapas cerradas. |
| Repositorio | Se usa monorepo con `backend/`, `frontend/` y `docs/` en una misma raíz, salvo decisión explícita posterior del usuario. |
| Package manager | Usar `pnpm` para instalar dependencias, correr scripts y generar lockfiles. Prohibido usar `npm install` o commitear `package-lock.json`. |
| Frontend | Next.js (App Router) + TypeScript + CSS Modules. **Prohibido** usar Tailwind, Bootstrap, Material UI, styled-components, o cualquier librería de componentes UI. |
| Backend | NestJS + TypeScript + TypeORM + PostgreSQL. |
| Estilos | Cada componente React tiene su propio `.module.css` en la misma carpeta. Nunca estilos inline (`style={{}}`) salvo casos dinámicos imposibles de resolver por clase (documentar por qué si se usa). |
| TypeScript | `strict: true` en ambos proyectos. Prohibido `any` salvo justificación explícita en comentario. Prohibido `@ts-ignore` sin comentario explicando la razón. |
| Base de datos | Todo cambio de esquema se hace vía **migración de TypeORM**. Prohibido `synchronize: true` en cualquier ambiente que no sea un test local descartable. Prohibido ejecutar `ALTER TABLE` manual en producción. |
| Validación | Todo DTO de entrada usa `class-validator`. Prohibido confiar en el tipo de TypeScript como única validación (TS se borra en runtime). |

## 3. Modelo de datos — invariantes que nunca se rompen

Estas reglas vienen del PRD §3.4 y son las más fáciles de romper por error. El agente debe verificarlas explícitamente en cualquier código que toque `order_parts` o `part_stage_events`:

1. Una `order_part` **nunca** tiene dos `part_stage_events` abiertos (`finished_at IS NULL`) simultáneamente. Validar en servicio antes de cualquier `INSERT` a `part_stage_events`.
2. Al dividir una parte (`split`) hay dos modos válidos:
   - `LOTE`: separación por cantidades de prendas/lotes. La suma de `quantity` de las sub-partes nuevas **no puede superar** la `quantity` de la parte padre.
   - `COMPONENTE`: separación temporal por partes físicas de la prenda antes de Confección (ej: mangas a bordar, piezas a estampar, resto en espera). En este modo la cantidad puede duplicarse o triplicarse porque cada rama representa componentes distintos de las mismas prendas, no prendas adicionales. Solo se permite para Bordado, Estampado y partes en espera vinculadas a esas decoraciones, y debe reunificarse antes de iniciar Confección.
3. Al dividir una parte, la parte padre pasa a `is_split = true` y `current_stage_id = NULL`. **Nunca** se borra la parte padre — queda como nodo histórico del árbol.
4. Toda división `COMPONENTE` debe reunificarse antes de iniciar Confección. Las ramas reunificadas pasan a `REINTEGRADA`, apuntan a `recombined_into_part_id` y no cuentan como hojas activas, Kanban ni finalización de orden.
5. `execution_type = 'EXTERNO'` en un evento de etapa **siempre** requiere `workshop_id` no nulo. Validar en servicio con un error 400 claro si falta.
6. La etapa Confección **nunca** genera notificaciones de cuello de botella (`stages.excluded_from_bottleneck_alerts = true`). Si se agrega lógica de cuellos de botella nueva, respetar este flag, no hardcodear el nombre "Confección" en el código.
7. Un `order` pasa a `FINALIZADA` únicamente cuando **todas** sus partes hoja activas llegaron a Terminación finalizada. Excluir partes `DIVIDIDA`, `REINTEGRADA` y ramas `COMPONENTE` ya reunificadas. Esta lógica vive en el servicio de `StageEvents`, no en un trigger de base de datos (mantener la lógica de negocio en la capa de aplicación, no en SQL).
8. **Atraque nunca se terceriza de forma independiente.** No tiene `workshop_id` propio y su `stages.execution_type` es siempre `'INTERNO'`. Si un desarrollador (humano o agente) agrega un selector de taller a la pantalla de Atraque, está rompiendo la regla de negocio — la única forma en que Atraque se resuelve "externamente" es vía el flag `includes_atraque` al finalizar un evento de Confección EXTERNO (PRD §3.4-10), que auto-genera el evento de Atraque ya cerrado. Si se toca el servicio `StageEventsService.finish()`, verificar que esta lógica de auto-generación siga funcionando.

## 4. Permisos y seguridad

- Todo endpoint nuevo debe decidir explícitamente su nivel de acceso: público (solo `/auth/login`), cualquier usuario autenticado, solo Admin, o solo el sector dueño del recurso + Admin. No dejar un endpoint sin guard "porque después se agrega".
- Nunca loggear `password_hash`, JWT completos, ni el body de `/auth/login`.
- Nunca commitear archivos `.env` reales. Solo `.env.example` con claves vacías.
- Todo dato sensible de configuración (JWT_SECRET, DATABASE_URL) sale de variables de entorno, nunca hardcodeado.

## 5. Convenciones de código

- **Nomenclatura de archivos backend**: `kebab-case.tipo.ts` (ej: `order-parts.service.ts`, `create-order.dto.ts`), siguiendo convención estándar de NestJS.
- **Nomenclatura de componentes frontend**: `PascalCase` para el componente y su carpeta (ej: `components/ordenes/PartTree/PartTree.tsx` + `PartTree.module.css`).
- **Nombres de columnas SQL**: `snake_case`. **Nombres de propiedades TypeScript**: `camelCase` (TypeORM se encarga del mapeo vía `@Column({ name: 'snake_case' })`, siempre explícito, nunca depender del mapeo automático).
- Toda entidad TypeORM debe tener `createdAt`/`updatedAt` salvo justificación en contrario.
- Todo endpoint que liste recursos debe soportar paginación básica (`?page=&limit=`) si la tabla puede crecer sin límite (órdenes, partes, notificaciones, eventos).

## 6. Testing — no negociable

- **Ninguna etapa del plan de implementación se marca como completada sin que sus tests pasen.** Ver criterio completo en PRD §11.
- **Nunca se entrega trabajo sin verificación funcional.** Antes de informar que una tarea está terminada, el agente debe comprobar que lo que modificó funciona realmente en el entorno local correspondiente. No alcanza con que compile: si tocó frontend debe abrir o consultar la pantalla/ruta afectada y confirmar que responde sin error; si tocó backend debe llamar el endpoint o flujo afectado con datos válidos; si tocó base de datos debe consultar que los datos/migración esperados existan; si tocó integración entre capas debe verificar el flujo completo.
- Antes de dar por terminada una tarea, el agente debe correr:
  1. `pnpm run build` (o `tsc --noEmit`) en el proyecto tocado.
  2. `pnpm run test` del proyecto tocado.
  3. Si la tarea tocó un endpoint, `pnpm run test:e2e` del backend si existe test e2e relacionado.
- Si la verificación funcional no puede ejecutarse por una causa externa o de entorno, el agente **no puede decir que está terminado como si estuviera probado**. Debe reportar explícitamente qué no pudo verificar, por qué, y cuál es el riesgo.
- Si un test falla, el agente **arregla el código o el test según corresponda** — nunca comenta o borra un test para que "pase" sin resolver la causa real, salvo que el test esté objetivamente mal escrito (y en ese caso lo explicita en la respuesta).
- En frontend, la verificación funcional debe hacerse sobre el **estado real que va a usar el usuario**. Si el usuario está trabajando en `localhost:3000`, no alcanza con levantar otro puerto alternativo salvo que se reporte explícitamente como verificación secundaria. Antes de cerrar una tarea frontend, el agente debe confirmar qué proceso escucha en `3000`, que las rutas afectadas responden `200` en ese puerto, y que la pantalla no muestra overlay de error.
- No correr `next build` mientras hay un `next dev` activo usando el mismo `.next` del proyecto. Si se necesita build y también hay que dejar el entorno local usable, detener/reiniciar el dev server después del build y volver a verificar `localhost:3000`.
- Toda nueva regla de negocio de la sección 3 de este documento (invariantes del modelo de datos) debe tener al menos un test unitario que la cubra.

## 7. Migraciones

- Nombrar migraciones de forma descriptiva: `<timestamp>-CreateOrdersTable.ts`, `<timestamp>-AddSplitReasonToOrderParts.ts`, nunca `<timestamp>-update.ts`.
- Toda migración debe tener `up()` y `down()` funcionales — probar `migration:revert` antes de dar la migración por terminada.
- No modificar una migración ya aplicada en un ambiente compartido (dev/staging/prod). Si hay que corregir algo, se crea una migración nueva.

## 8. Comunicación con el usuario / reporte de avance

- Al completar una etapa del plan de implementación, el agente debe reportar: qué se hizo, qué archivos se tocaron, qué tests se corrieron y su resultado, y qué queda pendiente para la siguiente etapa.
- Si el agente detecta que una etapa del plan es más grande de lo estimado o depende de algo no resuelto, lo dice explícitamente en vez de improvisar una solución parcial sin avisar.
- Ante ambigüedad de negocio no cubierta por el PRD, el agente pregunta antes de asumir — especialmente en todo lo relacionado a: qué pasa cuando una etapa se recibe parcial, quién puede forzar cambios de estado, y qué constituye "cuello de botella" o "incumplimiento" en casos límite.

## 9. Gestión de dependencias

- No agregar una librería nueva (frontend o backend) sin que esté justificada por una necesidad real del PRD. En particular: no agregar librerías de UI/CSS (prohibido por regla de stack), no agregar ORMs alternativos a TypeORM, no agregar clientes HTTP alternativos a `fetch` nativo sin justificar.
- Toda librería agregada debe fijarse con versión exacta o rango controlado en `package.json` (evitar `*` o rangos demasiado abiertos).

## 10. Deployment

- Nunca correr migraciones automáticamente al bootear la app en producción (riesgo de condición de carrera con múltiples instancias). Las migraciones son un paso explícito y separado del deploy.
- Antes de cualquier cambio que afecte producción (nueva migración, cambio de variable de entorno), verificar que existe un backup reciente de la base de datos.
- Respetar la infraestructura existente del VPS (Dokploy, Postgres compartido con otras apps) — no proponer reemplazar la infraestructura sin que el usuario lo pida.
