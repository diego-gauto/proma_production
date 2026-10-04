# PRD — Sistema de Seguimiento de Producción Textil

**Versión:** 1.1 (MVP)
**Estado:** Fuente de verdad para implementación
**Última actualización:** 2026-10-03

> Este documento es la única fuente de verdad para implementar el sistema. Cualquier ambigüedad debe resolverse siguiendo lo aquí definido. Si algo no está cubierto, se documenta como supuesto explícito antes de codear.

---

## 1. Visión del Proyecto

### 1.1 Descripción general

Sistema web para trackear el recorrido de **órdenes de corte** de una fábrica textil de indumentaria de trabajo, desde que se decide iniciar el corte hasta que la prenda queda terminada. Una orden se puede dividir dinámicamente en **partes (lotes)** que avanzan de forma independiente y paralela por las distintas etapas productivas (bordado, avíos, confección propia o en taller externo, ojal y botón, atraque, plancha, terminación).

### 1.2 Objetivos del MVP

1. Registrar el ciclo de vida completo de una orden de corte y sus partes.
2. Permitir que cada sector marque inicio/fin de su etapa, con notas.
3. Soportar división de una parte en sub-partes según dos necesidades distintas: separación por lote/cantidad y separación temporal por componentes de prenda para Bordado/Estampado/espera, con reunificación antes de Confección.
4. Dar visibilidad total a Gerencia/Producción vía dashboard (Kanban + lista).
5. Emitir notificaciones in-app ante cuellos de botella, incumplimiento de fechas estimadas, ingreso y finalización de trabajos.
6. Mantener maestros reales de Clientes, Talleres externos, Telas, Avíos, Curvas de talles, Artículos, Usuarios y permisos.

### 1.3 Usuarios objetivo

| Rol de sistema | Quiénes | Permisos |
|---|---|---|
| **Gerencia / Producción / Administración** | Usuarios de control y gestión | Pueden ver el tablero completo, gestionar órdenes, operar o corregir etapas según permisos asignados y administrar maestros si tienen el permiso correspondiente. |
| **Usuario de sector** | Corte, Bordado, Estampado, Avíos, Confección interna, Atraque, Ojal y Botón, Plancha, Terminación | Ve únicamente el trabajo que corresponde a sus sectores habilitados y solo puede ejecutar las acciones autorizadas para esos sectores. Ej: Bordado ve lo que tiene para bordar y carga avances de bordado; Corte ve y opera corte; Avíos ve y opera avíos. |
| **Admin técnico/funcional** | Usuario con administración completa | Acceso total a ABM, permisos, usuarios, órdenes y configuración. |

Login individual por usuario. Los roles agrupan permisos, pero el acceso real se determina por permisos personalizados por sector y acción.

### 1.4 Alcance del MVP — Incluye

- ABM de Clientes, Talleres Externos, Telas, Avíos, Curvas de talles, Artículos, Usuarios y permisos.
- Maestro de Artículos con lista de avíos requeridos y partes que pueden bordarse o estamparse.
- Creación de Orden de Corte como asociación entre cliente, artículo, tela, curva de talles, cantidades por talle y taller/ubicación cuando aplique.
- Chequeo de materiales de inicio de corte (completo/parcial por talle/color/parte).
- División dinámica de una Parte en Sub-partes en cualquier etapa posterior al corte, distinguiendo divisiones por lote/cantidad de divisiones temporales por componentes decorativos.
- Registro de inicio/fin de cada etapa por Parte, con cálculo automático de duración.
- Checklist de avíos (de confección y de terminación) por Parte, marcando completo/parcial/faltante.
- Envío a taller externo con selección del taller (Confección, Ojal y Botón, Plancha).
- Estado "Arreglo" a nivel de Orden completa, con nota.
- Fecha estimada de finalización opcional por etapa/Parte, con notificación de incumplimiento.
- Notificaciones in-app: ingreso de orden, finalización de orden, incumplimiento de fecha estimada, cuello de botella (días sin movimiento) — excepto en Confección.
- Dashboard Kanban (columnas = etapas) y vista de lista/tabla filtrable.
- Detalle de orden con selector de qué etapa visualizar (para no saturar la pantalla).

### 1.5 Alcance del MVP — NO incluye

- Gestión de stock/inventario de telas y avíos (cantidades reales en depósito).
- Facturación, costos, precios.
- Gestión de Pedidos de cliente (agrupación de múltiples órdenes de corte).
- Despacho al cliente final (fuera de alcance; el sistema termina en la etapa "Terminación").
- Generación/lectura de códigos QR (Fase 2).
- Notificaciones por email o Telegram (Fase 2).
- Integraciones externas (ERP, contable, e-commerce).

### 1.6 Supuestos explícitos (a confirmar con el cliente si difieren)

- **S1**: El listado de sectores/roles de usuario es configurable desde el ABM de Usuarios, con un catálogo inicial de: Corte, Bordado, Estampado, Avíos, Confección, Atraque, Ojal y Botón, Plancha, Terminación.
- **S2**: Ojal y Botón puede tercerizarse a un taller externo con su propio evento de etapa (mismo modelo que Confección y Plancha). **Atraque es distinto**: no se terceriza como etapa independiente con taller propio. Cuando el taller de Confección tiene máquina atracadora, entrega la prenda ya atracada como parte del mismo envío de Confección; si no la tiene, el atraque se hace de manera interna después. Ver regla de negocio §3.4-10 y el campo `includes_atraque` en `part_stage_events`.
- **S3**: El "fin" de una etapa (interna o en taller) es todo-o-nada respecto a la Parte que se movió: se considera finalizada cuando **toda la cantidad de esa Parte específica** fue recibida/terminada. Si llega un taller y entrega solo una porción, esa porción se debe registrar como una **nueva sub-parte que se separa** de la que sigue en taller (ver §6.4).
- **S4**: El identificador manual de orden (ya usado en el sistema legado) es un campo de texto libre único, y el sistema además genera un ID interno autoincremental como PK real.
- **S5**: No se migran datos del sistema anterior en el MVP (queda fuera de alcance salvo que se indique lo contrario).
- **S6**: El estado "Arreglo" pausa visualmente la orden en el dashboard pero no bloquea que sus partes sigan operando individualmente; es informativo/de alerta, no un bloqueo duro del sistema.
- **S7**: "Días sin movimiento" para cuello de botella se configura con un umbral por defecto de **3 días hábiles**, editable por un Admin desde configuración general (no hardcodeado).
- **S8**: El proyecto se desarrolla completo de manera local y se suben cambios a GitHub por etapas cerradas. Se adopta **monorepo** como estructura recomendada del MVP (`backend/`, `frontend/`, `docker-compose.yml` local y documentación en el mismo repo), salvo decisión explícita posterior de separarlo.
- **S9**: El artículo representa el producto a cortar. No tiene tela ni curva asociada de forma fija. La tela, curva, cantidades por talle, cliente y taller/ubicación se definen en la Orden de Corte.
- **S10**: El artículo sí mantiene una lista de avíos que normalmente lleva el producto y una lista de partes de prenda que pueden bordarse o estamparse. Estos datos ayudan a crear la orden y a preparar checklists, pero no implican stock real.
- **S11**: Los permisos no se resuelven solo por rol. Cada usuario puede tener permisos personalizados por sector y acción; los roles funcionan como plantillas o agrupadores iniciales.

---

## 2. Stack Tecnológico Detallado

### 2.1 Frontend
- **Next.js 15.x** (App Router) — última estable al momento de desarrollo, verificar con `pnpm view next version`.
- **TypeScript 5.x** (`strict: true`)
- **CSS Modules** — un `.module.css` por componente, cero librerías de UI/CSS.
- **Package manager**: `pnpm` 10.x para instalar dependencias, correr scripts y generar `pnpm-lock.yaml`.
- **Fetching**: `fetch` nativo envuelto en cliente propio (`src/lib/api`), sin librerías externas de data-fetching en el MVP (se puede evaluar TanStack Query en fase 2).
- **Mobile-first**: los formularios de sector (marcar inicio/fin de etapa) se diseñan primero para uso desde celular/tablet en planta.

### 2.2 Backend
- **NestJS 10.x** — última estable.
- **Node.js 22.x LTS**.
- **TypeScript 5.x**.
- Arquitectura modular por dominio (un módulo NestJS por entidad principal).

### 2.3 Base de Datos
- **PostgreSQL 16.x**
- **TypeORM** (última estable compatible con Nest 10) — migraciones obligatorias, **nunca `synchronize: true` en ningún ambiente**.

### 2.4 Librerías complementarias
| Propósito | Librería |
|---|---|
| Validación DTO | `class-validator`, `class-transformer` |
| Autenticación | `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt` |
| Notificaciones in-app | Tabla propia `notifications` + polling o WebSocket (`@nestjs/websockets` con `socket.io`) — ver §6.7 |
| Programador de tareas (cuellos de botella, chequeo de fechas vencidas) | `@nestjs/schedule` (cron jobs) |
| Documentación de API | `@nestjs/swagger` |

### 2.5 Variables de entorno

```env
# Backend (.env)
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:55432/produccion_textil
JWT_SECRET=<random-64-chars>
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:3000
BOTTLENECK_THRESHOLD_DAYS=3

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## 3. Arquitectura de Datos

### 3.1 Modelo conceptual

El corazón del sistema es el par **`orders`** (cabecera, lo que pide el cliente) y **`order_parts`** (las unidades reales que se mueven por planta). Una `order_part` puede tener una `parent_part_id` que apunta a otra `order_part`, formando un **árbol de divisiones**: cuando una parte se separa, se crean nuevas filas hijas y la fila padre se marca como `is_split = true` (deja de moverse por sí misma; su remanente activo pasa a ser sus hijos o su resultado reunificado).

Hay dos clases de división:
- **División por lote (`LOTE`)**: separa cantidades de prendas. Ej: 30 unidades a Taller A y 20 a Taller B. En este caso la suma de cantidades hijas no puede superar la cantidad del padre.
- **División por componente (`COMPONENTE`)**: separa partes físicas de las mismas prendas antes de Confección. Ej: mangas a bordar, frente a estampar y resto en espera. En este caso las hijas pueden tener la misma cantidad que el padre porque representan componentes distintos, no prendas adicionales. Estas ramas deben reunificarse antes de iniciar Confección.

Cada `order_part` tiene un historial de pasos por etapa en **`part_stage_events`**: cada vez que una parte entra o sale de una etapa, se registra una fila con fecha de inicio, fecha de fin, fecha estimada (opcional), nota y usuario responsable.

### 3.2 Diagrama entidad-relación (texto)

```
clients (1) ──< orders (N)
workshops (1) ──< part_stage_events (N)          [taller externo asignado, si aplica]
articles (1) ──< orders (N)
users (1) ──< part_stage_events (N)               [quién ejecutó el paso]
users (1) ──< notifications (N)

orders (1) ──< order_parts (N)                    [partes raíz de una orden]
order_parts (1) ──< order_parts (N)               [self-reference: parent_part_id → divisiones]
order_parts (1) ──< part_stage_events (N)         [historial de etapas de esa parte]
order_parts (1) ──< part_supplies (N)             [checklist de avíos de esa parte]

clients (1) ──< client_contacts (N)
workshops (1) ──< workshop_contacts (N)
articles (1) ──< article_supplies (N)             [avíos requeridos por producto]
articles (1) ──< article_decoration_parts (N)     [partes bordables/estampables]
supplies (1) ──< article_supplies (N)
supplies (1) ──< part_supplies (N)                [checklist operativo por parte]
fabrics (1) ──< orders/order_requested_items (N)  [la tela se define en la orden, no en el artículo]
size_curves (1) ──< order_requested_items (N)     [la curva se define en la orden]
users (1) ──< user_permissions (N)
stages (1) ──< part_stage_events (N)              [catálogo de etapas]
```

### 3.3 DDL completo (PostgreSQL)

```sql
-- ============================================================
-- EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');

CREATE TYPE sector_code AS ENUM (
  'CORTE', 'BORDADO', 'ESTAMPADO', 'AVIOS_CONFECCION', 'CONFECCION',
  'ATRAQUE', 'OJAL_BOTON', 'AVIOS_TERMINACION', 'PLANCHA', 'TERMINACION'
);

CREATE TYPE stage_execution_type AS ENUM ('INTERNO', 'EXTERNO', 'AMBOS');

CREATE TYPE size_sequence_type AS ENUM ('ALFABETICA', 'NUMERICA', 'DOBLE', 'MIXTA');

CREATE TYPE order_status AS ENUM ('ACTIVA', 'EN_ARREGLO', 'FINALIZADA', 'CANCELADA');

CREATE TYPE part_status AS ENUM (
  'PENDIENTE',        -- creada, aún no inició su primera etapa
  'EN_PROCESO',        -- tiene una etapa activa (in_progress)
  'DIVIDIDA',           -- se dividió en sub-partes, ya no se mueve por sí misma
  'REINTEGRADA',        -- rama de componente ya reunificada; no cuenta como hoja final
  'FINALIZADA'          -- llegó al final del flujo (Terminación completada)
);

CREATE TYPE part_split_mode AS ENUM ('LOTE', 'COMPONENTE');

CREATE TYPE supply_completeness AS ENUM ('COMPLETO', 'PARCIAL', 'FALTANTE');

CREATE TYPE notification_type AS ENUM (
  'INGRESO_ORDEN', 'FINALIZACION_ORDEN', 'FECHA_ESTIMADA_INCUMPLIDA',
  'CUELLO_DE_BOTELLA', 'ORDEN_EN_ARREGLO'
);

CREATE TYPE fabric_weave_type AS ENUM ('PUNTO', 'PLANO');
CREATE TYPE fabric_format_type AS ENUM ('ABIERTO', 'TUBULAR');
CREATE TYPE supply_category AS ENUM ('CONFECCION', 'TERMINACION');
CREATE TYPE permission_action AS ENUM ('VER', 'CREAR', 'EDITAR', 'ELIMINAR', 'INICIAR_ETAPA', 'FINALIZAR_ETAPA', 'FORZAR_CAMBIO', 'ADMINISTRAR');

-- ============================================================
-- CATÁLOGO DE ETAPAS (configurable, no hardcodeado en código)
-- ============================================================
CREATE TABLE stages (
  id              SMALLSERIAL PRIMARY KEY,
  code            sector_code NOT NULL UNIQUE,
  name            VARCHAR(100) NOT NULL,
  sequence_order  SMALLINT NOT NULL,           -- orden por defecto en el flujo estándar
  is_optional     BOOLEAN NOT NULL DEFAULT false, -- ej: Atraque, Ojal y Botón
  execution_type  stage_execution_type NOT NULL DEFAULT 'INTERNO',
  excluded_from_bottleneck_alerts BOOLEAN NOT NULL DEFAULT false, -- true para Confección
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE stages IS 'Catálogo maestro de etapas del proceso productivo. Confección tiene excluded_from_bottleneck_alerts=true por regla de negocio.';

-- ============================================================
-- USUARIOS, ROLES Y PERMISOS
-- ============================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       VARCHAR(150) NOT NULL,
  email           VARCHAR(150) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            user_role NOT NULL DEFAULT 'USER',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON COLUMN users.role IS 'Rol base o plantilla. Los permisos efectivos se calculan con user_permissions.';

CREATE TABLE user_permissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sector_code     sector_code,                         -- NULL = permiso global no atado a sector
  action          permission_action NOT NULL,
  is_allowed      BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, sector_code, action)
);
CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_sector ON user_permissions(sector_code);
COMMENT ON TABLE user_permissions IS 'Permisos personalizados por usuario, sector y acción. Permite que Bordado solo vea/opere Bordado, Corte solo Corte, y Producción/Gerencia vean todo según configuración.';

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name   VARCHAR(180) NOT NULL,                -- Razón social
  tax_id          VARCHAR(30) NOT NULL,                 -- CUIT/CUIL
  address         VARCHAR(255),
  locality        VARCHAR(120),
  district        VARCHAR(120),                         -- partido/departamento
  province        VARCHAR(120),
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clients_business_name ON clients(business_name);
CREATE INDEX idx_clients_tax_id ON clients(tax_id);

CREATE TABLE client_contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_name    VARCHAR(150) NOT NULL,
  email           VARCHAR(150),
  fixed_phone     VARCHAR(50),
  mobile_phone_1  VARCHAR(50),
  mobile_phone_2  VARCHAR(50),
  role_note       VARCHAR(120),
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_contacts_client ON client_contacts(client_id);
COMMENT ON TABLE client_contacts IS 'Un cliente puede tener varios contactos. Cada contacto puede tener teléfono fijo, dos celulares mínimos previstos y email.';

-- ============================================================
-- TALLERES EXTERNOS
-- ============================================================
CREATE TABLE workshops (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(180) NOT NULL,
  address         VARCHAR(255),
  locality        VARCHAR(120),
  district        VARCHAR(120),
  province        VARCHAR(120),
  specialties     sector_code[] NOT NULL DEFAULT '{}', -- ej: {CONFECCION, PLANCHA, OJAL_BOTON}
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_workshops_active ON workshops(is_active);
CREATE INDEX idx_workshops_name ON workshops(name);

CREATE TABLE workshop_contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id     UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  contact_name    VARCHAR(150) NOT NULL,
  email           VARCHAR(150),
  fixed_phone     VARCHAR(50),
  mobile_phone_1  VARCHAR(50),
  mobile_phone_2  VARCHAR(50),
  role_note       VARCHAR(120),
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_workshop_contacts_workshop ON workshop_contacts(workshop_id);

-- ============================================================
-- CURVAS DE TALLES (catálogo configurable)
-- ============================================================
CREATE TABLE size_curves (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,        -- ej: "Alfabética Standard", "Numérica 38-50", "Mixta Especial"
  sequence_type   size_sequence_type NOT NULL,  -- ALFABETICA | NUMERICA | DOBLE | MIXTA
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE size_curve_values (
  id              SERIAL PRIMARY KEY,
  size_curve_id   INT NOT NULL REFERENCES size_curves(id) ON DELETE CASCADE,
  label           VARCHAR(20) NOT NULL,          -- ej: "XS", "38", "30/32", "Especial"
  sort_order      SMALLINT NOT NULL,
  UNIQUE(size_curve_id, label)
);
CREATE INDEX idx_size_curve_values_curve ON size_curve_values(size_curve_id);

-- ============================================================
-- CATÁLOGO DE TELAS
-- ============================================================
CREATE TABLE fabrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR(80) NOT NULL,          -- artículo/código interno o del proveedor
  name            VARCHAR(150) NOT NULL,
  color           VARCHAR(80),
  weight_oz       NUMERIC(6,2),                  -- onzaje
  supplier        VARCHAR(150),
  weave_type      fabric_weave_type NOT NULL,    -- PUNTO | PLANO
  format_type     fabric_format_type NOT NULL,   -- ABIERTO | TUBULAR
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fabrics_name ON fabrics(name);
CREATE INDEX idx_fabrics_code ON fabrics(code);

-- ============================================================
-- CATÁLOGO DE AVÍOS
-- ============================================================
CREATE TABLE supplies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR(80) NOT NULL,          -- artículo/código interno o del proveedor
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  color           VARCHAR(80),
  supplier        VARCHAR(150),
  category        supply_category NOT NULL,      -- CONFECCION | TERMINACION
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_supplies_category ON supplies(category);
CREATE INDEX idx_supplies_code ON supplies(code);

-- ============================================================
-- ARTÍCULOS / PRODUCTOS A CORTAR
-- ============================================================
CREATE TABLE articles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR(80) NOT NULL,          -- artículo/código del producto
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_articles_name ON articles(name);
CREATE INDEX idx_articles_code ON articles(code);
COMMENT ON TABLE articles IS 'Producto a cortar. No contiene tela ni curva fija: eso se define en la orden de corte.';

CREATE TABLE article_supplies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  supply_id       UUID NOT NULL REFERENCES supplies(id),
  quantity        NUMERIC(10,2),
  note            VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(article_id, supply_id)
);
CREATE INDEX idx_article_supplies_article ON article_supplies(article_id);
CREATE INDEX idx_article_supplies_supply ON article_supplies(supply_id);
COMMENT ON TABLE article_supplies IS 'Avíos habituales del artículo. Sirven como plantilla para ordenes/checklists, no como control de stock.';

CREATE TABLE article_decoration_parts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  garment_part    VARCHAR(100) NOT NULL,          -- ej: "Manga izquierda"
  decoration_type VARCHAR(30) NOT NULL             -- BORDADO | ESTAMPADO
);
CREATE INDEX idx_article_decoration_article ON article_decoration_parts(article_id);

-- ============================================================
-- ÓRDENES DE CORTE (cabecera)
-- ============================================================
CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  internal_code         VARCHAR(30) NOT NULL UNIQUE,   -- autogenerado por el sistema, ej: OC-2026-000123
  external_code         VARCHAR(50) NOT NULL,          -- número asignado manualmente (sistema legado)
  client_id             UUID NOT NULL REFERENCES clients(id),
  article_id            UUID NOT NULL REFERENCES articles(id),
  fabric_id             UUID NOT NULL REFERENCES fabrics(id),
  size_curve_id         INT NOT NULL REFERENCES size_curves(id),
  initial_workshop_id   UUID REFERENCES workshops(id), -- opcional; solo si la orden nace asignada a una ubicación/taller inicial
  status                order_status NOT NULL DEFAULT 'ACTIVA',
  repair_note           TEXT,                            -- nota cuando status = EN_ARREGLO
  created_by            UUID NOT NULL REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at          TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_orders_external_code ON orders(external_code);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_client ON orders(client_id);
COMMENT ON COLUMN orders.internal_code IS 'PK amigable autogenerada, formato OC-AAAA-NNNNNN';
COMMENT ON COLUMN orders.external_code IS 'Número asignado manualmente, proveniente del sistema de órdenes ya existente';
COMMENT ON TABLE orders IS 'La orden de corte une cliente, artículo/producto, tela, curva de talles y cantidades por talle. El artículo no define tela ni curva por sí mismo.';

-- Detalle de talles/cantidades pedidos originalmente en la orden (lo que se pidió, no lo que se movió). La tela base vive en orders.fabric_id; fabric_id aquí se usa solo si una línea necesita sobrescribirla.
CREATE TABLE order_requested_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  fabric_id           UUID REFERENCES fabrics(id),
  color               VARCHAR(80),
  size_curve_value_id INT NOT NULL REFERENCES size_curve_values(id),
  quantity_requested  INT NOT NULL CHECK (quantity_requested > 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_requested_items_order ON order_requested_items(order_id);
COMMENT ON TABLE order_requested_items IS 'Lo que el cliente pidió: cantidad por talle/color. Es el total de prendas a cumplir; solo se compara contra ramas LOTE activas, no contra ramas COMPONENTE que duplican temporalmente piezas de la misma prenda.';

-- ============================================================
-- PARTES / LOTES (árbol de divisiones — el corazón del tracking)
-- ============================================================
CREATE TABLE order_parts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  parent_part_id    UUID REFERENCES order_parts(id),        -- NULL = parte raíz (viene directo del corte)
  part_code         VARCHAR(20) NOT NULL,                     -- autogenerado, ej: "P-0001-01", "P-0001-01-A"
  fabric_id         UUID REFERENCES fabrics(id),
  color             VARCHAR(80),
  size_curve_value_id INT REFERENCES size_curve_values(id),   -- NULL si la parte mezcla varios talles
  quantity          INT NOT NULL CHECK (quantity > 0),
  status            part_status NOT NULL DEFAULT 'PENDIENTE',
  is_split          BOOLEAN NOT NULL DEFAULT false,           -- true = ya no se mueve, sus hijos la reemplazan
  split_mode        part_split_mode,                           -- NULL si no nació de un split; LOTE conserva cantidad, COMPONENTE permite ramas paralelas por piezas decorativas
  is_component_branch BOOLEAN NOT NULL DEFAULT false,           -- true para ramas temporales de mangas/frentes/resto antes de Confección
  recombined_into_part_id UUID REFERENCES order_parts(id),      -- parte resultante al reunir ramas COMPONENTE antes de Confección
  current_stage_id  SMALLINT REFERENCES stages(id),           -- etapa activa actual (NULL si no inició o si is_split)
  split_reason      VARCHAR(255),                              -- ej: "Manga izquierda a bordar", "Envío parcial a Taller X"
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_parts_order ON order_parts(order_id);
CREATE INDEX idx_order_parts_parent ON order_parts(parent_part_id);
CREATE INDEX idx_order_parts_status ON order_parts(status);
CREATE INDEX idx_order_parts_current_stage ON order_parts(current_stage_id) WHERE status = 'EN_PROCESO';
CREATE INDEX idx_order_parts_recombined_into ON order_parts(recombined_into_part_id);
COMMENT ON TABLE order_parts IS 'Nodo del árbol de lotes/componentes. parent_part_id=NULL es la parte raíz creada al cortar. Una parte con is_split=true dejó de moverse; sus hijas o su parte reunificada la reemplazan operativamente.';
COMMENT ON COLUMN order_parts.split_mode IS 'LOTE conserva cantidades de prendas; COMPONENTE separa piezas de las mismas prendas para Bordado/Estampado/espera y puede duplicar cantidades temporalmente.';
COMMENT ON COLUMN order_parts.recombined_into_part_id IS 'Para ramas COMPONENTE ya reunificadas, apunta a la nueva order_part que representa la prenda completa antes de Confección.';

-- ============================================================
-- HISTORIAL DE ETAPAS POR PARTE (el log de trazabilidad)
-- ============================================================
CREATE TABLE part_stage_events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_part_id       UUID NOT NULL REFERENCES order_parts(id) ON DELETE CASCADE,
  stage_id            SMALLINT NOT NULL REFERENCES stages(id),
  execution_type      stage_execution_type NOT NULL,          -- INTERNO o EXTERNO para este evento puntual
  workshop_id         UUID REFERENCES workshops(id),           -- obligatorio si execution_type = EXTERNO
  started_at          TIMESTAMPTZ,
  estimated_finish_at TIMESTAMPTZ,                              -- opcional, la carga quien inicia
  finished_at         TIMESTAMPTZ,
  duration_days       NUMERIC(6,2) GENERATED ALWAYS AS (
                         CASE WHEN finished_at IS NOT NULL AND started_at IS NOT NULL
                              THEN EXTRACT(EPOCH FROM (finished_at - started_at)) / 86400.0
                              ELSE NULL END
                       ) STORED,
  overdue_notified    BOOLEAN NOT NULL DEFAULT false,           -- evita notificar 2 veces el mismo incumplimiento
  includes_atraque    BOOLEAN,                                   -- solo aplica cuando stage=CONFECCION y execution_type=EXTERNO
  note                TEXT,
  performed_by        UUID NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_part_stage_events_part ON part_stage_events(order_part_id);
CREATE INDEX idx_part_stage_events_stage ON part_stage_events(stage_id);
CREATE INDEX idx_part_stage_events_active ON part_stage_events(order_part_id, stage_id) WHERE finished_at IS NULL;
COMMENT ON TABLE part_stage_events IS 'Un registro por cada paso de una parte por una etapa. Solo puede existir un evento con finished_at NULL por order_part_id a la vez (regla de negocio, validada en servicio, no en constraint por simplicidad de migraciones).';
COMMENT ON COLUMN part_stage_events.includes_atraque IS 'Solo se completa al finalizar un evento de CONFECCION con execution_type=EXTERNO: indica si el taller entregó la prenda ya atracada (true) o no (false). NULL para cualquier otra etapa. Si es true, el servicio auto-genera un part_stage_event de ATRAQUE ya cerrado para la misma parte (ver regla §3.4-10). ATRAQUE nunca tiene su propio workshop_id: no se terceriza de forma independiente.';

-- ============================================================
-- CHECKLIST DE AVÍOS POR PARTE
-- ============================================================
CREATE TABLE part_supplies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_part_id   UUID NOT NULL REFERENCES order_parts(id) ON DELETE CASCADE,
  supply_id       UUID NOT NULL REFERENCES supplies(id),
  completeness    supply_completeness NOT NULL DEFAULT 'FALTANTE',
  quantity_needed INT,
  quantity_available INT,
  note            TEXT,
  updated_by      UUID REFERENCES users(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_part_supplies_part ON part_supplies(order_part_id);
CREATE UNIQUE INDEX idx_part_supplies_unique ON part_supplies(order_part_id, supply_id);

-- ============================================================
-- NOTIFICACIONES
-- ============================================================
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            notification_type NOT NULL,
  order_id        UUID REFERENCES orders(id) ON DELETE CASCADE,
  order_part_id   UUID REFERENCES order_parts(id) ON DELETE CASCADE,
  stage_id        SMALLINT REFERENCES stages(id),
  message         VARCHAR(500) NOT NULL,
  recipient_user_id UUID NOT NULL REFERENCES users(id),
  is_read         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id, is_read);
CREATE INDEX idx_notifications_order ON notifications(order_id);
COMMENT ON TABLE notifications IS 'Una fila por destinatario. Un mismo evento (ej: cuello de botella) genera N filas: una para el sector afectado + una para cada admin de Producción/Gerencia.';

-- ============================================================
-- CONFIGURACIÓN GENERAL (clave-valor, editable por Admin)
-- ============================================================
CREATE TABLE system_settings (
  key             VARCHAR(80) PRIMARY KEY,
  value           VARCHAR(255) NOT NULL,
  description     VARCHAR(255),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Seed inicial: ('bottleneck_threshold_days', '3', 'Días sin movimiento para disparar alerta de cuello de botella')
```

### 3.4 Reglas de negocio sobre los datos

1. **Una `order_part` solo puede tener un `part_stage_events` "abierto"** (sin `finished_at`) a la vez. Validado a nivel de servicio antes de insertar.
2. **Al dividir una parte**: se marca `is_split = true` y `current_stage_id = NULL` en la parte padre, y se crean N filas hijas con `parent_part_id` apuntando a ella, cada una arrancando en `status = 'PENDIENTE'`. La validación de cantidades depende del `split_mode`:
   - `LOTE`: separación por cantidad de prendas/lotes. La suma de `quantity` de las hijas activas nunca debe superar la `quantity` original del padre (validado en servicio).
   - `COMPONENTE`: separación temporal de partes físicas de la prenda antes de Confección, por ejemplo mangas a bordar, frente a estampar y resto en espera. La suma puede superar la `quantity` del padre porque cada hija representa componentes distintos de las mismas prendas, no prendas adicionales. Este modo solo se permite para preparar/ejecutar Bordado, Estampado y ramas en espera relacionadas con esas decoraciones; no se permite para Confección, Atraque, Ojal y Botón, Plancha ni Terminación.
3. **Reunificación de componentes**: toda división `COMPONENTE` debe reunificarse antes de iniciar Confección. La reunificación crea una nueva `order_part` hija del mismo padre original, con `quantity` igual a la cantidad de prendas reunificadas, `split_mode = 'LOTE'` o `NULL` según corresponda, `is_component_branch = false`, `status = 'PENDIENTE'` y lista para avanzar a Confección/Avíos según el flujo. Las ramas componentes reunificadas pasan a `status = 'REINTEGRADA'` y guardan `recombined_into_part_id`; desde ese momento no cuentan como hojas activas ni para Kanban ni para finalización de orden.
4. **`execution_type = 'EXTERNO'`** en `part_stage_events` obliga a `workshop_id` no nulo. Solo aplica a etapas con `stages.execution_type IN ('EXTERNO','AMBOS')` (Confección, Ojal y Botón, Plancha). **Atraque queda excluido**: su `stages.execution_type` es siempre `'INTERNO'`, nunca admite `workshop_id` propio (ver regla 10, más abajo).
5. **Etapas opcionales** (`stages.is_optional = true`): Atraque y Ojal y Botón pueden saltearse completamente para una parte si el artículo no las requiere; esto lo decide el usuario al momento de definir el flujo de la orden (ver §4).
6. **Cuello de botella**: se calcula por cron job (ver §6.6) sobre partes con `status = 'EN_PROCESO'` cuyo evento activo tiene `started_at` más antiguo que `system_settings.bottleneck_threshold_days`, **excluyendo** `stages.excluded_from_bottleneck_alerts = true` (Confección).
7. **Fecha estimada incumplida**: cron diario compara `estimated_finish_at < now()` en eventos sin `finished_at` y `overdue_notified = false`; dispara notificación y marca `overdue_notified = true` para no duplicar.
8. **Finalización de la Orden**: una `order` pasa a `status = 'FINALIZADA'` cuando **todas** sus `order_parts` hoja activas alcanzaron `status = 'FINALIZADA'` en la etapa Terminación. Para este cálculo se excluyen partes con `status IN ('DIVIDIDA','REINTEGRADA')`, ramas `COMPONENTE` ya reunificadas y cualquier parte apuntada por `recombined_into_part_id`. Esta lógica vive en el servicio al cerrar cada evento de Terminación, no en un trigger de base de datos.
9. **Avíos**: `part_supplies.completeness` es informativo; no bloquea el avance de etapa en el MVP (el usuario puede avanzar igual con avíos parciales, según lo definido por el negocio).
10. **Atraque nunca es una etapa tercerizada de forma independiente** (no tiene `workshop_id` propio; `stages.execution_type` para ATRAQUE es siempre `'INTERNO'`). Su ejecución depende exclusivamente de lo que pase en el evento de Confección de esa misma parte:
   - Si Confección fue `EXTERNO` y al finalizarla el usuario marca `includes_atraque = true` (el taller entregó la prenda ya atracada): el servicio **auto-genera** un `part_stage_events` de ATRAQUE para esa parte con `started_at = finished_at = now()`, `execution_type = 'INTERNO'`, `note = 'Incluido en Confección — Taller: <nombre>'`, `performed_by` = el mismo usuario que finalizó Confección. La parte avanza directo a la siguiente etapa (Ojal y Botón u otra según corresponda) sin que nadie del sector Atraque tenga que actuar.
   - Si Confección fue `EXTERNO` con `includes_atraque = false`, o si Confección fue `INTERNO`, y el artículo requiere atraque: la parte queda pendiente en la etapa ATRAQUE normalmente, y el sector Atraque interno la procesa con su propio `start`/`finish` como cualquier otra etapa interna.
   - Si el artículo no requiere atraque (etapa no aplicable, ver `order.applicable_stages` en §7.1 del flujo de creación de orden): se omite por completo, igual que con cualquier etapa opcional no aplicable.

---

## 4. Estructura de Carpetas

### 4.0 Raíz del monorepo

```
/
├── backend/
├── frontend/
├── docs/
├── docker-compose.yml              # PostgreSQL local para desarrollo
├── .env.example                    # variables compartidas/no sensibles si aplica
├── .gitignore
└── README.md                       # comandos generales: levantar local, testear, ramas
```

El monorepo es la estructura base del MVP porque las etapas suelen tocar backend, frontend, migraciones y documentación en conjunto. No implica crear paquetes compartidos desde el inicio; `backend/` y `frontend/` pueden mantener sus propios `package.json` hasta que haya una necesidad real de workspace.

### 4.1 Frontend (Next.js)

```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                 # Sidebar + Navbar autenticados
│   │   │   ├── page.tsx                   # Dashboard Kanban (home)
│   │   │   ├── ordenes/
│   │   │   │   ├── page.tsx               # Vista lista/tabla de órdenes
│   │   │   │   ├── nueva/page.tsx         # Crear orden
│   │   │   │   └── [orderId]/page.tsx     # Detalle de orden (con selector de etapa)
│   │   │   ├── notificaciones/page.tsx
│   │   │   └── admin/
│   │   │       ├── clientes/page.tsx
│   │   │       ├── clientes/nuevo/page.tsx
│   │   │       ├── talleres/page.tsx
│   │   │       ├── articulos/page.tsx
│   │   │       ├── articulos/nuevo/page.tsx
│   │   │       ├── usuarios/page.tsx
│   │   │       └── configuracion/page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar/{Navbar.tsx, Navbar.module.css}
│   │   │   ├── Sidebar/{Sidebar.tsx, Sidebar.module.css}
│   │   │   └── NotificationBell/{NotificationBell.tsx, NotificationBell.module.css}
│   │   ├── ordenes/
│   │   │   ├── OrderCard/{OrderCard.tsx, OrderCard.module.css}
│   │   │   ├── OrderForm/{OrderForm.tsx, OrderForm.module.css}
│   │   │   ├── PartTree/{PartTree.tsx, PartTree.module.css}          # árbol de partes
│   │   │   ├── PartSplitModal/{PartSplitModal.tsx, ...module.css}     # dividir una parte
│   │   │   ├── StageActionPanel/{StageActionPanel.tsx, ...}           # iniciar/finalizar etapa
│   │   │   ├── SupplyChecklist/{SupplyChecklist.tsx, ...}
│   │   │   └── StageSelector/{StageSelector.tsx, ...}                 # selector de qué etapa ver
│   │   ├── kanban/
│   │   │   ├── KanbanBoard/{KanbanBoard.tsx, ...}
│   │   │   └── KanbanColumn/{KanbanColumn.tsx, ...}
│   │   └── ui/
│   │       ├── Button/{Button.tsx, Button.module.css}
│   │       ├── Input/{Input.tsx, Input.module.css}
│   │       ├── Select/{Select.tsx, Select.module.css}
│   │       ├── Modal/{Modal.tsx, Modal.module.css}
│   │       ├── Badge/{Badge.tsx, Badge.module.css}                    # estado de orden/parte
│   │       └── Table/{Table.tsx, Table.module.css}
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts              # wrapper fetch con auth header
│   │   │   ├── orders.api.ts
│   │   │   ├── parts.api.ts
│   │   │   ├── clients.api.ts
│   │   │   ├── workshops.api.ts
│   │   │   ├── articles.api.ts
│   │   │   ├── users.api.ts
│   │   │   └── notifications.api.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useOrders.ts
│   │   │   └── useNotifications.ts
│   │   └── utils/
│   │       ├── dates.ts
│   │       └── roles.ts               # helpers de permisos por rol/sector
│   ├── types/
│   │   ├── order.types.ts
│   │   ├── part.types.ts
│   │   ├── user.types.ts
│   │   └── notification.types.ts
│   └── styles/
│       ├── globals.css
│       └── variables.css              # variables CSS: colores, spacing, breakpoints
├── next.config.js
├── tsconfig.json
└── package.json
```

### 4.2 Backend (NestJS)

```
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   ├── database.config.ts
│   │   └── env.validation.ts          # valida .env con class-validator al boot
│   ├── common/
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts         # valida ADMIN vs USER + sector
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts
│   │   │   └── current-user.decorator.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── logging.interceptor.ts
│   │   └── pipes/
│   │       └── validation.pipe.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/jwt.strategy.ts
│   │   │   └── dto/login.dto.ts
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── entities/user.entity.ts
│   │   │   └── dto/{create-user.dto.ts, update-user.dto.ts}
│   │   ├── clients/
│   │   │   └── ... (module, controller, service, entities/, dto/)
│   │   ├── workshops/
│   │   │   └── ...
│   │   ├── articles/
│   │   │   ├── ...
│   │   │   └── entities/{article.entity.ts, article-fabric.entity.ts, article-decoration-part.entity.ts}
│   │   ├── fabrics/
│   │   │   └── ...
│   │   ├── supplies/
│   │   │   └── ...
│   │   ├── size-curves/
│   │   │   └── entities/{size-curve.entity.ts, size-curve-value.entity.ts}
│   │   ├── stages/
│   │   │   └── ... (catálogo, solo lectura para users, ABM para admin)
│   │   ├── orders/
│   │   │   ├── orders.module.ts
│   │   │   ├── orders.controller.ts
│   │   │   ├── orders.service.ts
│   │   │   ├── entities/{order.entity.ts, order-requested-item.entity.ts}
│   │   │   └── dto/{create-order.dto.ts, update-order.dto.ts}
│   │   ├── order-parts/
│   │   │   ├── order-parts.module.ts
│   │   │   ├── order-parts.controller.ts
│   │   │   ├── order-parts.service.ts     # lógica de división del árbol, aquí vive lo más delicado
│   │   │   ├── entities/order-part.entity.ts
│   │   │   └── dto/{split-part.dto.ts, ...}
│   │   ├── stage-events/
│   │   │   ├── stage-events.module.ts
│   │   │   ├── stage-events.controller.ts
│   │   │   ├── stage-events.service.ts    # iniciar/finalizar etapa
│   │   │   ├── entities/part-stage-event.entity.ts
│   │   │   └── dto/{start-stage.dto.ts, finish-stage.dto.ts}
│   │   ├── part-supplies/
│   │   │   └── ...
│   │   ├── notifications/
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   ├── notifications.gateway.ts   # WebSocket gateway
│   │   │   └── entities/notification.entity.ts
│   │   ├── dashboard/
│   │   │   ├── dashboard.module.ts
│   │   │   ├── dashboard.controller.ts    # endpoints agregados para Kanban/lista
│   │   │   └── dashboard.service.ts
│   │   ├── scheduler/
│   │   │   ├── scheduler.module.ts
│   │   │   └── scheduler.service.ts       # cron: cuellos de botella + fechas vencidas
│   │   └── settings/
│   │       └── ... (system_settings)
│   └── database/
│       ├── migrations/
│       │   └── <timestamp>-InitSchema.ts
│       └── seeds/
│           ├── stages.seed.ts
│           ├── size-curves.seed.ts
│           └── admin-user.seed.ts
├── test/                              # tests e2e
├── ormconfig.ts
├── tsconfig.json
└── package.json
```

---

## 5. Entidades TypeORM y DTOs de ejemplo

### 5.1 `order-part.entity.ts` (la entidad más crítica del sistema)

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Stage } from '../../stages/entities/stage.entity';
import { Fabric } from '../../fabrics/entities/fabric.entity';
import { SizeCurveValue } from '../../size-curves/entities/size-curve-value.entity';
import { PartStageEvent } from '../../stage-events/entities/part-stage-event.entity';

export enum PartStatus {
  PENDIENTE = 'PENDIENTE',
  EN_PROCESO = 'EN_PROCESO',
  DIVIDIDA = 'DIVIDIDA',
  REINTEGRADA = 'REINTEGRADA',
  FINALIZADA = 'FINALIZADA',
}

export enum PartSplitMode {
  LOTE = 'LOTE',
  COMPONENTE = 'COMPONENTE',
}

@Entity('order_parts')
export class OrderPart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.parts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => OrderPart, (part) => part.children, { nullable: true })
  @JoinColumn({ name: 'parent_part_id' })
  parentPart: OrderPart | null;

  @Column({ name: 'parent_part_id', nullable: true })
  parentPartId: string | null;

  @OneToMany(() => OrderPart, (part) => part.parentPart)
  children: OrderPart[];

  @Column({ name: 'part_code', length: 20 })
  partCode: string;

  @ManyToOne(() => Fabric, { nullable: true })
  @JoinColumn({ name: 'fabric_id' })
  fabric: Fabric | null;

  @Column({ length: 80, nullable: true })
  color: string | null;

  @ManyToOne(() => SizeCurveValue, { nullable: true })
  @JoinColumn({ name: 'size_curve_value_id' })
  sizeCurveValue: SizeCurveValue | null;

  @Column('int')
  quantity: number;

  @Column({ type: 'enum', enum: PartStatus, default: PartStatus.PENDIENTE })
  status: PartStatus;

  @Column({ name: 'is_split', default: false })
  isSplit: boolean;

  @Column({ name: 'split_mode', type: 'enum', enum: PartSplitMode, nullable: true })
  splitMode: PartSplitMode | null;

  @Column({ name: 'is_component_branch', default: false })
  isComponentBranch: boolean;

  @ManyToOne(() => OrderPart, { nullable: true })
  @JoinColumn({ name: 'recombined_into_part_id' })
  recombinedIntoPart: OrderPart | null;

  @Column({ name: 'recombined_into_part_id', nullable: true })
  recombinedIntoPartId: string | null;

  @ManyToOne(() => Stage, { nullable: true })
  @JoinColumn({ name: 'current_stage_id' })
  currentStage: Stage | null;

  @Column({ name: 'split_reason', nullable: true })
  splitReason: string | null;

  @OneToMany(() => PartStageEvent, (event) => event.orderPart)
  stageEvents: PartStageEvent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### 5.2 DTO de ejemplo — dividir una parte

```typescript
// split-part.dto.ts
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { PartSplitMode } from '../entities/order-part.entity';

class NewSubPartDto {
  @IsInt()
  @Min(1)
  quantity: number;

  @IsUUID()
  @IsOptional()
  fabricId?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsUUID()
  @IsOptional()
  sizeCurveValueId?: string;

  @IsString()
  @IsOptional()
  splitReason?: string;
}

export class SplitPartDto {
  @IsEnum(PartSplitMode)
  splitMode: PartSplitMode; // LOTE | COMPONENTE

  @IsArray()
  @ArrayMinSize(2, { message: 'Una división debe generar al menos 2 sub-partes' })
  @ValidateNested({ each: true })
  @Type(() => NewSubPartDto)
  subParts: NewSubPartDto[];
}
```

**Validación de servicio para `SplitPartDto`:**
- Si `splitMode = LOTE`, la suma de `subParts.quantity` debe ser menor o igual a la cantidad del padre.
- Si `splitMode = COMPONENTE`, cada sub-parte debe describir el componente en `splitReason` (ej: "Mangas a bordar", "Frente a estampar", "Resto en espera"), puede repetir la cantidad del padre y queda marcada como `isComponentBranch = true`.
- No se puede iniciar Confección sobre una rama `COMPONENTE`; antes debe llamarse al endpoint de reunificación.

### 5.2.1 DTO de ejemplo — reunificar componentes

```typescript
// recombine-parts.dto.ts
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class RecombinePartsDto {
  @IsArray()
  @ArrayMinSize(2, { message: 'La reunificación requiere al menos 2 ramas componente' })
  @IsUUID('4', { each: true })
  componentPartIds: string[];

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  note?: string;
}
```

### 5.3 DTO de ejemplo — iniciar etapa

```typescript
// start-stage.dto.ts
import { IsUUID, IsOptional, IsDateString, IsEnum, IsString } from 'class-validator';
import { StageExecutionType } from '../../stages/entities/stage.entity';

export class StartStageDto {
  @IsUUID()
  orderPartId: string;

  @IsEnum(StageExecutionType)
  executionType: StageExecutionType; // INTERNO | EXTERNO

  @IsUUID()
  @IsOptional()
  workshopId?: string; // obligatorio si executionType = EXTERNO (validado en servicio)

  @IsDateString()
  @IsOptional()
  estimatedFinishAt?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
```

### 5.4 Módulo NestJS de ejemplo

```typescript
// order-parts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderPart } from './entities/order-part.entity';
import { OrderPartsController } from './order-parts.controller';
import { OrderPartsService } from './order-parts.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([OrderPart]), NotificationsModule],
  controllers: [OrderPartsController],
  providers: [OrderPartsService],
  exports: [OrderPartsService],
})
export class OrderPartsModule {}
```

### 5.5 Guard de roles de ejemplo

```typescript
// roles.guard.ts
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../modules/users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('No tenés permisos para esta acción');
    }
    return true;
  }
}
```

---

## 6. API Endpoints

> Convención: base URL `/api/v1`. Auth vía `Authorization: Bearer <jwt>`. `Admin` = rol ADMIN. `Sector propio` = USER cuyo `stage_id` coincide con la etapa del recurso.

### 6.1 Auth

| Método | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/login` | No | `{ email, password }` | `{ accessToken, user }` |
| GET | `/auth/me` | Sí | — | `User` |

### 6.2 Clientes

| Método | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/clients` | Sí | query: `?search=&active=` | `Client[]` |
| GET | `/clients/:id` | Sí | — | `Client` con `contacts[]` |
| POST | `/clients` | Admin o permiso `ADMINISTRAR` maestro | `CreateClientDto` con razón social, CUIT/CUIL, dirección/localidad/partido/provincia y `contacts[]` | `Client` |
| PATCH | `/clients/:id` | Admin o permiso `EDITAR` maestro | `UpdateClientDto` | `Client` |
| DELETE | `/clients/:id` | Admin o permiso `ELIMINAR` maestro | — | `204` (soft delete: `is_active=false`) |

### 6.3 Talleres externos

| Método | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/workshops` | Sí | `?search=&specialty=CONFECCION` | `Workshop[]` |
| GET | `/workshops/:id` | Sí | — | `Workshop` con `contacts[]` |
| POST | `/workshops` | Admin o permiso `ADMINISTRAR` maestro | `CreateWorkshopDto` con dirección, localidad, partido, provincia, especialidades y `contacts[]` | `Workshop` |
| PATCH | `/workshops/:id` | Admin o permiso `EDITAR` maestro | `UpdateWorkshopDto` | `Workshop` |
| DELETE | `/workshops/:id` | Admin o permiso `ELIMINAR` maestro | — | `204` |

### 6.4 Telas, avíos, curvas y artículos

| Método | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/fabrics` | Sí | `?search=&weaveType=&formatType=&supplier=` | `Fabric[]` |
| GET | `/fabrics/:id` | Sí | — | `Fabric` |
| POST | `/fabrics` | Admin o permiso `ADMINISTRAR` maestro | `CreateFabricDto` con código/artículo, nombre, color, onzaje, proveedor, tipo punto/plano y abierto/tubular | `Fabric` |
| PATCH | `/fabrics/:id` | Admin o permiso `EDITAR` maestro | `UpdateFabricDto` | `Fabric` |
| DELETE | `/fabrics/:id` | Admin o permiso `ELIMINAR` maestro | — | `204` |
| GET | `/supplies` | Sí | `?search=&category=&supplier=` | `Supply[]` |
| GET | `/supplies/:id` | Sí | — | `Supply` |
| POST | `/supplies` | Admin o permiso `ADMINISTRAR` maestro | `CreateSupplyDto` con código/artículo, nombre, descripción, color, proveedor y categoría confección/terminación | `Supply` |
| PATCH | `/supplies/:id` | Admin o permiso `EDITAR` maestro | `UpdateSupplyDto` | `Supply` |
| DELETE | `/supplies/:id` | Admin o permiso `ELIMINAR` maestro | — | `204` |
| GET | `/size-curves` | Sí | `?search=&sequenceType=` | `SizeCurve[]` con values |
| GET | `/size-curves/:id` | Sí | — | `SizeCurve` con values |
| POST | `/size-curves` | Admin o permiso `ADMINISTRAR` maestro | `CreateSizeCurveDto` con secuencia `ALFABETICA`, `NUMERICA`, `DOBLE` o `MIXTA` y valores ordenados | `SizeCurve` |
| PATCH | `/size-curves/:id` | Admin o permiso `EDITAR` maestro | `UpdateSizeCurveDto` | `SizeCurve` |
| DELETE | `/size-curves/:id` | Admin o permiso `ELIMINAR` maestro | — | `204` |
| GET | `/articles` | Sí | `?search=` | `Article[]` |
| GET | `/articles/:id` | Sí | — | `Article` con `supplies[]` y `decorationParts[]` |
| POST | `/articles` | Admin o permiso `ADMINISTRAR` maestro | `CreateArticleDto` con código, nombre, descripción, avíos y partes bordado/estampado | `Article` |
| PATCH | `/articles/:id` | Admin o permiso `EDITAR` maestro | `UpdateArticleDto` | `Article` |
| DELETE | `/articles/:id` | Admin o permiso `ELIMINAR` maestro | — | `204` |

### 6.5 Usuarios y permisos

| Método | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/users` | Admin o permiso `ADMINISTRAR` usuarios | `?search=&active=` | `User[]` con permisos |
| GET | `/users/:id` | Admin o permiso `ADMINISTRAR` usuarios | — | `User` con permisos |
| POST | `/users` | Admin o permiso `ADMINISTRAR` usuarios | `CreateUserDto` con email, nombre, contraseña, rol base y `permissions[]` | `User` |
| PATCH | `/users/:id` | Admin o permiso `EDITAR` usuarios | `UpdateUserDto` | `User` |
| DELETE | `/users/:id` | Admin o permiso `ELIMINAR` usuarios | — | `204` (soft delete) |
| PUT | `/users/:id/permissions` | Admin o permiso `ADMINISTRAR` usuarios | `{ permissions: [{ sectorCode, action, isAllowed }] }` | `User` con permisos actualizados |

### 6.6 Etapas (catálogo)

| Método | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/stages` | Sí | — | `Stage[]` |
| PATCH | `/stages/:id` | Admin | `UpdateStageDto` | `Stage` (ej: activar/desactivar como opcional) |

### 6.7 Órdenes

| Método | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/orders` | Sí | `?status=&clientId=&articleId=&fabricId=&stageId=&search=` | `Order[]` (paginado y filtrado por permisos) |
| GET | `/orders/:id` | Sí | — | `Order` completo con cliente, artículo, tela, curva, cantidades, avíos y árbol de `parts` |
| POST | `/orders` | Permiso `CREAR` orden o Admin | `CreateOrderDto` con `clientId`, `articleId`, `fabricId`, `sizeCurveId`, cantidades por valor de curva y taller/ubicación inicial opcional | `Order` (crea orden + parte raíz PENDIENTE + `order_requested_items` + checklist de avíos desde el artículo) |
| PATCH | `/orders/:id` | Permiso `EDITAR` orden o Admin | `UpdateOrderDto` | `Order` |
| POST | `/orders/:id/repair` | Sí (sector que detecta) / Admin | `{ note: string }` | `Order` (status → EN_ARREGLO) |
| POST | `/orders/:id/repair/resolve` | Admin | — | `Order` (status → ACTIVA) |
| DELETE | `/orders/:id` | Permiso `ELIMINAR` orden o Admin | — | `204` (soft: status CANCELADA) |

### 6.8 Partes de orden

| Método | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/order-parts/:id` | Sí | — | `OrderPart` con historial de eventos |
| GET | `/orders/:orderId/parts` | Sí | `?stageId=` (filtro para "seleccionar etapa a ver") | `OrderPart[]` |
| POST | `/order-parts/:id/split` | Sí (sector dueño de la etapa actual) / Admin | `SplitPartDto` | `OrderPart[]` (las nuevas sub-partes) |
| POST | `/order-parts/recombine` | Sí (Corte/Bordado/Estampado/Avíos según etapa de las ramas) / Admin | `RecombinePartsDto` | `OrderPart` (nueva parte reunificada lista para Confección/Avíos según flujo) |
| GET | `/order-parts/:id/supplies` | Sí | — | `PartSupply[]` |
| PATCH | `/order-parts/:id/supplies/:supplyId` | Sí (sector Avíos) / Admin | `{ completeness, quantityAvailable, note }` | `PartSupply` |

### 6.9 Eventos de etapa (acción central: iniciar/finalizar)

| Método | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/order-parts/:id/stage-events/start` | Sí (sector dueño) / Admin | `StartStageDto` | `PartStageEvent` (part.status → EN_PROCESO) |
| POST | `/order-parts/:id/stage-events/finish` | Sí (sector dueño) / Admin | `FinishStageDto { note?, actualFinishAt?, includesAtraque? }` | `PartStageEvent` (avanza a status según flujo). `includesAtraque` solo es válido/relevante si el evento que se cierra es CONFECCION con `execution_type=EXTERNO`; si es `true`, la respuesta incluye también el `PartStageEvent` de ATRAQUE auto-generado (ver PRD §3.4-10) |
| PATCH | `/stage-events/:id` | Admin | `{ note?, estimatedFinishAt? }` | `PartStageEvent` (corrección manual) |

**Regla de negocio del endpoint `finish`**: si es la última etapa del flujo (Terminación), marca `order_part.status = FINALIZADA`; el servicio revisa si con esto se completa el árbol completo de la orden y, de ser así, marca `order.status = FINALIZADA` y dispara notificación `FINALIZACION_ORDEN`.

### 6.10 Notificaciones

| Método | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/notifications` | Sí | `?unreadOnly=true` | `Notification[]` (solo las propias) |
| PATCH | `/notifications/:id/read` | Sí | — | `Notification` |
| PATCH | `/notifications/read-all` | Sí | — | `204` |
| WS | `/ws/notifications` | Sí (JWT en handshake) | — | evento `new_notification` |

### 6.11 Dashboard

| Método | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/dashboard/kanban` | Sí | `?stageId=` | `{ stages: [{ stage, parts: OrderPart[] }] }` |
| GET | `/dashboard/summary` | Sí | — | `{ activeOrders, inRepair, bottlenecks, overdue }` |

### 6.12 Configuración

| Método | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/settings` | Admin | — | `SystemSetting[]` |
| PATCH | `/settings/:key` | Admin | `{ value }` | `SystemSetting` |

---

## 7. Flujos de Usuario

### 7.1 Flujo completo de una orden (feliz camino simplificado)

```
[Admin/Corte] Crea Orden
   → cliente, artículo, telas/colores, talles y cantidades pedidas (order_requested_items)
   → se crea automáticamente 1 order_part raíz con status=PENDIENTE,
     quantity = suma total pedida, sin talle/color único (representa "todo lo pedido")

[Corte] Chequea materiales
   → si están completos: puede iniciar etapa CORTE sobre toda la parte raíz
   → si están parciales: primero DIVIDE la parte raíz en sub-partes
     (ej: "S+M con tela disponible" vs "L+XL en espera"), y solo inicia
     CORTE sobre la sub-parte que tiene material

[Corte] Inicia etapa CORTE sobre una parte → POST stage-events/start
[Corte] Finaliza etapa CORTE → POST stage-events/finish
   → la parte queda con status=PENDIENTE (terminó Corte, aún no entra a la siguiente)

[Corte o Bordado] Divide la parte según necesidad
   → ej: separa "mangas a bordar" de "resto sin bordado"
   → si separa cantidades de prendas, usa splitMode=LOTE
   → si separa componentes de las mismas prendas, usa splitMode=COMPONENTE
     (ej: mangas a bordar + frente a estampar + resto en espera);
     estas ramas pueden repetir la quantity original porque no son prendas duplicadas
   → POST /order-parts/:id/split → nacen N sub-partes hijas

[Bordado] Inicia y finaliza etapa BORDADO sobre su sub-parte
[Estampado] Inicia y finaliza etapa ESTAMPADO sobre su sub-parte, si aplica
[Avíos] En paralelo, marca completeness de part_supplies para
        cualquier sub-parte (no depende de en qué etapa esté)

[Corte/Bordado/Estampado/Avíos] Reunifica componentes decorativos
   → cuando mangas/frentes/resto están listos para volver a ser una prenda completa
   → POST /order-parts/recombine con las ramas COMPONENTE
   → el sistema crea una nueva parte activa con la cantidad de prendas reunificadas
   → las ramas componente quedan REINTEGRADA y ya no cuentan como hojas activas

[Confección] Inicia etapa CONFECCION
   → elige executionType: INTERNO o EXTERNO
   → si EXTERNO: selecciona workshopId
   → no puede iniciar sobre una rama COMPONENTE no reunificada
   → puede volver a dividir si decide mandar una porción a un taller
     y otra a otro, o mandar solo lo que tiene avíos completos

[Confección] Finaliza cuando la parte completa fue recibida
   → si el taller entrega parcial, primero se hace un split de la
     parte "en taller" separando "lo recibido" de "lo que sigue en taller",
     y se finaliza el evento solo sobre la porción recibida
   → si fue EXTERNO, se indica includesAtraque=true/false: si el taller
     ya entregó la prenda atracada, el sistema auto-cierra la etapa
     ATRAQUE para esa parte sin que nadie más tenga que operarla

[Atraque] (opcional, según artículo; SOLO interno, nunca se le asigna
   taller propio — si no vino resuelto desde Confección externa,
   lo hace el sector Atraque interno) idem patrón de start/finish interno
[Ojal y Botón] (opcional, tercerizable con su propio taller) idem, con avíos de terminación
[Plancha] idem, tercerizable
[Terminación] Inicia y finaliza → order_part.status = FINALIZADA

[Sistema] Al finalizar la última parte hoja de la orden
   → order.status = FINALIZADA, finalized_at = now()
   → notificación FINALIZACION_ORDEN a Producción/Gerencia
```

### 7.2 Flujo: marcar una orden en "Arreglo"

```
Cualquier sector detecta un problema en piezas ya avanzadas
   → POST /orders/:id/repair { note }
   → order.status = EN_ARREGLO, repair_note = nota
   → notificación ORDEN_EN_ARREGLO a Producción/Gerencia
   → las partes individuales SIGUEN operando con normalidad
     (el estado de Arreglo es a nivel de alerta/orden, no bloquea partes)
Cuando se resuelve:
   → Admin ejecuta POST /orders/:id/repair/resolve
   → order.status vuelve a ACTIVA
```

### 7.3 Flujo: notificación de cuello de botella (cron job)

```
Cron corre 1 vez por día (configurable) →
  para cada order_part con status=EN_PROCESO:
    evento_activo = último part_stage_event sin finished_at
    si stage.excluded_from_bottleneck_alerts = false Y
       (now() - evento_activo.started_at) > bottleneck_threshold_days:
         crear notification CUELLO_DE_BOTELLA para:
           - el usuario responsable del sector actual
           - todos los usuarios ADMIN
```

### 7.4 Flujo: notificación de fecha estimada incumplida (cron job)

```
Cron corre 1 vez por día →
  para cada part_stage_event con finished_at IS NULL,
    estimated_finish_at IS NOT NULL, overdue_notified = false:
      si now() > estimated_finish_at:
        crear notification FECHA_ESTIMADA_INCUMPLIDA para:
          - el usuario responsable del sector actual
          - todos los usuarios ADMIN
        marcar overdue_notified = true
```

### 7.5 Manejo de errores y casos edge

| Caso | Comportamiento esperado |
|---|---|
| Se intenta iniciar una etapa sobre una parte que ya tiene un evento activo | `409 Conflict` — "Esta parte ya tiene una etapa en curso" |
| Se intenta finalizar una etapa sin evento activo | `409 Conflict` |
| Se intenta dividir una parte `LOTE` en cantidades que suman más que su `quantity` | `400 Bad Request` |
| Se intenta dividir una parte `COMPONENTE` sin describir qué representa cada rama | `400 Bad Request` |
| Se intenta iniciar Confección sobre una rama `COMPONENTE` no reunificada | `400 Bad Request` — "Primero reunificá los componentes de la prenda" |
| Se intenta reunificar ramas que no pertenecen al mismo padre/origen o mezclan cantidades incompatibles | `400 Bad Request` |
| Un usuario de sector intenta operar una etapa que no es la suya | `403 Forbidden` (excepto Admin) |
| Se intenta iniciar etapa EXTERNO sin `workshopId` | `400 Bad Request` |
| Se intenta finalizar Confección y el usuario indica que fue parcial | El frontend debe guiar primero al **split**, luego al finish sobre la sub-parte recibida (no se permite finish parcial directo por API para mantener consistencia de datos) |
| Se elimina (soft-delete) un cliente/taller/artículo con órdenes activas asociadas | Se permite igual (soft delete no rompe FK), pero deja de aparecer en selects de nuevas órdenes |
| Doble clic / doble submit en iniciar etapa | Debe ser idempotente a nivel de UI (deshabilitar botón tras click); a nivel de API el 409 ya cubre la carrera |

---

## 8. Seguridad

### 8.1 Autenticación
- JWT con `passport-jwt`. Login con email + password (`bcrypt`, cost factor 12).
- Token expira en 8h (turno laboral); refresh manual re-logueando (no se implementa refresh token en MVP).

### 8.2 Autorización
- Guard global `JwtAuthGuard` en todos los endpoints salvo `/auth/login`.
- Guard `RolesGuard` + decorator `@Roles('ADMIN')` para endpoints admin-only.
- Guard adicional `SectorOwnershipGuard` (custom) que compara `user.stageId` contra la etapa del recurso que se intenta modificar en endpoints de `stage-events` y `order-parts/split`, dejando pasar siempre a `ADMIN`.

### 8.3 Validación de datos
- Todo DTO de entrada usa `class-validator` con `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` global.
- Sanitización de strings libres (`note`, `repair_note`) para evitar inyección en futuras vistas HTML (aunque se renderizan como texto plano, no HTML).

### 8.4 CORS
- Backend configura `CORS_ORIGIN` estricto al dominio del frontend (no wildcard) en producción.

### 8.5 Variables de entorno
- Nunca commitear `.env`. Usar `.env.example` en el repo con claves vacías.
- `JWT_SECRET` generado con `openssl rand -hex 32`, distinto por ambiente.

### 8.6 Otros
- Logs de auditoría: cada `part_stage_events` y `order_parts.split` ya guarda `performed_by`/usuario responsable — no se requiere tabla de auditoría separada en MVP.
- Rate limiting básico en `/auth/login` (`@nestjs/throttler`) para evitar fuerza bruta.

---

## 9. Deployment

> El desarrollo del MVP se realiza primero de forma local. Frontend, backend y base de datos deben levantar y funcionar en la máquina de desarrollo antes de subir cada etapa a GitHub o desplegar en el VPS.

### 9.0 Desarrollo local y repositorio

- **Estructura recomendada**: monorepo con `backend/`, `frontend/`, `docs/` y `docker-compose.yml` local en la raíz del repo. Esta opción facilita cambios coordinados de DTOs, entidades, migraciones y UI en una misma etapa y un mismo PR.
- **Base local**: PostgreSQL 16 en Docker Compose, con volumen local descartable para desarrollo. Las migraciones deben correr contra esta base antes de cualquier deploy.
- **Frontend local**: Next.js en `http://localhost:3000`.
- **Backend local**: NestJS en `http://localhost:3001`, exponiendo `/api/v1`.
- **GitHub por etapas**: cada etapa cerrada se sube a GitHub en una rama nacida desde `develop`; luego se abre PR o se mergea a `develop` cuando pasan build, tests y verificación manual.

### 9.1 Infraestructura existente
El cliente ya cuenta con un **VPS Hostinger KVM2** con **Dokploy**, **n8n** y una **PostgreSQL** ya corriendo (usada por otra app de seguimiento de consultas).

**Punto de atención a validar en Etapa 0 del plan de implementación**: un KVM2 típico de Hostinger provee ~2 vCPU / 8GB RAM (verificar plan contratado exacto). Con n8n + Postgres + otra app ya corriendo, hay que confirmar RAM/CPU libres antes de sumar Backend NestJS + Frontend Next.js + esta nueva base. Recomendación: reservar una revisión de recursos (`docker stats`, `free -h`) como primer paso técnico, y si el margen es ajustado, evaluar:
  a) Usar la **misma instancia de Postgres** con una base de datos nueva (`produccion_textil`) en vez de levantar otro contenedor Postgres, o
  b) Ampliar el plan del VPS si el uso de RAM ya está por encima del 70% en promedio.

### 9.2 Despliegue con Dokploy
- **Backend**: se despliega como app Node (Dockerfile propio) apuntando a la base `produccion_textil` dentro del mismo Postgres existente (o uno nuevo si hace falta por 9.1).
- **Frontend**: se despliega como app Next.js (Dockerfile propio, `next build && next start`, o modo standalone).
- Ambos detrás del proxy reverso que ya maneja Dokploy (Traefik), con subdominios propios, ej: `produccion.tudominio.com` (front) y `api-produccion.tudominio.com` (back).

### 9.3 Dockerfiles de referencia

```dockerfile
# backend/Dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

```dockerfile
# frontend/Dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/next.config.js ./
EXPOSE 3000
CMD ["pnpm", "start"]
```

### 9.4 CI/CD básico
- Dokploy soporta deploy por webhook de GitHub — configurar 2 apps (front/back) con auto-deploy desde la rama de producción (`main` o la que se defina para deploy), precedido idealmente por un pipeline de GitHub Actions que corra lint + tests antes de permitir el merge desde `develop` (ver checklist de tests por etapa en §10).

### 9.5 Migraciones en producción
- Las migraciones de TypeORM se corren como paso explícito del deploy (`pnpm run migration:run`), **nunca automáticamente al bootear la app** en producción, para evitar condiciones de carrera si hay más de una instancia arrancando.

---

## 10. Checklist de Implementación

> Ver el documento **04-Plan-Implementacion.md** para el desglose granular en etapas chicas y testeables. Este checklist es el resumen de alto nivel por área.

### Backend
- [ ] Setup NestJS + TypeORM + conexión a Postgres
- [ ] Migraciones: todas las tablas del DDL (§3.3)
- [ ] Seeds: `stages`, `size_curves` base, usuario admin inicial
- [ ] Módulo Auth (JWT + guards)
- [ ] Módulos ABM: Clients (+contacts), Workshops (+contacts), Fabrics, Supplies, SizeCurves, Articles (+supplies +decoration parts), Users (+permissions), Stages, Settings
- [ ] Módulo Orders (crear orden + requested items + parte raíz)
- [ ] Módulo OrderParts (split `LOTE`, split `COMPONENTE`, reunificación de componentes, consulta de árbol)
- [ ] Módulo StageEvents (start/finish, con todas las reglas de negocio de §3.4)
- [ ] Módulo PartSupplies (checklist)
- [ ] Módulo Notifications (CRUD + WebSocket gateway)
- [ ] Módulo Scheduler (cron cuellos de botella + fechas vencidas)
- [ ] Módulo Dashboard (agregaciones para kanban/summary)
- [ ] Swagger documentado en todos los endpoints

### Frontend
- [ ] Setup Next.js + TypeScript + CSS Modules + variables.css
- [ ] Login + manejo de sesión (JWT en cookie httpOnly o localStorage según decisión de seguridad)
- [ ] Layout autenticado (Navbar + Sidebar + NotificationBell con WS)
- [ ] Pantallas ABM: Clientes, Talleres, Telas, Avíos, Curvas, Artículos, Usuarios/Permisos, Configuración
- [ ] Crear Orden (formulario con selects de tela/color/talles/etapas aplicables)
- [ ] Detalle de Orden: árbol de partes + selector de etapa a visualizar
- [ ] Acción: iniciar/finalizar etapa (con selección interno/externo + taller)
- [ ] Acción: dividir parte (modal de split)
- [ ] Checklist de avíos por parte
- [ ] Marcar/resolver "Arreglo"
- [ ] Dashboard Kanban
- [ ] Dashboard Lista/Tabla filtrable
- [ ] Pantalla de Notificaciones

### Database
- [ ] Docker Compose local con PostgreSQL 16 funcionando
- [ ] DDL completo aplicado vía migraciones (no SQL manual en prod)
- [ ] Índices verificados con `EXPLAIN ANALYZE` en queries de dashboard
- [ ] Backup automático configurado en el VPS (ej: `pg_dump` cron diario)

### Testing
- [ ] Unit tests de servicios críticos: `OrderPartsService.split`, `StageEventsService.start/finish`, `SchedulerService` (cuellos de botella, fechas vencidas)
- [ ] Tests e2e de flujo completo (crear orden → dividir → avanzar etapas → finalizar)
- [ ] Tests de guards de autorización (sector propio vs ajeno, admin vs user)

### Deployment
- [ ] Build local completo de frontend, backend y base con Docker Compose
- [ ] Verificación de recursos del VPS (§9.1)
- [ ] Dockerfiles funcionando en build local
- [ ] Apps configuradas en Dokploy con dominios propios
- [ ] Variables de entorno cargadas en Dokploy (nunca en el repo)
- [ ] Migraciones corridas en producción antes del primer deploy de la app
- [ ] Backup de base de datos verificado funcionando

---

## 11. Criterio de Finalización de Etapas (Testing)

**Regla general aplicable a TODAS las etapas del plan de implementación**: una etapa del plan solo se considera finalizada cuando:
1. El código compila sin errores (`tsc --noEmit` en ambos proyectos).
2. Los tests automatizados definidos para esa etapa **pasan en su totalidad** (`pnpm run test` y, si aplica, `pnpm run test:e2e`).
3. Existe evidencia manual de que la funcionalidad fue probada end-to-end (request real vía Swagger/Postman o interacción real en el navegador, no solo tests unitarios).
4. No quedan `TODO` ni código muerto relacionado a esa etapa.
5. Las migraciones nuevas corren limpio sobre una base vacía (`migration:run` desde cero) y son reversibles (`migration:revert` no rompe nada).

El detalle de tests específicos por etapa está en **04-Plan-Implementacion.md**, sección correspondiente a cada etapa.
