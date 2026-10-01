import { config } from 'dotenv';
config();
import dataSource from './src/database/data-source';

async function main() {
  try {
    console.log('Initializing data source...');
    await dataSource.initialize();
    console.log('Data source initialized successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing data source:', error);
    process.exit(1);
  }
}
main();
