import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { InitialDummyMigration1724457600000 } from './migrations/1724457600000-InitialDummyMigration';
import { CreatePhaseOneDataModel1724544000000 } from './migrations/1724544000000-CreatePhaseOneDataModel';
import { SeedInitialAdminUser1724630400000 } from './migrations/1724630400000-SeedInitialAdminUser';

config({ path: ['.env.local', '.env'] });

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: ['src/**/*.entity.ts'],
  migrations: [
    InitialDummyMigration1724457600000,
    CreatePhaseOneDataModel1724544000000,
    SeedInitialAdminUser1724630400000,
  ],
});
