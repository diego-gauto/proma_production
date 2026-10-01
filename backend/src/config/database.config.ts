import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  autoLoadEntities: true,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false,
  migrationsRun: false,
  logging: process.env.NODE_ENV === 'development',
}));
