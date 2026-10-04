import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderCreationRelations1791055200000 implements MigrationInterface {
  name = 'AddOrderCreationRelations1791055200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS fabric_id UUID`);
    await queryRunner.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS size_curve_id INT`);
    await queryRunner.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS initial_workshop_id UUID`);
    await queryRunner.query(`DO $$ BEGIN
      ALTER TABLE orders ADD CONSTRAINT fk_orders_fabric FOREIGN KEY (fabric_id) REFERENCES fabrics(id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`);
    await queryRunner.query(`DO $$ BEGIN
      ALTER TABLE orders ADD CONSTRAINT fk_orders_size_curve FOREIGN KEY (size_curve_id) REFERENCES size_curves(id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`);
    await queryRunner.query(`DO $$ BEGIN
      ALTER TABLE orders ADD CONSTRAINT fk_orders_initial_workshop FOREIGN KEY (initial_workshop_id) REFERENCES workshops(id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_fabric ON orders(fabric_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_size_curve ON orders(size_curve_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_orders_size_curve`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_orders_fabric`);
    await queryRunner.query(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_initial_workshop`);
    await queryRunner.query(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_size_curve`);
    await queryRunner.query(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_fabric`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS initial_workshop_id`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS size_curve_id`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS fabric_id`);
  }
}
