import { config } from 'dotenv';
config({ path: ['.env.local', '.env'] });
import dataSource from './src/database/data-source';

async function main() {
  try {
    console.log('Initializing data source...');
    await dataSource.initialize();
    console.log('Data source initialized successfully.');
    console.log('Reverting last migration...');
    await dataSource.undoLastMigration();
    console.log('Last migration reverted successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error reverting migration:', error);
    process.exit(1);
  }
}

main();
