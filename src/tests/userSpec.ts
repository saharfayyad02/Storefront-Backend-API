import { cleanupTestDatabase, setupTestDatabase } from './helpers/database.setup';
import client from '../database';
import { User, UserStore } from '../models/userModule';

const store = new UserStore();

describe('User Model', () => {
  const testUser: User = {
    first_name: 'Test',
    last_name: 'User',
    password: 'password123',
  };

  let createdUserId: number;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
   // await client.end();
  });

  beforeEach(async () => {
    const conn = await client.connect();
    await conn.query('DELETE FROM users');
    conn.release();
  });

  describe('create method', () => {
    it('should create a new user', async () => {
      const result = await store.create(testUser);
      
      expect(result.first_name).toBe(testUser.first_name);
      expect(result.last_name).toBe(testUser.last_name);
      expect(result.id).toBeDefined();
      
      createdUserId = result.id as number;
    });

    it('should hash the password when creating user', async () => {
      const user = await store.create(testUser);
      
      const conn = await client.connect();
      const sql = 'SELECT password_digest FROM users WHERE id = $1';
      const result = await conn.query(sql, [user.id]);
      conn.release();

      expect(result.rows[0].password_digest).toBeDefined();
      expect(result.rows[0].password_digest).not.toBe(testUser.password);
    });

    it('should not return password in created user object', async () => {
      const result = await store.create(testUser);
      
      expect((result as any).password_digest).toBeUndefined();
      expect(result.password).toBeUndefined();
    });
  });

  describe('index method', () => {
    beforeEach(async () => {
      await store.create({
        first_name: 'User1',
        last_name: 'Test1',
        password: 'pass1'
      });
      await store.create({
        first_name: 'User2',
        last_name: 'Test2',
        password: 'pass2'
      });
    });

    it('should return a list of all users', async () => {
      const result = await store.index();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should not include password_digest in returned users', async () => {
      const result = await store.index();
      
      expect((result[0] as any).password_digest).toBeUndefined();
      expect(result[0].password).toBeUndefined();
    });

    it('should return empty array when no users exist', async () => {
      const conn = await client.connect();
      await conn.query('DELETE FROM users');
      conn.release();

      const result = await store.index();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('show method', () => {
    beforeEach(async () => {
      const user = await store.create(testUser);
      createdUserId = user.id as number;
    });

    it('should return a specific user by id', async () => {
      const result = await store.show(createdUserId);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(createdUserId);
      expect(result.first_name).toBe(testUser.first_name);
      expect(result.last_name).toBe(testUser.last_name);
    });

    it('should not include password in returned user', async () => {
      const result = await store.show(createdUserId);
      
      expect((result as any).password_digest).toBeUndefined();
      expect(result.password).toBeUndefined();
    });

    it('should return undefined for non-existent user', async () => {
      const result = await store.show(99999);
      
      expect(result).toBeUndefined();
    });
  });

  describe('authenticate method', () => {
    beforeEach(async () => {
      await store.create({
        first_name: 'AuthUser',
        last_name: 'Test',
        password: 'correctpassword'
      });
    });

    it('should authenticate user with correct credentials', async () => {
      const result = await store.authenticate('AuthUser', 'correctpassword');
      
      expect(result).not.toBeNull();
      expect(result?.first_name).toBe('AuthUser');
      expect(result?.last_name).toBe('Test');
    });

    it('should return null with incorrect password', async () => {
      const result = await store.authenticate('AuthUser', 'wrongpassword');
      
      expect(result).toBeNull();
    });

    it('should return null with non-existent username', async () => {
      const result = await store.authenticate('NonExistent', 'password123');
      
      expect(result).toBeNull();
    });

    it('should not return password in authenticated user', async () => {
      const result = await store.authenticate('AuthUser', 'correctpassword');
      
      expect(result?.password).toBe('');
      expect((result as any)?.password_digest).toBeUndefined();
    });
  });

  describe('recentPurchases method', () => {
    let userId: number;
    let productId: number;
    let orderId: number;

    beforeEach(async () => {
      // Create user
      const user = await store.create(testUser);
      userId = user.id as number;

      // Create product
      const conn = await client.connect();
      const productResult = await conn.query(
        'INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING *',
        ['Test Product', 29.99, 'electronics']
      );
      productId = productResult.rows[0].id;

      // Create completed order
      const orderResult = await conn.query(
        'INSERT INTO orders (user_id, status) VALUES ($1, $2) RETURNING *',
        [userId, 'complete']
      );
      orderId = orderResult.rows[0].id;

      // Add product to order
      await conn.query(
        'INSERT INTO order_products (order_id, product_id, quantity) VALUES ($1, $2, $3)',
        [orderId, productId, 1]
      );

      conn.release();
    });

    it('should return recent purchases for a user', async () => {
      const result = await store.recentPurchases(userId);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should limit purchases to last 5', async () => {
      // Create 6 more orders
      const conn = await client.connect();
      for (let i = 0; i < 6; i++) {
        const orderResult = await conn.query(
          'INSERT INTO orders (user_id, status) VALUES ($1, $2) RETURNING *',
          [userId, 'complete']
        );
        await conn.query(
          'INSERT INTO order_products (order_id, product_id, quantity) VALUES ($1, $2, $3)',
          [orderResult.rows[0].id, productId, 1]
        );
      }
      conn.release();

      const result = await store.recentPurchases(userId);
      
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array for user with no purchases', async () => {
      const newUser = await store.create({
        first_name: 'NoPurchases',
        last_name: 'User',
        password: 'pass'
      });

      const result = await store.recentPurchases(newUser.id as number);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});