import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartCutLoads1791056100000 implements MigrationInterface {
  name = 'AddPartCutLoads1791056100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS part_cut_loads (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_part_id UUID NOT NULL REFERENCES order_parts(id) ON DELETE CASCADE,
        stage_event_id UUID NOT NULL REFERENCES part_stage_events(id) ON DELETE CASCADE,
        lot_code VARCHAR(80) NOT NULL,
        fabric_roll_id UUID REFERENCES fabric_rolls(id),
        fabric_quantity NUMERIC(12,2),
        fabric_unit VARCHAR(12),
        note TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS part_cut_load_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cut_load_id UUID NOT NULL REFERENCES part_cut_loads(id) ON DELETE CASCADE,
        size_curve_value_id INT NOT NULL REFERENCES size_curve_values(id),
        quantity INT NOT NULL CHECK (quantity >= 0)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_part_cut_loads_part ON part_cut_loads(order_part_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_part_cut_load_items_load ON part_cut_load_items(cut_load_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS part_cut_load_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS part_cut_loads`);
  }
}
