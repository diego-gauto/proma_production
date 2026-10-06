import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkshopSpecialtyDetail1791055400000 implements MigrationInterface {
  name = 'AddWorkshopSpecialtyDetail1791055400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS specialty_detail VARCHAR(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE workshops DROP COLUMN IF EXISTS specialty_detail`);
  }
}
