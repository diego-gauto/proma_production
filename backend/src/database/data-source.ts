import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { InitialDummyMigration1724457600000 } from './migrations/1724457600000-InitialDummyMigration';
import { CreatePhaseOneDataModel1724544000000 } from './migrations/1724544000000-CreatePhaseOneDataModel';
import { SeedInitialAdminUser1724630400000 } from './migrations/1724630400000-SeedInitialAdminUser';
import { RectifyPhaseThreeMasters1791055000000 } from './migrations/1791055000000-RectifyPhaseThreeMasters';
import { FixPhaseThreeLegacyColumns1791055100000 } from './migrations/1791055100000-FixPhaseThreeLegacyColumns';

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
    RectifyPhaseThreeMasters1791055000000,
    FixPhaseThreeLegacyColumns1791055100000,
  ],
});
