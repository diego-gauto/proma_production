import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEntityContactFields1791055700000 implements MigrationInterface {
  name = 'AddEntityContactFields1791055700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(150)`);
    await queryRunner.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS fixed_phone VARCHAR(50)`);
    await queryRunner.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS email VARCHAR(150)`);
    await queryRunner.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS fixed_phone VARCHAR(50)`);
    await queryRunner.query(`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS email VARCHAR(150)`);
    await queryRunner.query(`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS fixed_phone VARCHAR(50)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE workshops DROP COLUMN IF EXISTS fixed_phone`);
    await queryRunner.query(`ALTER TABLE workshops DROP COLUMN IF EXISTS email`);
    await queryRunner.query(`ALTER TABLE providers DROP COLUMN IF EXISTS fixed_phone`);
    await queryRunner.query(`ALTER TABLE providers DROP COLUMN IF EXISTS email`);
    await queryRunner.query(`ALTER TABLE clients DROP COLUMN IF EXISTS fixed_phone`);
    await queryRunner.query(`ALTER TABLE clients DROP COLUMN IF EXISTS email`);
  }
}
