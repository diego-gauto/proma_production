import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArticleDecorationDetails1791055900000 implements MigrationInterface {
  name = 'AddArticleDecorationDetails1791055900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE article_decoration_parts ADD COLUMN IF NOT EXISTS placement VARCHAR(120)`);
    await queryRunner.query(`ALTER TABLE article_decoration_parts ADD COLUMN IF NOT EXISTS decoration_code VARCHAR(80)`);
    await queryRunner.query(`ALTER TABLE article_decoration_parts ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
    await queryRunner.query(`ALTER TABLE article_decoration_parts ADD COLUMN IF NOT EXISTS notes VARCHAR(500)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE article_decoration_parts DROP COLUMN IF EXISTS notes`);
    await queryRunner.query(`ALTER TABLE article_decoration_parts DROP COLUMN IF EXISTS image_url`);
    await queryRunner.query(`ALTER TABLE article_decoration_parts DROP COLUMN IF EXISTS decoration_code`);
    await queryRunner.query(`ALTER TABLE article_decoration_parts DROP COLUMN IF EXISTS placement`);
  }
}
