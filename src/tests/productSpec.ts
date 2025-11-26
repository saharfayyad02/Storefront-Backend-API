import supertest from 'supertest';
import app from '../server';
import { cleanupTestDatabase, setupTestDatabase } from './helpers/database.setup';
import client from '../database';
import { getAuthHeader } from './helpers/auth-helper';
import { ProductStore } from '../models/ProductModule';
import { UserStore } from '../models/userModule';

const request = supertest(app);
const productStore = new ProductStore();
const userStore = new UserStore();

describe('Product API Endpoints', () => {
  let testUserId: number;
  let testProductId: number;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Create a test user for authentication
    const user = await userStore.create({
      first_name: 'TestUser',
      last_name: 'Test',
      password: 'testpass123'
    });
    testUserId = user.id as number;
  });

  afterAll(async () => {
  await cleanupTestDatabase();
});

  beforeEach(async () => {
    const conn = await client.connect();
    await conn.query('DELETE FROM products');
    conn.release();
  });

  describe('POST /products - Create Product', () => {
    it('should create a product with valid token', async () => {
      const response = await request
        .post('/products')
        .set('Authorization', getAuthHeader(testUserId))
        .send({
          name: 'Test Product',
          price: 29.99,
          category: 'electronics'
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Test Product');
      expect(response.body.price).toBe(29.99);
      expect(response.body.category).toBe('electronics');
      expect(response.body.id).toBeDefined();

      testProductId = response.body.id;
    });

    it('should return 401 without token', async () => {
      const response = await request
        .post('/products')
        .send({
          name: 'Test Product',
          price: 29.99,
          category: 'electronics'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token required');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request
        .post('/products')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          name: 'Test Product',
          price: 29.99,
          category: 'electronics'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /products - Get All Products', () => {
    beforeEach(async () => {
      await productStore.create({
        name: 'Product 1',
        price: 19.99,
        category: 'electronics'
      });
      await productStore.create({
        name: 'Product 2',
        price: 39.99,
        category: 'books'
      });
    });

    it('should return all products', async () => {
      const response = await request.get('/products');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });

  describe('GET /products/:id - Get Product By ID', () => {
    beforeEach(async () => {
      const product = await productStore.create({
        name: 'Test Product',
        price: 29.99,
        category: 'electronics'
      });
      testProductId = product.id as number;
    });

    it('should return a specific product', async () => {
      const response = await request.get(`/products/${testProductId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testProductId);
      expect(response.body.name).toBe('Test Product');
      expect(response.body.price).toBe(29.99);
    });

    it('should return 400 for non-existent product', async () => {
      const response = await request.get('/products/9999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /products/category/:category - Get Products By Category', () => {
    beforeEach(async () => {
      await productStore.create({
        name: 'Laptop',
        price: 999.99,
        category: 'electronics'
      });
      await productStore.create({
        name: 'Phone',
        price: 599.99,
        category: 'electronics'
      });
      await productStore.create({
        name: 'Book',
        price: 19.99,
        category: 'books'
      });
    });

    it('should return products in a specific category', async () => {
      const response = await request.get('/products/category/electronics');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0].category).toBe('electronics');
    });

    it('should return empty array for category with no products', async () => {
      const response = await request.get('/products/category/nonexistent');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /products/top - Get Top 5 Popular Products', () => {
    it('should return top 5 popular products', async () => {
      // Create some products with orders (you'll need to implement this)
      const response = await request.get('/products/top');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});