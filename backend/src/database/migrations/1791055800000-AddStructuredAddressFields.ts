import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStructuredAddressFields1791055800000 implements MigrationInterface {
  name = 'AddStructuredAddressFields1791055800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_sector VARCHAR(120)`);
    await queryRunner.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS street VARCHAR(180)`);
    await queryRunner.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS street_number VARCHAR(30)`);
    await queryRunner.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS floor_apartment VARCHAR(60)`);
    await queryRunner.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS business_sector VARCHAR(120)`);
    await queryRunner.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS street VARCHAR(180)`);
    await queryRunner.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS street_number VARCHAR(30)`);
    await queryRunner.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS floor_apartment VARCHAR(60)`);
    await queryRunner.query(`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS street VARCHAR(180)`);
    await queryRunner.query(`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS street_number VARCHAR(30)`);
    await queryRunner.query(`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS floor_apartment VARCHAR(60)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE workshops DROP COLUMN IF EXISTS floor_apartment`);
    await queryRunner.query(`ALTER TABLE workshops DROP COLUMN IF EXISTS street_number`);
    await queryRunner.query(`ALTER TABLE workshops DROP COLUMN IF EXISTS street`);
    await queryRunner.query(`ALTER TABLE providers DROP COLUMN IF EXISTS floor_apartment`);
    await queryRunner.query(`ALTER TABLE providers DROP COLUMN IF EXISTS street_number`);
    await queryRunner.query(`ALTER TABLE providers DROP COLUMN IF EXISTS street`);
    await queryRunner.query(`ALTER TABLE providers DROP COLUMN IF EXISTS business_sector`);
    await queryRunner.query(`ALTER TABLE clients DROP COLUMN IF EXISTS floor_apartment`);
    await queryRunner.query(`ALTER TABLE clients DROP COLUMN IF EXISTS street_number`);
    await queryRunner.query(`ALTER TABLE clients DROP COLUMN IF EXISTS street`);
    await queryRunner.query(`ALTER TABLE clients DROP COLUMN IF EXISTS business_sector`);
  }
}
