import { INestApplication, ValidationPipe } from '@nestjs/common';
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
import { NotificationType } from './../src/modules/notifications/entities/notification.enums';
import { UserRole } from './../src/modules/users/entities/user.enums';

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = 'Clave-Segura-123';
  const userEmail = `notificaciones-${suffix}@proma.test`;
  const otherEmail = `notificaciones-otro-${suffix}@proma.test`;
  let userId: string;
  let otherUserId: string;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    dataSource = app.get(DataSource);
    await dataSource.runMigrations();

    const users = await dataSource.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)
       RETURNING id, email`,
      [
        'Usuario Notificaciones', userEmail, await bcrypt.hash(password, 10), UserRole.USER,
        'Otro Usuario', otherEmail, await bcrypt.hash(password, 10), UserRole.USER,
      ],
    );
    userId = users.find((user: { email: string }) => user.email === userEmail).id as string;
    otherUserId = users.find((user: { email: string }) => user.email === otherEmail).id as string;

    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: userEmail, password }).expect(201);
    token = login.body.accessToken as string;
  });

  afterAll(async () => {
    await dataSource?.query('DELETE FROM notifications WHERE recipient_user_id IN ($1, $2)', [userId, otherUserId]);
    await dataSource?.query('DELETE FROM users WHERE email IN ($1, $2)', [userEmail, otherEmail]);
    await app?.close();
  });

  it('only lists notifications for the authenticated user', async () => {
    await dataSource.query(
      `INSERT INTO notifications (type, message, recipient_user_id)
       VALUES ($1, $2, $3), ($4, $5, $6)`,
      [NotificationType.INGRESO_ORDEN, `Propia ${suffix}`, userId, NotificationType.CUELLO_DE_BOTELLA, `Ajena ${suffix}`, otherUserId],
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.items).toEqual(expect.arrayContaining([expect.objectContaining({ message: `Propia ${suffix}` })]));
    expect(response.body.items).not.toEqual(expect.arrayContaining([expect.objectContaining({ message: `Ajena ${suffix}` })]));
    expect(response.body.unreadCount).toBeGreaterThanOrEqual(1);
  });

  it('marks a notification as read and persists it', async () => {
    const rows = await dataSource.query(
      `INSERT INTO notifications (type, message, recipient_user_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [NotificationType.ORDEN_EN_ARREGLO, `Leible ${suffix}`, userId],
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${rows[0].id}/read`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => expect(response.body.isRead).toBe(true));

    const saved = await dataSource.query('SELECT is_read FROM notifications WHERE id = $1', [rows[0].id]);
    expect(saved[0].is_read).toBe(true);
  });

  it('marks all own notifications as read without changing other users notifications', async () => {
    await dataSource.query(
      `INSERT INTO notifications (type, message, recipient_user_id)
       VALUES ($1, $2, $3), ($4, $5, $6)`,
      [NotificationType.INGRESO_ORDEN, `Todas propia ${suffix}`, userId, NotificationType.INGRESO_ORDEN, `Todas ajena ${suffix}`, otherUserId],
    );

    await request(app.getHttpServer())
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const unreadOwn = await dataSource.query(
      'SELECT count(*)::int AS count FROM notifications WHERE recipient_user_id = $1 AND is_read = false',
      [userId],
    );
    const unreadOther = await dataSource.query(
      'SELECT count(*)::int AS count FROM notifications WHERE recipient_user_id = $1 AND is_read = false',
      [otherUserId],
    );
    expect(unreadOwn[0].count).toBe(0);
    expect(unreadOther[0].count).toBeGreaterThan(0);
  });
});
