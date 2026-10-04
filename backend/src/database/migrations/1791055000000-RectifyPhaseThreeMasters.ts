import { MigrationInterface, QueryRunner } from 'typeorm';

export class RectifyPhaseThreeMasters1791055000000 implements MigrationInterface {
  name = 'RectifyPhaseThreeMasters1791055000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE size_sequence_type ADD VALUE IF NOT EXISTS 'MIXTA'`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE fabric_weave_type AS ENUM ('PUNTO', 'PLANO');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE fabric_format_type AS ENUM ('ABIERTO', 'TUBULAR');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE permission_action AS ENUM (
        'VER', 'CREAR', 'EDITAR', 'ELIMINAR', 'INICIAR_ETAPA',
        'FINALIZAR_ETAPA', 'FORZAR_CAMBIO', 'ADMINISTRAR'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`);

    await queryRunner.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_name VARCHAR(150)`);
    await queryRunner.query(`UPDATE clients SET business_name = name WHERE business_name IS NULL`);
    await queryRunner.query(`ALTER TABLE clients ALTER COLUMN business_name SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE clients ALTER COLUMN name DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS address VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS locality VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS district VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS province VARCHAR(100)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_clients_business_name ON clients(business_name)`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_contacts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        contact_name VARCHAR(150) NOT NULL,
        email VARCHAR(150),
        fixed_phone VARCHAR(50),
        mobile_phone_1 VARCHAR(50),
        mobile_phone_2 VARCHAR(50),
        role_note VARCHAR(120),
        is_primary BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON client_contacts(client_id)`);
    await queryRunner.query(`ALTER TABLE client_contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);

    await queryRunner.query(`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS locality VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS district VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS province VARCHAR(100)`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workshop_contacts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
        contact_name VARCHAR(150) NOT NULL,
        email VARCHAR(150),
        fixed_phone VARCHAR(50),
        mobile_phone_1 VARCHAR(50),
        mobile_phone_2 VARCHAR(50),
        role_note VARCHAR(120),
        is_primary BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_workshop_contacts_workshop ON workshop_contacts(workshop_id)`);
    await queryRunner.query(`ALTER TABLE workshop_contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);

    await queryRunner.query(`ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS code VARCHAR(80)`);
    await queryRunner.query(`UPDATE fabrics SET code = 'TELA-' || left(replace(id::text, '-', ''), 8) WHERE code IS NULL`);
    await queryRunner.query(`ALTER TABLE fabrics ALTER COLUMN code SET NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_fabrics_code ON fabrics(code)`);
    await queryRunner.query(`ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS weight_oz NUMERIC(6,2)`);
    await queryRunner.query(`ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS supplier VARCHAR(150)`);
    await queryRunner.query(`ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS weave_type fabric_weave_type NOT NULL DEFAULT 'PUNTO'`);
    await queryRunner.query(`ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS format_type fabric_format_type NOT NULL DEFAULT 'ABIERTO'`);

    await queryRunner.query(`ALTER TABLE supplies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE supplies ADD COLUMN IF NOT EXISTS code VARCHAR(80)`);
    await queryRunner.query(`UPDATE supplies SET code = 'AVIO-' || left(replace(id::text, '-', ''), 8) WHERE code IS NULL`);
    await queryRunner.query(`ALTER TABLE supplies ALTER COLUMN code SET NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_supplies_code ON supplies(code)`);
    await queryRunner.query(`ALTER TABLE supplies ADD COLUMN IF NOT EXISTS description TEXT`);
    await queryRunner.query(`ALTER TABLE supplies ADD COLUMN IF NOT EXISTS color VARCHAR(80)`);
    await queryRunner.query(`ALTER TABLE supplies ADD COLUMN IF NOT EXISTS supplier VARCHAR(150)`);

    await queryRunner.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS code VARCHAR(80)`);
    await queryRunner.query(`UPDATE articles SET code = 'ART-' || left(replace(id::text, '-', ''), 8) WHERE code IS NULL`);
    await queryRunner.query(`ALTER TABLE articles ALTER COLUMN code SET NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_code ON articles(code)`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS article_supplies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        supply_id UUID NOT NULL REFERENCES supplies(id),
        quantity NUMERIC(10,2),
        note VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_article_supplies_article ON article_supplies(article_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_article_supplies_supply ON article_supplies(supply_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sector_code sector_code,
        action permission_action NOT NULL,
        is_allowed BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_user_permissions_lookup ON user_permissions(user_id, action, sector_code)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS article_supplies`);
    await queryRunner.query(`DROP TABLE IF EXISTS workshop_contacts`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_contacts`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_articles_code`);
    await queryRunner.query(`ALTER TABLE articles DROP COLUMN IF EXISTS code`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_supplies_code`);
    await queryRunner.query(`ALTER TABLE supplies DROP COLUMN IF EXISTS supplier`);
    await queryRunner.query(`ALTER TABLE supplies DROP COLUMN IF EXISTS color`);
    await queryRunner.query(`ALTER TABLE supplies DROP COLUMN IF EXISTS description`);
    await queryRunner.query(`ALTER TABLE supplies DROP COLUMN IF EXISTS code`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_fabrics_code`);
    await queryRunner.query(`ALTER TABLE fabrics DROP COLUMN IF EXISTS format_type`);
    await queryRunner.query(`ALTER TABLE fabrics DROP COLUMN IF EXISTS weave_type`);
    await queryRunner.query(`ALTER TABLE fabrics DROP COLUMN IF EXISTS supplier`);
    await queryRunner.query(`ALTER TABLE fabrics DROP COLUMN IF EXISTS weight_oz`);
    await queryRunner.query(`ALTER TABLE fabrics DROP COLUMN IF EXISTS code`);
    await queryRunner.query(`ALTER TABLE workshops DROP COLUMN IF EXISTS province`);
    await queryRunner.query(`ALTER TABLE workshops DROP COLUMN IF EXISTS district`);
    await queryRunner.query(`ALTER TABLE workshops DROP COLUMN IF EXISTS locality`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_clients_business_name`);
    await queryRunner.query(`ALTER TABLE clients DROP COLUMN IF EXISTS province`);
    await queryRunner.query(`ALTER TABLE clients DROP COLUMN IF EXISTS district`);
    await queryRunner.query(`ALTER TABLE clients DROP COLUMN IF EXISTS locality`);
    await queryRunner.query(`ALTER TABLE clients DROP COLUMN IF EXISTS address`);
    await queryRunner.query(`ALTER TABLE clients DROP COLUMN IF EXISTS business_name`);

    await queryRunner.query(`DROP TYPE IF EXISTS permission_action`);
    await queryRunner.query(`DROP TYPE IF EXISTS fabric_format_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS fabric_weave_type`);
  }
}
