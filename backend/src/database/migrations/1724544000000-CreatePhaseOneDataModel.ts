import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePhaseOneDataModel1724544000000 implements MigrationInterface {
  name = 'CreatePhaseOneDataModel1724544000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query('DROP TABLE IF EXISTS migration_smoke_test');

    await queryRunner.query(`CREATE TYPE user_role AS ENUM ('ADMIN', 'USER')`);
    await queryRunner.query(`
      CREATE TYPE sector_code AS ENUM (
        'CORTE', 'BORDADO', 'ESTAMPADO', 'AVIOS_CONFECCION', 'CONFECCION',
        'ATRAQUE', 'OJAL_BOTON', 'AVIOS_TERMINACION', 'PLANCHA', 'TERMINACION'
      )
    `);
    await queryRunner.query(
      `CREATE TYPE stage_execution_type AS ENUM ('INTERNO', 'EXTERNO', 'AMBOS')`,
    );
    await queryRunner.query(
      `CREATE TYPE size_sequence_type AS ENUM ('ALFABETICA', 'NUMERICA', 'DOBLE')`,
    );
    await queryRunner.query(
      `CREATE TYPE order_status AS ENUM ('ACTIVA', 'EN_ARREGLO', 'FINALIZADA', 'CANCELADA')`,
    );
    await queryRunner.query(`
      CREATE TYPE part_status AS ENUM (
        'PENDIENTE', 'EN_PROCESO', 'DIVIDIDA', 'REINTEGRADA', 'FINALIZADA'
      )
    `);
    await queryRunner.query(
      `CREATE TYPE part_split_mode AS ENUM ('LOTE', 'COMPONENTE')`,
    );
    await queryRunner.query(
      `CREATE TYPE supply_completeness AS ENUM ('COMPLETO', 'PARCIAL', 'FALTANTE')`,
    );
    await queryRunner.query(
      `CREATE TYPE supply_category AS ENUM ('CONFECCION', 'TERMINACION')`,
    );
    await queryRunner.query(`
      CREATE TYPE notification_type AS ENUM (
        'INGRESO_ORDEN', 'FINALIZACION_ORDEN', 'FECHA_ESTIMADA_INCUMPLIDA',
        'CUELLO_DE_BOTELLA', 'ORDEN_EN_ARREGLO'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE stages (
        id SMALLSERIAL PRIMARY KEY,
        code sector_code NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        sequence_order SMALLINT NOT NULL,
        is_optional BOOLEAN NOT NULL DEFAULT false,
        execution_type stage_execution_type NOT NULL DEFAULT 'INTERNO',
        excluded_from_bottleneck_alerts BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      COMMENT ON TABLE stages IS
      'Catálogo maestro de etapas del proceso productivo. Confección tiene excluded_from_bottleneck_alerts=true por regla de negocio.'
    `);

    await queryRunner.query(`
      CREATE TABLE size_curves (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        sequence_type size_sequence_type NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE size_curve_values (
        id SERIAL PRIMARY KEY,
        size_curve_id INT NOT NULL REFERENCES size_curves(id) ON DELETE CASCADE,
        label VARCHAR(20) NOT NULL,
        sort_order SMALLINT NOT NULL,
        UNIQUE(size_curve_id, label)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_size_curve_values_curve ON size_curve_values(size_curve_id)',
    );

    await queryRunner.query(`
      CREATE TABLE fabrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(150) NOT NULL,
        color VARCHAR(80),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query('CREATE INDEX idx_fabrics_name ON fabrics(name)');

    await queryRunner.query(`
      CREATE TABLE supplies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(150) NOT NULL,
        category supply_category NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_supplies_category ON supplies(category)',
    );

    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role user_role NOT NULL DEFAULT 'USER',
        stage_id SMALLINT REFERENCES stages(id),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_users_stage ON users(stage_id) WHERE is_active = true',
    );
    await queryRunner.query(`
      COMMENT ON COLUMN users.stage_id IS
      'Sector operativo del usuario. Obligatorio si role=USER, ignorado si role=ADMIN.'
    `);

    await queryRunner.query(`
      CREATE TABLE clients (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(150) NOT NULL,
        tax_id VARCHAR(30),
        contact_name VARCHAR(150),
        phone VARCHAR(50),
        email VARCHAR(150),
        notes TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query('CREATE INDEX idx_clients_name ON clients(name)');

    await queryRunner.query(`
      CREATE TABLE workshops (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(150) NOT NULL,
        contact_name VARCHAR(150),
        phone VARCHAR(50),
        email VARCHAR(150),
        address VARCHAR(255),
        specialties sector_code[] NOT NULL DEFAULT '{}',
        notes TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_workshops_active ON workshops(is_active)',
    );

    await queryRunner.query(`
      CREATE TABLE articles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(150) NOT NULL,
        description TEXT,
        size_curve_id INT REFERENCES size_curves(id),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query('CREATE INDEX idx_articles_name ON articles(name)');

    await queryRunner.query(`
      CREATE TABLE article_fabrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        fabric_id UUID NOT NULL REFERENCES fabrics(id),
        role VARCHAR(30) NOT NULL DEFAULT 'PRINCIPAL',
        garment_part VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_article_fabrics_article ON article_fabrics(article_id)',
    );

    await queryRunner.query(`
      CREATE TABLE article_decoration_parts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        garment_part VARCHAR(100) NOT NULL,
        decoration_type VARCHAR(30) NOT NULL
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_article_decoration_article ON article_decoration_parts(article_id)',
    );

    await queryRunner.query(`
      CREATE TABLE orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        internal_code VARCHAR(30) NOT NULL UNIQUE,
        external_code VARCHAR(50) NOT NULL,
        client_id UUID NOT NULL REFERENCES clients(id),
        article_id UUID NOT NULL REFERENCES articles(id),
        status order_status NOT NULL DEFAULT 'ACTIVA',
        repair_note TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        finalized_at TIMESTAMPTZ
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX idx_orders_external_code ON orders(external_code)',
    );
    await queryRunner.query('CREATE INDEX idx_orders_status ON orders(status)');
    await queryRunner.query(
      'CREATE INDEX idx_orders_client ON orders(client_id)',
    );
    await queryRunner.query(`
      COMMENT ON COLUMN orders.internal_code IS 'PK amigable autogenerada, formato OC-AAAA-NNNNNN'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN orders.external_code IS 'Número asignado manualmente, proveniente del sistema de órdenes ya existente'
    `);

    await queryRunner.query(`
      CREATE TABLE order_requested_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        fabric_id UUID REFERENCES fabrics(id),
        color VARCHAR(80),
        size_curve_value_id INT NOT NULL REFERENCES size_curve_values(id),
        quantity_requested INT NOT NULL CHECK (quantity_requested > 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_order_requested_items_order ON order_requested_items(order_id)',
    );

    await queryRunner.query(`
      CREATE TABLE order_parts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        parent_part_id UUID REFERENCES order_parts(id),
        part_code VARCHAR(20) NOT NULL,
        fabric_id UUID REFERENCES fabrics(id),
        color VARCHAR(80),
        size_curve_value_id INT REFERENCES size_curve_values(id),
        quantity INT NOT NULL CHECK (quantity > 0),
        status part_status NOT NULL DEFAULT 'PENDIENTE',
        is_split BOOLEAN NOT NULL DEFAULT false,
        split_mode part_split_mode,
        is_component_branch BOOLEAN NOT NULL DEFAULT false,
        recombined_into_part_id UUID REFERENCES order_parts(id),
        current_stage_id SMALLINT REFERENCES stages(id),
        split_reason VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_order_parts_order ON order_parts(order_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_order_parts_parent ON order_parts(parent_part_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_order_parts_status ON order_parts(status)',
    );
    await queryRunner.query(
      "CREATE INDEX idx_order_parts_current_stage ON order_parts(current_stage_id) WHERE status = 'EN_PROCESO'",
    );
    await queryRunner.query(
      'CREATE INDEX idx_order_parts_recombined_into ON order_parts(recombined_into_part_id)',
    );

    await queryRunner.query(`
      CREATE TABLE part_stage_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_part_id UUID NOT NULL REFERENCES order_parts(id) ON DELETE CASCADE,
        stage_id SMALLINT NOT NULL REFERENCES stages(id),
        execution_type stage_execution_type NOT NULL,
        workshop_id UUID REFERENCES workshops(id),
        started_at TIMESTAMPTZ,
        estimated_finish_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ,
        duration_days NUMERIC(6,2) GENERATED ALWAYS AS (
          CASE WHEN finished_at IS NOT NULL AND started_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (finished_at - started_at)) / 86400.0
          ELSE NULL END
        ) STORED,
        overdue_notified BOOLEAN NOT NULL DEFAULT false,
        includes_atraque BOOLEAN,
        note TEXT,
        performed_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_part_stage_events_part ON part_stage_events(order_part_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_part_stage_events_stage ON part_stage_events(stage_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_part_stage_events_active ON part_stage_events(order_part_id, stage_id) WHERE finished_at IS NULL',
    );

    await queryRunner.query(`
      CREATE TABLE part_supplies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_part_id UUID NOT NULL REFERENCES order_parts(id) ON DELETE CASCADE,
        supply_id UUID NOT NULL REFERENCES supplies(id),
        completeness supply_completeness NOT NULL DEFAULT 'FALTANTE',
        quantity_needed INT,
        quantity_available INT,
        note TEXT,
        updated_by UUID REFERENCES users(id),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_part_supplies_part ON part_supplies(order_part_id)',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX idx_part_supplies_unique ON part_supplies(order_part_id, supply_id)',
    );

    await queryRunner.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        type notification_type NOT NULL,
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        order_part_id UUID REFERENCES order_parts(id) ON DELETE CASCADE,
        stage_id SMALLINT REFERENCES stages(id),
        message VARCHAR(500) NOT NULL,
        recipient_user_id UUID NOT NULL REFERENCES users(id),
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id, is_read)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_notifications_order ON notifications(order_id)',
    );

    await queryRunner.query(`
      CREATE TABLE system_settings (
        key VARCHAR(80) PRIMARY KEY,
        value VARCHAR(255) NOT NULL,
        description VARCHAR(255),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      INSERT INTO stages (code, name, sequence_order, is_optional, execution_type, excluded_from_bottleneck_alerts)
      VALUES
        ('CORTE', 'Corte', 1, false, 'INTERNO', false),
        ('BORDADO', 'Bordado', 2, true, 'INTERNO', false),
        ('ESTAMPADO', 'Estampado', 3, true, 'INTERNO', false),
        ('AVIOS_CONFECCION', 'Avíos Confección', 4, false, 'INTERNO', false),
        ('CONFECCION', 'Confección', 5, false, 'AMBOS', true),
        ('ATRAQUE', 'Atraque', 6, true, 'INTERNO', false),
        ('OJAL_BOTON', 'Ojal y Botón', 7, true, 'AMBOS', false),
        ('AVIOS_TERMINACION', 'Avíos Terminación', 8, false, 'INTERNO', false),
        ('PLANCHA', 'Plancha', 9, false, 'AMBOS', false),
        ('TERMINACION', 'Terminación', 10, false, 'INTERNO', false)
    `);

    await queryRunner.query(`
      WITH inserted_curve AS (
        INSERT INTO size_curves (name, sequence_type)
        VALUES ('Alfabética Standard', 'ALFABETICA')
        RETURNING id
      )
      INSERT INTO size_curve_values (size_curve_id, label, sort_order)
      SELECT id, label, sort_order
      FROM inserted_curve
      CROSS JOIN (VALUES ('S', 1), ('M', 2), ('L', 3), ('XL', 4)) AS values(label, sort_order)
    `);
    await queryRunner.query(`
      WITH inserted_curve AS (
        INSERT INTO size_curves (name, sequence_type)
        VALUES ('Numérica 38-50', 'NUMERICA')
        RETURNING id
      )
      INSERT INTO size_curve_values (size_curve_id, label, sort_order)
      SELECT id, label, sort_order
      FROM inserted_curve
      CROSS JOIN (VALUES ('38', 1), ('40', 2), ('42', 3), ('44', 4), ('46', 5), ('48', 6), ('50', 7)) AS values(label, sort_order)
    `);

    await queryRunner.query(`
      INSERT INTO system_settings (key, value, description)
      VALUES ('bottleneck_threshold_days', '3', 'Días sin movimiento para disparar alerta de cuello de botella')
    `);

    const adminInitialPasswordHash = process.env.ADMIN_INITIAL_PASSWORD_HASH;
    if (adminInitialPasswordHash) {
      await queryRunner.query(
        `
          INSERT INTO users (full_name, email, password_hash, role)
          VALUES ($1, $2, $3, 'ADMIN')
        `,
        [
          process.env.ADMIN_INITIAL_FULL_NAME ?? 'Admin Proma',
          process.env.ADMIN_INITIAL_EMAIL ?? 'admin@proma.local',
          adminInitialPasswordHash,
        ],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS system_settings');
    await queryRunner.query('DROP TABLE IF EXISTS notifications');
    await queryRunner.query('DROP TABLE IF EXISTS part_supplies');
    await queryRunner.query('DROP TABLE IF EXISTS part_stage_events');
    await queryRunner.query('DROP TABLE IF EXISTS order_parts');
    await queryRunner.query('DROP TABLE IF EXISTS order_requested_items');
    await queryRunner.query('DROP TABLE IF EXISTS orders');
    await queryRunner.query('DROP TABLE IF EXISTS article_decoration_parts');
    await queryRunner.query('DROP TABLE IF EXISTS article_fabrics');
    await queryRunner.query('DROP TABLE IF EXISTS articles');
    await queryRunner.query('DROP TABLE IF EXISTS workshops');
    await queryRunner.query('DROP TABLE IF EXISTS clients');
    await queryRunner.query('DROP TABLE IF EXISTS users');
    await queryRunner.query('DROP TABLE IF EXISTS supplies');
    await queryRunner.query('DROP TABLE IF EXISTS fabrics');
    await queryRunner.query('DROP TABLE IF EXISTS size_curve_values');
    await queryRunner.query('DROP TABLE IF EXISTS size_curves');
    await queryRunner.query('DROP TABLE IF EXISTS stages');

    await queryRunner.query('DROP TYPE IF EXISTS notification_type');
    await queryRunner.query('DROP TYPE IF EXISTS supply_category');
    await queryRunner.query('DROP TYPE IF EXISTS supply_completeness');
    await queryRunner.query('DROP TYPE IF EXISTS part_split_mode');
    await queryRunner.query('DROP TYPE IF EXISTS part_status');
    await queryRunner.query('DROP TYPE IF EXISTS order_status');
    await queryRunner.query('DROP TYPE IF EXISTS size_sequence_type');
    await queryRunner.query('DROP TYPE IF EXISTS stage_execution_type');
    await queryRunner.query('DROP TYPE IF EXISTS sector_code');
    await queryRunner.query('DROP TYPE IF EXISTS user_role');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS migration_smoke_test (
        id integer PRIMARY KEY
      )
    `);
  }
}
