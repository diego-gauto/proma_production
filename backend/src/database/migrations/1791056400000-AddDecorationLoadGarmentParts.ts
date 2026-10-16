import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDecorationLoadGarmentParts1791056400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE part_decoration_loads ADD COLUMN garment_part varchar(100), ADD COLUMN lot_code varchar(100)`);
    // Only unambiguous legacy loads can be attributed automatically.
    await queryRunner.query(`UPDATE part_decoration_loads l SET garment_part = d.garment_part
      FROM order_parts p, orders o, part_stage_events e, stages s,
      (SELECT article_id, decoration_type, MIN(garment_part) AS garment_part FROM article_decoration_parts
       GROUP BY article_id, decoration_type HAVING COUNT(DISTINCT garment_part) = 1) d
      WHERE l.order_part_id = p.id AND p.order_id = o.id AND l.stage_event_id = e.id
        AND e.stage_id = s.id AND d.article_id = o.article_id AND d.decoration_type = s.code::text`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE part_decoration_loads DROP COLUMN lot_code, DROP COLUMN garment_part`);
  }
}
