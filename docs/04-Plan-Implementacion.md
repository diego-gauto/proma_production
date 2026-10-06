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
**Tests**: `pnpm run build` corre sin errores en ambos proyectos. Backend levanta en `localhost:3001` con el endpoint default de Nest. Frontend levanta en `localhost:3000` con la página default de Next.

### Etapa 0.3 — Conexión a base de datos y primera migración
**Objetivo**: backend conectado a Postgres, con TypeORM configurado y la primera migración corriendo.
**Tareas**:
- Agregar `docker-compose.yml` local con PostgreSQL 16 y variables de desarrollo.
- Configurar `TypeOrmModule.forRootAsync` leyendo `DATABASE_URL`.
- `env.validation.ts` con `class-validator` validando variables obligatorias al boot.
- Migración inicial vacía de prueba (crear y dropear una tabla dummy) para confirmar el pipeline de migraciones.
**Tests**: `docker compose up -d postgres` levanta la base local en `localhost:55432`. `pnpm run migration:run` y `pnpm run migration:revert` corren limpio contra la base local de desarrollo. La app bootea sin errores de conexión.

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

### Etapa 1.3 — Artículos (modelo histórico; corregido por PRD v1.1)
**Tareas originales**: migraciones + entidades iniciales de artículos.
**Nota de corrección**: PRD v1.1 redefine el artículo como producto a cortar con avíos requeridos y partes bordables/estampables. El artículo ya no se asocia a telas ni curvas; esa asociación corresponde a la Orden de Corte. La rectificación real se ejecuta en Fase 3.0.
**Tests históricos**: quedan reemplazados por los tests de Fase 3.0 y 3.6.

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

## FASE 3 — Rectificación y ABM de maestros reales

> Esta fase reemplaza el diseño anterior de maestros. A partir de PRD v1.1, el artículo **no** contiene tela ni curva. La Orden de Corte es la asociación entre cliente, artículo, tela, curva de talles, cantidades por talle y taller/ubicación cuando aplique. Ninguna etapa posterior puede avanzar sobre el modelo viejo.

### Etapa 3.0 — Rectificación documental y migración de modelo de maestros
**Objetivo**: alinear base, entidades y DTO con PRD v1.1 antes de seguir construyendo flujos.
**Tareas**:
- Crear migración nueva que adapte los maestros existentes sin editar migraciones ya aplicadas.
- Agregar tablas `client_contacts`, `workshop_contacts`, `article_supplies`, `user_permissions`.
- Ajustar `clients`: `business_name`, `tax_id`, dirección, localidad, partido, provincia.
- Ajustar `workshops`: dirección completa y contactos, sin CUIT/CUIL.
- Ajustar `fabrics`: código/artículo, descripción/nombre, color, onzaje, tipo `PUNTO/PLANO`, formato `ABIERTO/TUBULAR`. No incluye proveedor embebido.
- Ajustar `supplies`: código/artículo, descripción/nombre, color, categoría `CONFECCION/TERMINACION`. No incluye proveedor embebido.
- Ajustar `size_curves`: soportar `ALFABETICA`, `NUMERICA`, `DOBLE`, `MIXTA`.
- Ajustar `articles`: código/artículo, nombre, descripción, avíos asociados y partes bordado/estampado. Eliminar asociación conceptual con telas/curvas.
- Ajustar `users`: roles base + permisos personalizados por sector/acción.
**Tests / cierre**:
- `migration:run` desde base vacía y desde base con esquema anterior de etapa 3.
- `migration:revert` de la migración nueva.
- Test de integración que confirme que un artículo puede existir con avíos y partes decoradas, pero sin tela ni curva.

### Etapa 3.1 — Clientes (backend)
**Tareas**:
- CRUD de clientes con razón social, CUIT/CUIL, dirección, localidad, partido, provincia, notas y `contacts[]`.
- Cada contacto contiene nombre, email, teléfono fijo, celular 1, celular 2, rol/nota e indicador principal.
- Listado paginado con búsqueda por razón social, CUIT/CUIL, localidad y contacto.
- La baja es lógica mediante `deleted_at`; los listados excluyen registros con `deleted_at` y la reactivación limpia esa fecha.
**Tests**:
- e2e CRUD completo: crear con 2 contactos, listar con `search`, obtener detalle, editar dirección/contactos, soft-delete.
- Validar que razón social y CUIT/CUIL son obligatorios.
- Verificar permisos: usuario sin permiso de maestro recibe 403 en POST/PATCH/DELETE.

### Etapa 3.2 — Talleres externos (backend)
**Tareas**:
- CRUD de talleres con nombre, dirección, localidad, partido, provincia, especialidades, notas y `contacts[]`.
- Sin CUIT/CUIL.
- Especialidades filtrables por sector: Confección, Ojal y Botón, Plancha, etc.
**Tests**:
- e2e CRUD completo con múltiples contactos y celulares.
- `GET /workshops?specialty=CONFECCION` filtra correctamente.
- Validar que no exista campo CUIT/CUIL en DTO ni respuesta.
- Verificar permisos Admin/permisos personalizados.

### Etapa 3.3 — Telas (backend)
**Tareas**:
- CRUD de telas con código/artículo, descripción/nombre, color, onzaje, tipo de tejido `PUNTO/PLANO`, formato `ABIERTO/TUBULAR`.
- Listado paginado con filtros por tipo y formato.
- No guardar proveedor en la tela; los proveedores se vinculan al ingresar stock.
**Tests**:
- e2e CRUD completo.
- Validar enums de tipo/formato.
- Crear tela de punto tubular y tela plana abierta; verificar filtros.

### Etapa 3.4 — Avíos (backend)
**Tareas**:
- CRUD de avíos con código/artículo, descripción/nombre, color, categoría `CONFECCION/TERMINACION`.
- Listado paginado con filtros por categoría.
- No guardar proveedor en el avío; los proveedores se vinculan al ingresar stock.
**Tests**:
- e2e CRUD completo.
- Validar categoría obligatoria.
- Confirmar filtro `?category=CONFECCION` y `?category=TERMINACION`.

### Etapa 3.5 — Curvas de talles (backend)
**Tareas**:
- CRUD de curvas con secuencias `ALFABETICA`, `NUMERICA`, `DOBLE`, `MIXTA`.
- Cada valor tiene `label` y `sortOrder`.
- Edición reemplaza valores sin duplicados ni errores de constraint.
**Tests**:
- e2e CRUD completo.
- Crear curva alfabética (`S`, `M`, `L`), numérica (`38`, `40`, `42`), doble (`30/32`, `34/36`) y mixta (`S`, `M`, `Especial`).
- Verificar orden por `sortOrder`.

### Etapa 3.6 — Artículos / productos a cortar (backend)
**Tareas**:
- CRUD de artículos con código/artículo, nombre, descripción.
- Asociar lista de avíos que lleva el producto (`article_supplies`) con cantidad/nota opcional.
- Asociar partes que pueden bordarse o estamparse (`article_decoration_parts`).
- No asociar telas ni curvas al artículo.
**Tests**:
- e2e CRUD completo.
- Crear artículo con 3 avíos, 1 parte bordable y 1 parte estampable.
- Verificar que el DTO rechaza `fabricId`, `fabrics`, `sizeCurveId` o cualquier intento de asociar tela/curva al artículo.

### Etapa 3.7 — Usuarios, roles y permisos personalizados (backend)
**Tareas**:
- CRUD de usuarios con nombre, email, contraseña y rol base.
- Agregar permisos personalizados por sector y acción (`VER`, `CREAR`, `EDITAR`, `ELIMINAR`, `INICIAR_ETAPA`, `FINALIZAR_ETAPA`, `FORZAR_CAMBIO`, `ADMINISTRAR`).
- Resolver permisos efectivos combinando rol base + permisos personalizados.
- Preparar helpers/guards para permisos por maestro, sector y acción.
**Tests**:
- e2e CRUD completo.
- Password nunca aparece en JSON.
- Usuario Bordado con permiso `VER/INICIAR_ETAPA/FINALIZAR_ETAPA` solo para `BORDADO` no puede operar Corte ni Avíos.
- Usuario Producción/Gerencia con permisos globales puede ver todo.

### Etapa 3.8 — Frontend: formularios ABM compactos y coherentes
**Tareas**:
- Rediseñar formularios ABM para Clientes, Talleres, Telas, Avíos, Curvas, Artículos y Usuarios/Permisos.
- Mantener estilo visual Promatex/Proma ya usado, sin inventar paleta ni patrón visual nuevo.
- Formularios compactos: evitar scroll vertical cuando sea razonable en 1366x768; usar grid denso, secciones claras, tabla inline para contactos/avíos/permisos.
- Clientes/Talleres: edición de múltiples contactos en la misma pantalla.
- Artículos: edición de avíos requeridos y partes bordado/estampado en la misma pantalla.
- Usuarios: matriz de permisos por sector/acción en formato compacto.
**Tests / verificación**:
- Browser real: listar, crear, editar y ver error de validación visible en cada ABM.
- Captura o reporte de verificación para 1366x768: sin runtime errors, sin campos cortados, sin scroll innecesario dentro del formulario principal.
- `pnpm --dir frontend run build` y `pnpm --dir frontend run test`.


### Etapa 3.9 — Proveedores e ingresos básicos de stock
**Tareas**:
- CRUD de proveedores con razón social, CUIT/CUIL opcional, dirección completa, notas y contactos.
- Crear ingresos de tela asociados a proveedor y tela. Cada ingreso contiene fecha, comprobante opcional, nota y uno o más rollos.
- Cada rollo de tela guarda `code` y `lot`; el stock de tela se calcula como sumatoria de rollos.
- Crear ingresos de avíos asociados a proveedor y avío, con fecha, comprobante opcional y cantidad.
- No incluir precio/costo en esta etapa.
- Frontend: agregar acceso desde Gestión para registrar ingresos de tela por rollos e ingresos de avíos por cantidad, usando Proveedor como dato obligatorio.
**Tests**:
- e2e: telas y avíos rechazan `supplier` en payload.
- e2e: crear proveedor, ingreso de tela con rollos y entrada de avío con cantidad.
- `migration:run` y `migration:revert` de la migración nueva.

**Cierre de Fase 3**: Admin puede loguearse y gestionar completamente Clientes, Proveedores, Talleres, Telas, Avíos, Curvas, Artículos y Usuarios/Permisos desde el navegador. Las bajas de maestros quedan como desactivaciones lógicas con `deleted_at`, no borrados físicos. Los permisos personalizados ya afectan lo que cada usuario puede ver/operar.

---

## FASE 4 — Creación de órdenes de corte y partes

### Etapa 4.1 — Backend: crear orden con asociación real
**Tareas**:
- `OrdersService.create()` recibe cliente, artículo, tela, curva de talles, cantidades por valor de curva y taller/ubicación inicial opcional.
- Genera `internal_code` autoincremental (`OC-2026-000123`).
- Crea `order_requested_items` por talle/cantidad.
- Crea la `order_part` raíz con `quantity` = suma de cantidades.
- Precarga checklist de avíos desde `article_supplies`.
- Precarga partes decorables desde `article_decoration_parts` para habilitar splits por componente cuando corresponda.
**Tests**:
- e2e: crear orden válida devuelve 201 con código generado, items por talle, parte raíz y checklist de avíos.
- Crear orden con `external_code` duplicado devuelve 409.
- Crear orden sin tela, curva o cantidades devuelve 400.
- Confirmar que tela/curva vienen de la orden, no del artículo.

### Etapa 4.2 — Frontend: listado principal de órdenes de corte
**Tareas**:
- La pantalla inicial autenticada es el listado de órdenes de corte.
- Columnas mínimas: orden de corte completa, fecha alta, cliente, producto/artículo, cantidad total, sector actual, ingreso al sector, días en sector, ubicación, estado/semaforo.
- Si una orden está dividida, mostrar fila padre como “corte dividido” y filas hijas indentadas con sufijo A/B/C y ubicación/estado propio.
- No mostrar guiones para datos operativos: si algo espera tela/avíos/taller debe indicarlo como sector/estado explícito.
**Tests**:
- Browser real 1366x768: nombres de orden completos visibles, fechas completas visibles, sin scroll horizontal innecesario.
- Orden simple y orden dividida de ejemplo se distinguen visualmente.

### Etapa 4.3 — Frontend: crear orden
**Tareas**:
- Formulario de orden: cliente, artículo, tela, curva, cantidades por talle, observaciones y ubicación/taller inicial si aplica.
- Al seleccionar artículo, mostrar avíos requeridos y partes bordables/estampables como referencia, no como tela/curva fija.
- Validación en cliente: al menos un talle con cantidad > 0, tela obligatoria, curva obligatoria.
**Tests**:
- Crear una orden con al menos 3 talles y verificar que aparece en el listado.
- Intentar crear sin cantidades muestra error visible sin llamar al backend.

### Etapa 4.4 — Backend: consulta de árbol de partes
**Tareas**:
- `GET /orders/:id` devuelve orden con cliente, artículo, tela, curva, items, avíos, árbol completo de partes y eventos.
- `GET /orders/:orderId/parts?stageId=` filtra por etapa actual respetando permisos.
**Tests**:
- Test de integración con árbol de 3 niveles.
- Usuario Bordado solo ve partes disponibles para Bordado; Producción/Gerencia ve todo.

### Etapa 4.5 — Backend: dividir una parte (split)
**Tareas**:
- `OrderPartsService.split()` soporta `LOTE` y `COMPONENTE` según PRD §3.4.
- Split `LOTE`: la suma de cantidades hijas no supera la parte padre.
- Split `COMPONENTE`: permite cantidades repetidas para piezas decorativas y obliga reunificación antes de Confección.
**Tests**:
- Unit tests exhaustivos de split válido/inválido.
- Test de permisos: solo usuario autorizado del sector actual, Producción/Gerencia o Admin puede dividir.

### Etapa 4.6 — Backend: reunificar componentes
**Tareas**:
- `OrderPartsService.recombine()` marca ramas `COMPONENTE` como `REINTEGRADA` y crea una nueva parte activa previa a Confección.
**Tests**:
- Reunificar ramas compatibles OK.
- Ramas de padres distintos o ya reunificadas devuelven 400.
- Ramas reunificadas no aparecen como hojas activas.

### Etapa 4.7 — Frontend: detalle de orden con árbol y acciones de división
**Tareas**:
- Vista detalle con cabecera compacta: orden, cliente, artículo, tela, curva, cantidades.
- Árbol de partes con ubicación, etapa, estado, días y avíos.
- Modal de división por lote/componente y acción de reunificación.
**Tests**:
- Browser real con orden dividida en 2 niveles.
- Split lote de más muestra error antes de backend.
- Split componente permite cantidades repetidas con descripción obligatoria.

---

## FASE 5 — Motor de etapas y operación por sector

### Etapa 5.1 — Backend: iniciar etapa
**Tareas**:
- `StageEventsService.start()` valida que no exista otro evento abierto para la parte.
- Valida permisos por sector/acción.
- `EXTERNO` exige `workshopId` salvo Atraque, que nunca se terceriza de forma independiente.
**Tests**:
- Iniciar etapa correcto cambia `part.status` y `currentStageId`.
- Dos eventos abiertos devuelven 409.
- Usuario de sector incorrecto recibe 403.
- Externo sin taller recibe 400.

### Etapa 5.2 — Backend: finalizar etapa
**Tareas**:
- Cierra evento activo, calcula duración, recalcula estado de parte y orden.
- Implementa Atraque incluido en Confección externa con `includesAtraque`.
- Orden finaliza solo cuando todas las hojas activas llegaron a Terminación finalizada.
**Tests**:
- Finalizar etapa activa OK.
- Finalizar sin evento activo devuelve 409.
- Terminación de última hoja finaliza orden.
- Confección externa con `includesAtraque=true` auto-genera evento Atraque cerrado.

### Etapa 5.3 — Backend: checklist de avíos por parte
**Tareas**:
- Crear checklist desde `article_supplies` al crear orden.
- `PATCH /order-parts/:id/supplies/:supplyId` actualiza completo/parcial/faltante, cantidades y nota.
- Permisos por sector Avíos, Producción/Gerencia o Admin.
**Tests**:
- e2e actualizar avío y verificar `updated_by`, `updated_at`.
- Usuario sin permiso Avíos recibe 403.

### Etapa 5.4 — Frontend: panel operativo por sector
**Tareas**:
- Usuarios de sector ven solo lo pendiente/activo de sus sectores permitidos.
- Panel para iniciar/finalizar etapa, nota, fecha estimada, taller si aplica.
- Avíos tiene checklist propio; Bordado/Estampado muestran partes decorables; Corte muestra órdenes pendientes de corte.
**Tests**:
- Login usuario Bordado: solo ve Bordado y puede cargar avance de Bordado.
- Login usuario Corte: solo ve Corte.
- Login Producción/Gerencia: ve todo.

### Etapa 5.5 — Frontend: estado Arreglo
**Tareas**:
- Marcar/resolver Arreglo a nivel orden con nota.
- Visible para permisos de Producción/Gerencia/Admin.
**Tests**:
- Marcar Arreglo cambia estado visual y genera notificación.
- Resolver vuelve a Activa.

**Cierre de Fase 5**: una orden puede avanzar por sectores reales con permisos aplicados, checklist de avíos y trazabilidad completa.

---

## FASE 6 — Notificaciones

### Etapa 6.1 — Backend: servicio y endpoints de notificaciones
**Tareas**: `NotificationsService.create()`, `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`.
**Tests**: e2e — un usuario solo ve sus propias notificaciones; marcar como leída persiste.

### Etapa 6.2 — Backend: cron de cuellos de botella
**Tareas**: detección diaria por días sin movimiento, respetando `excluded_from_bottleneck_alerts` y umbral configurable.
**Tests**: unit test con eventos activos de distinta antigüedad; Confección nunca notifica cuello de botella.

### Etapa 6.3 — Backend: fechas estimadas incumplidas
**Tareas**: detectar eventos vencidos y evitar duplicar notificaciones.
**Tests**: evento vencido genera una sola notificación aunque el cron corra dos veces.

### Etapa 6.4 — Frontend: campanita y pantalla de notificaciones
**Tareas**: conteo de no leídas, listado, marcar como leído y refresco/polling o WS según implementación disponible.
**Tests**: generar notificación y verla sin romper sesión.

---

## FASE 7 — Dashboard

### Etapa 7.1 — Backend: endpoint lista operativa
**Tareas**: `GET /dashboard/orders-list` devuelve filas preparadas para listado principal con órdenes simples y divididas, estado, sector, ubicación y semáforo.
**Tests**: integración con orden simple, orden dividida en 2 talleres y orden finalizada.

### Etapa 7.2 — Backend: endpoint Kanban
**Tareas**: `GET /dashboard/kanban` agrupa partes activas por etapa, respetando permisos.
**Tests**: partes `DIVIDIDA` y `REINTEGRADA` no aparecen como hojas activas.

### Etapa 7.3 — Backend: resumen gerencial
**Tareas**: `GET /dashboard/summary` con activas, en arreglo, demoradas, finalizadas y vencimientos.
**Tests**: contadores con fixture controlado.

### Etapa 7.4 — Frontend: dashboard lista y Kanban
**Tareas**:
- Lista principal compacta y sin datos truncados críticos.
- Kanban por etapa para Producción/Gerencia/Admin.
- Filtros por cliente, artículo, estado, etapa, taller/ubicación.
**Tests**:
- Browser real 1366x768 y mobile/tablet básico.
- Verificación de permisos: usuario sectorial no ve tablero global si no tiene permiso.

**Cierre de Fase 7**: Producción/Gerencia tiene visibilidad completa y usuarios de sector tienen vistas operativas acotadas.

---

## FASE 8 — Endurecimiento, datos demo y deploy MVP

### Etapa 8.1 — Revisión de permisos end-to-end
**Tareas**: matriz completa de endpoints vs permisos documentados.
**Tests**: por endpoint sensible, caso permitido y caso 403.

### Etapa 8.2 — UX final de formularios compactos
**Tareas**: revisar todos los ABM y flujos de orden para coherencia visual Promatex, legibilidad y formularios sin scroll innecesario.
**Tests**: Playwright/Chrome real con capturas 1366x768 y viewport móvil; no hay textos cortados ni overlays.

### Etapa 8.3 — Seeds de datos de demostración
**Tareas**: seed con clientes, talleres, telas, avíos, curvas, artículos con avíos/partes decorables, usuarios por sector y 5-10 órdenes en distintos estados.
**Tests**: seed corre limpio tras `migration:run` en base vacía y permite probar login + dashboard sin carga manual.

### Etapa 8.4 — Hardening de errores y casos edge
**Tareas**: revisar errores de negocio: etapa parcial, split inválido, permisos cruzados, taller requerido, curva sin valores, artículo sin avíos, etc.
**Tests**: 1 test por caso edge documentado.

### Etapa 8.5 — Verificación del VPS y deploy a producción
**Tareas**: verificar recursos del VPS, Dockerfiles finales, Dokploy, variables de entorno, migraciones explícitas, backup reciente y smoke test productivo.
**Tests**: login real + crear orden real + avanzar una etapa contra URL producción.

---

## Resumen de dependencias entre fases

```
Fase 0 (setup) → Fase 1 (modelo base) → Fase 2 (auth)
                                         → Fase 3 (maestros reales + permisos) ─┐
                                                                                 ├→ Fase 4 (órdenes/partes) → Fase 5 (operación por sector)
                                                                                 ┘                                  ↓
                                         Fase 6 (notificaciones) ←──────────────────────────────────────────────────┘
                                                                                 ↓
                                         Fase 7 (dashboard)
                                                                                 ↓
                                         Fase 8 (hardening, demo y deploy)
```

No se puede empezar Fase 4 sin Fase 3 corregida: la orden depende de clientes, artículos, telas, curvas, avíos y permisos con el modelo real. No se puede cerrar Fase 5 sin permisos por sector funcionando. Fase 6 y Fase 7 dependen de eventos de etapa reales y de la visibilidad por permisos.
