import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProvidersAndStockEntries1791055300000 implements MigrationInterface {
  name = 'AddProvidersAndStockEntries1791055300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS providers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_name VARCHAR(180) NOT NULL,
        tax_id VARCHAR(30),
        address VARCHAR(255),
        locality VARCHAR(120),
        district VARCHAR(120),
        province VARCHAR(120),
        notes TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_providers_business_name ON providers(business_name)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_providers_tax_id ON providers(tax_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS provider_contacts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
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
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_provider_contacts_provider ON provider_contacts(provider_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fabric_stock_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider_id UUID NOT NULL REFERENCES providers(id),
        fabric_id UUID NOT NULL REFERENCES fabrics(id),
        entry_date DATE NOT NULL,
        document_number VARCHAR(80),
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fabric_stock_entries_provider ON fabric_stock_entries(provider_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fabric_stock_entries_fabric ON fabric_stock_entries(fabric_id)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fabric_rolls (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        fabric_stock_entry_id UUID NOT NULL REFERENCES fabric_stock_entries(id) ON DELETE CASCADE,
        code VARCHAR(80) NOT NULL,
        lot VARCHAR(80) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(code)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fabric_rolls_entry ON fabric_rolls(fabric_stock_entry_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fabric_rolls_lot ON fabric_rolls(lot)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS supply_stock_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider_id UUID NOT NULL REFERENCES providers(id),
        supply_id UUID NOT NULL REFERENCES supplies(id),
        entry_date DATE NOT NULL,
        document_number VARCHAR(80),
        quantity NUMERIC(12,2) NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_supply_stock_entries_provider ON supply_stock_entries(provider_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_supply_stock_entries_supply ON supply_stock_entries(supply_id)`);

    await queryRunner.query(`ALTER TABLE fabrics DROP COLUMN IF EXISTS supplier`);
    await queryRunner.query(`ALTER TABLE supplies DROP COLUMN IF EXISTS supplier`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE supplies ADD COLUMN IF NOT EXISTS supplier VARCHAR(150)`);
    await queryRunner.query(`ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS supplier VARCHAR(150)`);
    await queryRunner.query(`DROP TABLE IF EXISTS supply_stock_entries`);
    await queryRunner.query(`DROP TABLE IF EXISTS fabric_rolls`);
    await queryRunner.query(`DROP TABLE IF EXISTS fabric_stock_entries`);
    await queryRunner.query(`DROP TABLE IF EXISTS provider_contacts`);
    await queryRunner.query(`DROP TABLE IF EXISTS providers`);
  }
}
