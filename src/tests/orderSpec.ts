import supertest from 'supertest';
import app from '../server';
import { cleanupTestDatabase, setupTestDatabase } from './helpers/database.setup';
import client from '../database';
import { getAuthHeader } from './helpers/auth-helper';
import { OrderStore } from '../models/OrderModule';
import { ProductStore } from '../models/ProductModule';
import { UserStore } from '../models/userModule';


const request = supertest(app);
const orderStore = new OrderStore();
const productStore = new ProductStore();
const userStore = new UserStore();

describe('Order API Endpoints', () => {
  let testUserId: number;
  let testProductId: number;
  let testOrderId: number;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Create a test user
    const user = await userStore.create({
      first_name: 'TestUser',
      last_name: 'Test',
      password: 'testpass123'
    });
    testUserId = user.id as number;

    // Create a test product
    const product = await productStore.create({
      name: 'Test Product',
      price: 29.99,
      category: 'electronics'
    });
    testProductId = product.id as number;
  });

  afterAll(async () => {
     await cleanupTestDatabase();
  });

  beforeEach(async () => {
    const conn = await client.connect();
    await conn.query('DELETE FROM order_products');
    await conn.query('DELETE FROM orders');
    conn.release();
  });

  describe('POST /orders - Create Order', () => {
    it('should create an order with valid token', async () => {
      const response = await request
        .post('/orders')
        .set('Authorization', getAuthHeader(testUserId))
        .send({
          status: 'active'
        });

      expect(response.status).toBe(200);
      expect(response.body.user_id).toBe(testUserId);
      expect(response.body.status).toBe('active');
      expect(response.body.id).toBeDefined();

      testOrderId = response.body.id;
    });

    it('should default to active status if not provided', async () => {
      const response = await request
        .post('/orders')
        .set('Authorization', getAuthHeader(testUserId))
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('active');
    });

    it('should return 401 without token', async () => {
      const response = await request
        .post('/orders')
        .send({ status: 'active' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token required');
    });
  });

  describe('GET /orders/:id - Get Order By ID', () => {
    beforeEach(async () => {
      const order = await orderStore.create({
        user_id: testUserId,
        status: 'active'
      });
      testOrderId = order.id as number;
    });

    it('should return order with valid token', async () => {
      const response = await request
        .get(`/orders/${testOrderId}`)
        .set('Authorization', getAuthHeader(testUserId));

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testOrderId);
      expect(response.body.user_id).toBe(testUserId);
    });

    it('should return 401 without token', async () => {
      const response = await request.get(`/orders/${testOrderId}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token required');
    });
  });

  describe('POST /orders/:id/products - Add Product to Order', () => {
    beforeEach(async () => {
      const order = await orderStore.create({
        user_id: testUserId,
        status: 'active'
      });
      testOrderId = order.id as number;
    });

    it('should add product to order with valid token', async () => {
      const response = await request
        .post(`/orders/${testOrderId}/products`)
        .set('Authorization', getAuthHeader(testUserId))
        .send({
          product_id: testProductId,
          quantity: 2
        });

      expect(response.status).toBe(200);
      expect(response.body.order_id).toBe(testOrderId);
      expect(response.body.product_id).toBe(testProductId);
      expect(response.body.quantity).toBe(2);
    });

    it('should return 401 without token', async () => {
      const response = await request
        .post(`/orders/${testOrderId}/products`)
        .send({
          product_id: testProductId,
          quantity: 2
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token required');
    });

    it('should return 400 for invalid data', async () => {
      const response = await request
        .post(`/orders/${testOrderId}/products`)
        .set('Authorization', getAuthHeader(testUserId))
        .send({
          product_id: testProductId
          // missing quantity
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /orders/current/:user_id - Get Current Order', () => {
    beforeEach(async () => {
      await orderStore.create({
        user_id: testUserId,
        status: 'active'
      });
    });

    it('should return current active order', async () => {
      const response = await request
        .get(`/orders/current/${testUserId}`)
        .set('Authorization', getAuthHeader(testUserId));

      expect(response.status).toBe(200);
      expect(response.body.user_id).toBe(testUserId);
      expect(response.body.status).toBe('active');
    });

    it('should return 401 without token', async () => {
      const response = await request.get(`/orders/current/${testUserId}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token required');
    });
  });

  describe('GET /orders/completed/:user_id - Get Completed Orders', () => {
    beforeEach(async () => {
      await orderStore.create({
        user_id: testUserId,
        status: 'complete'
      });
      await orderStore.create({
        user_id: testUserId,
        status: 'complete'
      });
    });

    it('should return all completed orders', async () => {
      const response = await request
        .get(`/orders/completed/${testUserId}`)
        .set('Authorization', getAuthHeader(testUserId));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0].status).toBe('complete');
    });

    it('should return 401 without token', async () => {
      const response = await request.get(`/orders/completed/${testUserId}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token required');
    });
  });
});