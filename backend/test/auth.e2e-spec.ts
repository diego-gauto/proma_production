import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { DataSource } from 'typeorm';

process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://proma:proma_dev@localhost:55432/produccion_textil';
process.env.JWT_SECRET = 'test-jwt-secret-with-enough-length';
process.env.JWT_EXPIRES_IN = '8h';
process.env.CORS_ORIGIN = 'http://localhost:3000';

import { AppModule } from './../src/app.module';
import { UserRole } from './../src/modules/users/entities/user.enums';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const email = `auth-${Date.now()}@proma.test`;
  const password = 'Clave-Segura-123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.runMigrations();
    await dataSource.query(
      `
        INSERT INTO users (full_name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
      `,
      ['Admin Test', email, await bcrypt.hash(password, 10), UserRole.ADMIN],
    );
  });

  afterAll(async () => {
    await dataSource?.query('DELETE FROM users WHERE email = $1', [email]);
    await app?.close();
  });

  it('logs in with valid credentials and returns a JWT', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      email,
      fullName: 'Admin Test',
      role: UserRole.ADMIN,
    });
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('rejects invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'incorrecta' })
      .expect(401);
  });

  it('requires and accepts JWT for GET /auth/me', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(me.body).toMatchObject({
      email,
      fullName: 'Admin Test',
      role: UserRole.ADMIN,
    });
    expect(me.body.passwordHash).toBeUndefined();
  });
});
