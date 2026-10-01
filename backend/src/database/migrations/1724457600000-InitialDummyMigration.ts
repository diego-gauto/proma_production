import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class InitialDummyMigration1724457600000 implements MigrationInterface {
  name = 'InitialDummyMigration1724457600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'migration_smoke_test',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('migration_smoke_test', true);
  }
}
