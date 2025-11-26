// src/tests/helpers/shutdown.ts
import client from '../../database';

afterAll(async () => {
  await client.end();
  console.log('Database connection pool closed');
});