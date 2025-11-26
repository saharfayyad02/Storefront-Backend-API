import supertest from 'supertest';
import app from '../server';
import { cleanupTestDatabase, setupTestDatabase } from './helpers/database.setup';
import client from '../database';
import { getAuthHeader } from './helpers/auth-helper';
import { UserStore } from '../models/userModule';

const request = supertest(app);
const userStore = new UserStore();

describe('User API Endpoints', () => {
  let testUserId: number;
  let authToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await client.end();
  });

  beforeEach(async () => {
    const conn = await client.connect();
    await conn.query('DELETE FROM users');
    conn.release();
  });

  describe('POST /users - Create User', () => {
    it('should create a new user and return token', async () => {
      const response = await request
        .post('/users')
        .send({
          first_name: 'John',
          last_name: 'Fuared',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.first_name).toBe('John');
      expect(response.body.user.last_name).toBe('Fuared');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.password).toBeUndefined();

      testUserId = response.body.user.id;
      authToken = response.body.token;
    });

    it('should return 400 for invalid user data', async () => {
      const response = await request
        .post('/users')
        .send({
          first_name: 'John',
          password: 'password123'
          // missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /users/authenticate - Login', () => {
    beforeEach(async () => {
      // Create a user first
      const user = await userStore.create({
        first_name: 'TestUser',
        last_name: 'Test',
        password: 'testpass123'
      });
      testUserId = user.id as number;
    });

    it('should authenticate user with correct credentials', async () => {
      const response = await request
        .post('/users/authenticate')
        .send({
          first_name: 'TestUser',
          password: 'testpass123'
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.first_name).toBe('TestUser');
      expect(response.body.token).toBeDefined();
    });

    it('should return 401 for incorrect password', async () => {
      const response = await request
        .post('/users/authenticate')
        .send({
          first_name: 'TestUser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request
        .post('/users/authenticate')
        .send({
          first_name: 'NonExistent',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /users - Get All Users', () => {
    beforeEach(async () => {
      const user = await userStore.create({
        first_name: 'TestUser',
        last_name: 'Test',
        password: 'testpass123'
      });
      testUserId = user.id as number;
    });

    it('should return all users with valid token', async () => {
      const response = await request
        .get('/users')
        .set('Authorization', getAuthHeader(testUserId));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return 401 without token', async () => {
      const response = await request.get('/users');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token required');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request
        .get('/users')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /users/:id - Get User By ID', () => {
    beforeEach(async () => {
      const user = await userStore.create({
        first_name: 'TestUser',
        last_name: 'Test',
        password: 'testpass123'
      });
      testUserId = user.id as number;
    });

    it('should return user with valid token', async () => {
      const response = await request
        .get(`/users/${testUserId}`)
        .set('Authorization', getAuthHeader(testUserId));

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(testUserId);
      expect(response.body.recent_purchases).toBeDefined();
    });

    it('should return 401 without token', async () => {
      const response = await request.get(`/users/${testUserId}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token required');
    });
  });
});