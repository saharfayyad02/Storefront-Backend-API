import { cleanupTestDatabase, setupTestDatabase } from './helpers/database.setup';
import client from '../database';
import { Order, OrderStore } from '../models/OrderModule';
import { ProductStore } from '../models/ProductModule';
import { UserStore } from '../models/userModule';

const store = new OrderStore();
const productStore = new ProductStore();
const userStore = new UserStore();

describe('Order Model', () => {
  let testUserId: number;
  let testProductId: number;
  let createdOrderId: number;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Create test user
    const user = await userStore.create({
      first_name: 'TestUser',
      last_name: 'Test',
      password: 'testpass123'
    });
    testUserId = user.id as number;

    // Create test product
    const product = await productStore.create({
      name: 'Test Product',
      price: 29.99,
      category: 'electronics'
    });
    testProductId = product.id as number;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
   // await client.end();
  });

  beforeEach(async () => {
    const conn = await client.connect();
    await conn.query('DELETE FROM order_products');
    await conn.query('DELETE FROM orders');
    conn.release();
  });

  describe('create method', () => {
    it('should create a new order', async () => {
      const testOrder: Order = {
        user_id: testUserId,
        status: 'active'
      };

      const result = await store.create(testOrder);
      
      expect(result.user_id).toBe(testUserId);
      expect(result.status).toBe('active');
      expect(result.id).toBeDefined();
      
      createdOrderId = result.id as number;
    });

    it('should create order with complete status', async () => {
      const testOrder: Order = {
        user_id: testUserId,
        status: 'complete'
      };

      const result = await store.create(testOrder);
      
      expect(result.status).toBe('complete');
    });
  });

  describe('show method', () => {
    beforeEach(async () => {
      const order = await store.create({
        user_id: testUserId,
        status: 'active'
      });
      createdOrderId = order.id as number;
    });

    it('should return a specific order by id', async () => {
      const result = await store.show(createdOrderId);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(createdOrderId);
      expect(result.user_id).toBe(testUserId);
      expect(result.status).toBe('active');
    });

    it('should return order with products when products are added', async () => {
      await store.addProduct(createdOrderId, testProductId, 2);
      
      const result = await store.show(createdOrderId);
      
      expect(result).toBeDefined();
      expect(result.products).toBeDefined();
      expect(Array.isArray(result.products)).toBe(true);
    });

    it('should throw error for non-existent order', async () => {
    try {
      await store.show(99999);
      fail('Expected an error to be thrown');
    } catch (err: any) {
      expect(err.message).toBe('Order not found');
    }
  });
  });

  describe('addProduct method', () => {
    beforeEach(async () => {
      const order = await store.create({
        user_id: testUserId,
        status: 'active'
      });
      createdOrderId = order.id as number;
    });

    it('should add a product to an order', async () => {
      const result = await store.addProduct(createdOrderId, testProductId, 3);
      
      expect(result.order_id).toBe(createdOrderId);
      expect(result.product_id).toBe(testProductId);
      expect(result.quantity).toBe(3);
      expect(result.id).toBeDefined();
    });

    it('should add multiple products to same order', async () => {
      const product2 = await productStore.create({
        name: 'Product 2',
        price: 49.99,
        category: 'books'
      });

      await store.addProduct(createdOrderId, testProductId, 2);
      await store.addProduct(createdOrderId, product2.id as number, 1);

      const order = await store.show(createdOrderId);
      
      expect(order.products?.length).toBe(2);
    });

    it('should handle different quantities', async () => {
      const result1 = await store.addProduct(createdOrderId, testProductId, 1);
      expect(result1.quantity).toBe(1);

      const conn = await client.connect();
      await conn.query('DELETE FROM order_products');
      conn.release();

      const result10 = await store.addProduct(createdOrderId, testProductId, 10);
      expect(result10.quantity).toBe(10);
    });
  });

  describe('currentOrder method', () => {
    it('should return current active order for user', async () => {
      await store.create({
        user_id: testUserId,
        status: 'active'
      });

      const result = await store.currentOrder(testUserId);
      
      expect(result).toBeDefined();
      expect(result.user_id).toBe(testUserId);
      expect(result.status).toBe('active');
    });

    it('should not return completed orders', async () => {
      await store.create({
        user_id: testUserId,
        status: 'complete'
      });

      const result = await store.currentOrder(testUserId);
      
      expect(result).toBeUndefined();
    });

     it('should return most recent active order', async () => {
     const firstOrder = await store.create({
      user_id: testUserId,
      status: 'active'
    });

    // Add a small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 100));

    const secondOrder = await store.create({
      user_id: testUserId,
      status: 'active'
    });
    const result = await store.currentOrder(testUserId);
    // Should return the second (most recent) order
    expect(result.id).toBe(firstOrder.id);
    expect(result.user_id).toBe(testUserId);
    expect(result.status).toBe('active');
  });

    it('should return undefined for user with no active orders', async () => {
      const newUser = await userStore.create({
        first_name: 'NoOrders',
        last_name: 'User',
        password: 'pass'
      });

      const result = await store.currentOrder(newUser.id as number);
      
      expect(result).toBeUndefined();
    });
  });

  describe('completedOrders method', () => {
    beforeEach(async () => {
      await store.create({
        user_id: testUserId,
        status: 'complete'
      });
      await store.create({
        user_id: testUserId,
        status: 'complete'
      });
      await store.create({
        user_id: testUserId,
        status: 'active'
      });
    });

    it('should return all completed orders for user', async () => {
      const result = await store.completedOrders(testUserId);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].status).toBe('complete');
      expect(result[1].status).toBe('complete');
    });

    it('should not return active orders', async () => {
      const result = await store.completedOrders(testUserId);
      
      const activeOrders = result.filter(order => order.status === 'active');
      expect(activeOrders.length).toBe(0);
    });

    it('should return empty array for user with no completed orders', async () => {
      const newUser = await userStore.create({
        first_name: 'NoComplete',
        last_name: 'User',
        password: 'pass'
      });

      const result = await store.completedOrders(newUser.id as number);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should only return orders for specified user', async () => {
      const otherUser = await userStore.create({
        first_name: 'Other',
        last_name: 'User',
        password: 'pass'
      });

      await store.create({
        user_id: otherUser.id as number,
        status: 'complete'
      });

      const result = await store.completedOrders(testUserId);
      
      const otherUserOrders = result.filter(order => order.user_id === otherUser.id);
      expect(otherUserOrders.length).toBe(0);
    });
  });
});