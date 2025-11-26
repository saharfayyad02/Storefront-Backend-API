import { User, UserStore } from "../models/userModule";
import express, { Router } from 'express';
import { generateToken, verifyToken } from '../utils/jwt';

const store = new UserStore();
export const usersRouter = express.Router();

// CREATE USER
// CREATE USER - ADD VALIDATION HERE
usersRouter.post('/', async (req, res) => {
  const { first_name, last_name, password } = req.body;

  // ADD THIS VALIDATION
  if (!first_name || !last_name || !password) {
    return res.status(400).json({
      error: 'Missing required fields: first_name, last_name, and password are required'
    });
  }

  try {
    const user = await store.create({ first_name, last_name, password } as User);
    const token = generateToken(user.id as number);
    res.json({ user, token });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// LOGIN
usersRouter.post('/authenticate', async (req, res) => {
  try {
    const { first_name, password } = req.body;
    const user = await store.authenticate(first_name, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id as number);
    res.json({ user, token });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// GET ALL USERS (protected)
usersRouter.get('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token required' });

    const token = authHeader.split(' ')[1];
    verifyToken(token);

    const users = await store.index();
    res.json(users);
  } catch (err: any) {
    console.error('Index error:', err);
    res.status(401).json({ error: err.message });
  }
});

// GET USER BY ID (protected)
usersRouter.get('/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token required' });

    const token = authHeader.split(' ')[1];
    verifyToken(token);

    const userId = parseInt(req.params.id);

    // Get the user
    const user = await store.show(userId);

    // Get last 5 purchases
    const purchases = await store.recentPurchases(userId);
    console.log(purchases)

    res.json({
      user,
      recent_purchases: purchases
    });
  } catch (err: any) {
    console.error('Show error:', err);
    res.status(401).json({ error: err.message });
  }
});



export default usersRouter;