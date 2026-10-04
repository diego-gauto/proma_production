import dataSource from './src/database/data-source';
import { seedDemoData } from './src/database/seeds/demo.seed';

async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    await seedDemoData(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
