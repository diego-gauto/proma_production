import * as bcrypt from 'bcrypt';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedInitialAdminUser1724630400000 implements MigrationInterface {
  name = 'SeedInitialAdminUser1724630400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
    if (!initialPassword) {
      return;
    }

    const email = process.env.ADMIN_INITIAL_EMAIL ?? 'admin@proma.local';
    const fullName = process.env.ADMIN_INITIAL_FULL_NAME ?? 'Admin Proma';
    const passwordHash = await bcrypt.hash(initialPassword, 10);

    await queryRunner.query(
      `
        INSERT INTO users (full_name, email, password_hash, role)
        VALUES ($1, $2, $3, 'ADMIN')
        ON CONFLICT (email)
        DO UPDATE SET
          full_name = EXCLUDED.full_name,
          password_hash = EXCLUDED.password_hash,
          role = 'ADMIN',
          is_active = true,
          updated_at = now()
      `,
      [fullName, email, passwordHash],
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const email = process.env.ADMIN_INITIAL_EMAIL ?? 'admin@proma.local';
    await queryRunner.query('DELETE FROM users WHERE email = $1', [email]);
  }
}
