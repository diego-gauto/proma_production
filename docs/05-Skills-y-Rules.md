# Skills y Rules recomendadas para el desarrollo

> Este documento lista skills que pueden acelerar el desarrollo, tanto las nativas del entorno de Claude Code como las disponibles en la comunidad vía [skills.sh](https://skills.sh). Instalar solo las que efectivamente se vayan a usar — no acumular skills sin uso real, ya que agregan ruido al contexto del agente.

## 1. Cómo instalar skills de skills.sh

```bash
# Buscar skills por palabra clave
pnpm dlx skills find nestjs

# Ver contenido de una skill antes de instalar
bunx skills add <owner>/<repo> --list

# Instalar una skill puntual a Claude Code
pnpm dlx skills add <owner>/<repo> --skill <nombre-skill>

# Listar lo ya instalado
pnpm dlx skills list
```

Las skills instaladas quedan en `~/.claude/skills/` (personal) o `.claude/skills/` (a nivel de proyecto — **recomendado para este repo**, así queda versionado y disponible para todo el equipo/agentes que trabajen sobre él).

## 2. Skills recomendadas por área

### Backend — NestJS / TypeORM / PostgreSQL

| Skill | Para qué sirve en este proyecto | Prioridad |
|---|---|---|
| `nestjs-typeorm-integration` (agentivecity-skillfactory) | Configuración de `TypeOrmModule`, entidades, migraciones, transacciones con `QueryRunner` — directamente aplicable al modelo de árbol de `order_parts` que requiere transacciones al hacer `split()` | **Alta** |
| `nestjs-expert` (Jeffallan) | Scaffolding de módulos/controllers/services/guards/DTOs siguiendo convenciones enterprise, más patrones de Postgres avanzado (EXPLAIN, JSONB, índices) | **Alta** |
| Skill de testing NestJS (buscar `nest jest e2e` en skills.sh) | Dado que **todos los tests deben pasar por etapa** (regla dura del plan de implementación), conviene una skill que ya conozca los patrones de `@nestjs/testing` + Supertest para e2e | **Alta** |

### Frontend — Next.js / TypeScript

| Skill | Para qué sirve | Prioridad |
|---|---|---|
| `frontend-design` (anthropics — **ya disponible por defecto en este entorno**, no requiere instalación de skills.sh) | Dirección de diseño para que las pantallas de fábrica (Kanban, formularios de sector) no se vean "genéricas" pese a no usar librerías de UI | **Alta** |
| Skill de Next.js App Router (buscar `nextjs app router` en skills.sh) | Patrones actualizados de Server/Client Components, layouts anidados — útil dado que el proyecto usa exclusivamente App Router | **Media** |
| Skill de accesibilidad de formularios (buscar `a11y forms` en skills.sh) | Los formularios de piso de planta (marcar inicio/fin de etapa) deben ser usables rápido desde celular por operarios — vale la pena una skill enfocada en esto | **Media** |

### Transversales

| Skill | Para qué sirve | Prioridad |
|---|---|---|
| Skill de monorepo / workspace (buscar `monorepo` o `pnpm workspace` en skills.sh si se decide usar workspaces) | Útil si el monorepo empieza a compartir scripts, tipos o paquetes entre `backend/` y `frontend/`. No instalar al inicio si la estructura se mantiene simple con dos proyectos pnpm separados dentro del mismo repo. | Media |
| `skill-creator` (anthropics — **ya disponible en este entorno**) | Si a mitad de proyecto surge un patrón repetitivo propio (ej: "cómo armar un módulo ABM completo siguiendo la convención de este repo"), se puede empaquetar como skill propia del proyecto en vez de repetir instrucciones cada vez | Media |
| `code-simplifier` (mencionada en varios rankings de skills.sh) | Limpieza de código recién escrito sin cambiar comportamiento — útil para pasar de borrador funcional a código prolijo antes de cerrar cada etapa del plan | Media |
| Skill de revisión de PR / checklist de calidad (buscar `pr review checklist`) | Complementa el AGENTS.md: una segunda pasada automatizada antes de dar una etapa por cerrada | Baja–Media |

### Skills ya incluidas en este entorno de trabajo (no requieren skills.sh)

Estas ya están disponibles como parte del entorno de Claude y se activan automáticamente según la tarea — no hace falta buscarlas ni instalarlas:

- **`docx`** — si en algún momento se pide entregar alguno de estos documentos como Word.
- **`pdf`** — si se necesita generar o completar PDFs (ej: reportes exportables).
- **`xlsx`** — útil para exportar el listado de órdenes/dashboard a Excel si se pide más adelante.
- **`frontend-design`** — dirección visual para las pantallas de Next.js.

## 3. Rules propias del proyecto (no son skills de terceros)

Más allá de las skills de terceros, este proyecto ya define sus propias "rules" en dos documentos que cumplen ese rol y **tienen prioridad sobre cualquier skill de terceros** en caso de conflicto:

1. **`AGENTS.md`** — reglas obligatorias de comportamiento del agente (alcance, invariantes del modelo de datos, convenciones de código, testing no negociable).
2. **PRD §3.4** — reglas de negocio específicas sobre el modelo de datos (divisiones de partes, cuellos de botella, finalización de órdenes).

Además, el flujo de trabajo obligatorio para cualquier agente o desarrollador es:
- Trabajar siempre en una rama nueva creada desde `develop` para cada etapa o funcionalidad no documentada.
- Desarrollar y verificar localmente frontend, backend y PostgreSQL antes de subir la etapa a GitHub.
- Usar el monorepo del proyecto como estructura base mientras front/back evolucionen coordinados.

Si una skill de terceros sugiere un patrón que contradice `AGENTS.md` o el PRD (por ejemplo, una skill de NestJS que sugiere usar Prisma en vez de TypeORM, o que promueve `synchronize: true`), **el agente debe priorizar las reglas de este proyecto** y señalar la contradicción en vez de aplicar la sugerencia de la skill sin más.

## 4. Recomendación de instalación mínima para arrancar

Para no sobrecargar el contexto desde el día uno, se recomienda instalar solamente esto al iniciar la Fase 0 del plan de implementación, y sumar el resto solo si hace falta en el camino:

```bash
pnpm dlx skills add agentivecity-skillfactory/nestjs-typeorm-integration --skill nestjs-typeorm-integration
```

El resto de las skills de la tabla se evalúan e instalan bajo demanda, cuando la fase del plan de implementación efectivamente las necesite (ej: instalar una skill de testing e2e recién al llegar a la Fase 2, no antes).
