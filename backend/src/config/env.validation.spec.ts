import 'reflect-metadata';
import { validate } from './env.validation';

describe('env validation', () => {
  it('coerces numeric environment values from strings', () => {
    const result = validate({
      DATABASE_URL:
        'postgresql://proma:proma_dev@localhost:55432/produccion_textil',
      JWT_SECRET: 'test-jwt-secret-with-enough-length',
      PORT: '3001',
      BOTTLENECK_THRESHOLD_DAYS: '3',
    });

    expect(result.PORT).toBe(3001);
    expect(result.BOTTLENECK_THRESHOLD_DAYS).toBe(3);
  });
});
