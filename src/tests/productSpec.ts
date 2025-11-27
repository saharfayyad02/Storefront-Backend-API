import { cleanupTestDatabase, setupTestDatabase } from './helpers/database.setup';
import client from '../database';
import { Product, ProductStore } from '../models/ProductModule';

const store = new ProductStore();

describe('Product Model', () => {
  const testProduct: Product = {
    name: 'Test Product',
    price: 29.99,
    category: 'electronics'
  };

  let createdProductId: number;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
   // await client.end();
  });

  beforeEach(async () => {
    const conn = await client.connect();
    await conn.query('DELETE FROM order_products');
    await conn.query('DELETE FROM orders');
    await conn.query('DELETE FROM products');
    conn.release();
  });

  describe('create method', () => {
    it('should create a new product', async () => {
      const result = await store.create(testProduct);
      
      expect(result.name).toBe(testProduct.name);
      expect(result.price).toBe(testProduct.price);
      expect(result.category).toBe(testProduct.category);
      expect(result.id).toBeDefined();
      
      createdProductId = result.id as number;
    });

    it('should create product with all required fields', async () => {
      const result = await store.create(testProduct);
      
      expect(result.name).toBeDefined();
      expect(result.price).toBeDefined();
      expect(result.category).toBeDefined();
    });
  });

  describe('index method', () => {
    beforeEach(async () => {
      await store.create({
        name: 'Product 1',
        price: 19.99,
        category: 'electronics'
      });
      await store.create({
        name: 'Product 2',
        price: 39.99,
        category: 'books'
      });
      await store.create({
        name: 'Product 3',
        price: 49.99,
        category: 'clothing'
      });
    });

    it('should return a list of all products', async () => {
      const result = await store.index();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });

    it('should return empty array when no products exist', async () => {
      const conn = await client.connect();
      await conn.query('DELETE FROM products');
      conn.release();

      const result = await store.index();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('show method', () => {
    beforeEach(async () => {
      const product = await store.create(testProduct);
      createdProductId = product.id as number;
    });

    it('should return a specific product by id', async () => {
      const result = await store.show(createdProductId);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(createdProductId);
      expect(result.name).toBe(testProduct.name);
      expect(result.price).toBe(testProduct.price);
      expect(result.category).toBe(testProduct.category);
    });

    it('should throw error for non-existent product', async () => {
    try {
      await store.show(99999);
      fail('Expected an error to be thrown');
    } catch (err: any) {
      expect(err.message).toBe('Product not found');
    }
  });
  });

  describe('productsByCategory method', () => {
    beforeEach(async () => {
      await store.create({
        name: 'Laptop',
        price: 999.99,
        category: 'electronics'
      });
      await store.create({
        name: 'Phone',
        price: 599.99,
        category: 'electronics'
      });
      await store.create({
        name: 'Book',
        price: 19.99,
        category: 'books'
      });
      await store.create({
        name: 'Shirt',
        price: 29.99,
        category: 'clothing'
      });
    });

    it('should return products in specific category', async () => {
      const result = await store.productsByCategory('electronics');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].category).toBe('electronics');
      expect(result[1].category).toBe('electronics');
    });

    it('should return empty array for category with no products', async () => {
      const result = await store.productsByCategory('nonexistent');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should be case-sensitive for category names', async () => {
      const result = await store.productsByCategory('ELECTRONICS');
      
      expect(result.length).toBe(0);
    });
  });

  describe('top5 method', () => {
    let userId: number;
    let product1Id: number;
    let product2Id: number;
    let product3Id: number;

    beforeEach(async () => {
      // Create user
      const conn = await client.connect();
      const userResult = await conn.query(
        'INSERT INTO users (first_name, last_name, password_digest) VALUES ($1, $2, $3) RETURNING *',
        ['Test', 'User', 'hash']
      );
      userId = userResult.rows[0].id;

      // Create products
      const p1 = await store.create({ name: 'Popular Product 1', price: 99.99, category: 'electronics' });
      const p2 = await store.create({ name: 'Popular Product 2', price: 79.99, category: 'electronics' });
      const p3 = await store.create({ name: 'Less Popular', price: 49.99, category: 'books' });
      
      product1Id = p1.id as number;
      product2Id = p2.id as number;
      product3Id = p3.id as number;

      // Create orders with different quantities
      // Product 1: 10 total quantity (most popular)
      for (let i = 0; i < 2; i++) {
        const orderResult = await conn.query(
          'INSERT INTO orders (user_id, status) VALUES ($1, $2) RETURNING *',
          [userId, 'complete']
        );
        await conn.query(
          'INSERT INTO order_products (order_id, product_id, quantity) VALUES ($1, $2, $3)',
          [orderResult.rows[0].id, product1Id, 5]
        );
      }

      // Product 2: 6 total quantity
      for (let i = 0; i < 3; i++) {
        const orderResult = await conn.query(
          'INSERT INTO orders (user_id, status) VALUES ($1, $2) RETURNING *',
          [userId, 'complete']
        );
        await conn.query(
          'INSERT INTO order_products (order_id, product_id, quantity) VALUES ($1, $2, $3)',
          [orderResult.rows[0].id, product2Id, 2]
        );
      }

      // Product 3: 2 total quantity (least popular)
      const orderResult = await conn.query(
        'INSERT INTO orders (user_id, status) VALUES ($1, $2) RETURNING *',
        [userId, 'complete']
      );
      await conn.query(
        'INSERT INTO order_products (order_id, product_id, quantity) VALUES ($1, $2, $3)',
        [orderResult.rows[0].id, product3Id, 2]
      );

      conn.release();
    });

    it('should return top 5 most popular products', async () => {
      const result = await store.top5();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should order products by popularity (quantity sold)', async () => {
      const result = await store.top5();
      
      expect(result.length).toBeGreaterThan(0);
      // First product should be the most popular
      expect(result[0].id).toBe(product1Id);
    });

    it('should return empty array when no orders exist', async () => {
      const conn = await client.connect();
     await conn.query('DELETE FROM order_products');
    await conn.query('DELETE FROM orders');
    await conn.query('DELETE FROM products');
    await conn.query('DELETE FROM users');
      conn.release();

      const result = await store.top5();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});