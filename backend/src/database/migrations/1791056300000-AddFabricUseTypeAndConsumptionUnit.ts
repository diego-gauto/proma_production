import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFabricUseTypeAndConsumptionUnit1791056300000 implements MigrationInterface {
  name = 'AddFabricUseTypeAndConsumptionUnit1791056300000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE fabric_consumption_unit AS ENUM ('m', 'kg')`);
    await queryRunner.query(`CREATE TYPE order_fabric_use_type AS ENUM ('PRIMARIA', 'COMPLEMENTO')`);
    await queryRunner.query(`ALTER TABLE fabrics ADD COLUMN consumption_unit fabric_consumption_unit NOT NULL DEFAULT 'm'`);
    await queryRunner.query(`ALTER TABLE order_requested_items ADD COLUMN use_type order_fabric_use_type NOT NULL DEFAULT 'PRIMARIA'`);
    await queryRunner.query(`ALTER TABLE part_cut_loads ADD COLUMN fabric_use_type order_fabric_use_type NOT NULL DEFAULT 'PRIMARIA'`);
    await queryRunner.query(`UPDATE order_requested_items ori SET use_type = CASE WHEN ori.fabric_id IS NOT NULL AND ori.fabric_id = o.fabric_id THEN 'PRIMARIA'::order_fabric_use_type ELSE 'COMPLEMENTO'::order_fabric_use_type END FROM orders o WHERE o.id = ori.order_id`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE part_cut_loads DROP COLUMN IF EXISTS fabric_use_type`);
    await queryRunner.query(`ALTER TABLE order_requested_items DROP COLUMN IF EXISTS use_type`);
    await queryRunner.query(`ALTER TABLE fabrics DROP COLUMN IF EXISTS consumption_unit`);
    await queryRunner.query(`DROP TYPE IF EXISTS order_fabric_use_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS fabric_consumption_unit`);
  }
}
