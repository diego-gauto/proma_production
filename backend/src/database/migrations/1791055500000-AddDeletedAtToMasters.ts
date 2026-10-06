import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToMasters1791055500000 implements MigrationInterface {
  name = 'AddDeletedAtToMasters1791055500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE supplies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE size_curves ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);

    await queryRunner.query(`UPDATE clients SET deleted_at = updated_at WHERE is_active = false AND deleted_at IS NULL`);
    await queryRunner.query(`UPDATE workshops SET deleted_at = updated_at WHERE is_active = false AND deleted_at IS NULL`);
    await queryRunner.query(`UPDATE fabrics SET deleted_at = updated_at WHERE is_active = false AND deleted_at IS NULL`);
    await queryRunner.query(`UPDATE supplies SET deleted_at = updated_at WHERE is_active = false AND deleted_at IS NULL`);
    await queryRunner.query(`UPDATE articles SET deleted_at = updated_at WHERE is_active = false AND deleted_at IS NULL`);
    await queryRunner.query(`UPDATE users SET deleted_at = updated_at WHERE is_active = false AND deleted_at IS NULL`);
    await queryRunner.query(`UPDATE providers SET deleted_at = updated_at WHERE is_active = false AND deleted_at IS NULL`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON clients(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_workshops_deleted_at ON workshops(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fabrics_deleted_at ON fabrics(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_supplies_deleted_at ON supplies(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_size_curves_deleted_at ON size_curves(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_articles_deleted_at ON articles(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_providers_deleted_at ON providers(deleted_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_providers_deleted_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_deleted_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_articles_deleted_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_size_curves_deleted_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_supplies_deleted_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_fabrics_deleted_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_workshops_deleted_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_clients_deleted_at`);

    await queryRunner.query(`ALTER TABLE providers DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE articles DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE size_curves DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE supplies DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE fabrics DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE workshops DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE clients DROP COLUMN IF EXISTS deleted_at`);
  }
}
