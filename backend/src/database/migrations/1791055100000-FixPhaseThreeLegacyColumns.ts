import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPhaseThreeLegacyColumns1791055100000 implements MigrationInterface {
  name = 'FixPhaseThreeLegacyColumns1791055100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE clients ALTER COLUMN name DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE supplies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE client_contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE workshop_contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE workshop_contacts DROP COLUMN IF EXISTS updated_at`);
    await queryRunner.query(`ALTER TABLE client_contacts DROP COLUMN IF EXISTS updated_at`);
    await queryRunner.query(`ALTER TABLE workshops DROP COLUMN IF EXISTS updated_at`);
    await queryRunner.query(`ALTER TABLE supplies DROP COLUMN IF EXISTS updated_at`);
    await queryRunner.query(`ALTER TABLE fabrics DROP COLUMN IF EXISTS updated_at`);
  }
}
