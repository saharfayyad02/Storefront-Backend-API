// src/tests/helpers/database.setup.ts
import client from '../../database';

export async function setupTestDatabase(): Promise<void> {
  const conn = await client.connect();
  try {
    await conn.query(`
      DROP TABLE IF EXISTS order_products CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS products CASCADE;
      DROP TABLE IF EXISTS users CASCADE;

      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        password_digest TEXT NOT NULL
      );

      CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
        category VARCHAR(100)
      );

      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'complete')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE order_products (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL CHECK (quantity > 0)
      );
    `);
  } catch (err: any) {
    console.error('Database setup failed:', err);
    throw err;
  } finally {
    conn.release();
  }
}

export async function cleanupTestDatabase(): Promise<void> {
  const conn = await client.connect();
  try {
    await conn.query(`
      TRUNCATE TABLE order_products, orders, products, users RESTART IDENTITY CASCADE;
    `);
  } catch (err) {
    console.error('Cleanup failed:', err);
  } finally {
    conn.release();
  }
}