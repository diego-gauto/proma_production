import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConfectionAssignments1791056500000 implements MigrationInterface {
  name = 'CreateConfectionAssignments1791056500000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE confection_assignment_status AS ENUM ('SIN_ASIGNACION','ASIGNADO','EN_CONFECCION','TERMINADO')`);
    await queryRunner.query(`CREATE TABLE confection_assignments (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), order_part_id uuid NOT NULL REFERENCES order_parts(id) ON DELETE CASCADE, workshop_id uuid NOT NULL REFERENCES workshops(id), quantity integer NOT NULL, delivered_quantity integer NOT NULL DEFAULT 0, status confection_assignment_status NOT NULL DEFAULT 'ASIGNADO', assigned_by uuid NOT NULL REFERENCES users(id), assigned_at timestamptz NOT NULL, sent_at timestamptz NULL, finished_at timestamptz NULL, note text NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE UNIQUE INDEX ux_confection_assignment_active_part ON confection_assignments(order_part_id) WHERE status <> 'TERMINADO'`);
    await queryRunner.query(`CREATE TABLE confection_deliveries (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), assignment_id uuid NOT NULL REFERENCES confection_assignments(id) ON DELETE CASCADE, quantity integer NOT NULL, delivered_at timestamptz NOT NULL, note text NULL, registered_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now())`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE IF EXISTS confection_deliveries'); await queryRunner.query('DROP INDEX IF EXISTS ux_confection_assignment_active_part'); await queryRunner.query('DROP TABLE IF EXISTS confection_assignments'); await queryRunner.query('DROP TYPE IF EXISTS confection_assignment_status'); }
}
