import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockAdjustments1791055600000 implements MigrationInterface {
  name = 'AddStockAdjustments1791055600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE fabric_rolls ADD COLUMN IF NOT EXISTS original_quantity NUMERIC(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE fabric_rolls ADD COLUMN IF NOT EXISTS current_quantity NUMERIC(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        fabric_roll_id UUID REFERENCES fabric_rolls(id) ON DELETE CASCADE,
        supply_id UUID REFERENCES supplies(id) ON DELETE CASCADE,
        quantity_delta NUMERIC(12,2) NOT NULL,
        reason VARCHAR(30) NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_stock_adjustment_target CHECK (
          (fabric_roll_id IS NOT NULL AND supply_id IS NULL) OR
          (fabric_roll_id IS NULL AND supply_id IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_stock_adjustments_fabric_roll ON stock_adjustments(fabric_roll_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_stock_adjustments_supply ON stock_adjustments(supply_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS stock_adjustments`);
    await queryRunner.query(`ALTER TABLE fabric_rolls DROP COLUMN IF EXISTS current_quantity`);
    await queryRunner.query(`ALTER TABLE fabric_rolls DROP COLUMN IF EXISTS original_quantity`);
  }
}
