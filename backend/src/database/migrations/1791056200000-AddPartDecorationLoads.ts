import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartDecorationLoads1791056200000 implements MigrationInterface {
  name = 'AddPartDecorationLoads1791056200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS part_decoration_loads (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_part_id UUID NOT NULL REFERENCES order_parts(id) ON DELETE CASCADE,
        stage_event_id UUID NOT NULL REFERENCES part_stage_events(id) ON DELETE CASCADE,
        work_date DATE NOT NULL,
        note TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS part_decoration_load_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        decoration_load_id UUID NOT NULL REFERENCES part_decoration_loads(id) ON DELETE CASCADE,
        size_curve_value_id INT NOT NULL REFERENCES size_curve_values(id),
        quantity INT NOT NULL CHECK (quantity >= 0)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_part_decoration_loads_part ON part_decoration_loads(order_part_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_part_decoration_loads_event ON part_decoration_loads(stage_event_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_part_decoration_load_items_load ON part_decoration_load_items(decoration_load_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS part_decoration_load_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS part_decoration_loads`);
  }
}
