import { Order, OrderStore } from '../models/OrderModule';
import { verifyToken } from '../utils/jwt';
import express from 'express';


const store = new OrderStore();
export const ordersRouter = express.Router();

/**********************
 * CREATE ORDER
 * POST /orders
 * Protected (JWT)
 **********************/
ordersRouter.post('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ error: 'Token required' });

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const newOrder: Order = {
      user_id: decoded.userId,
      status: req.body.status || 'active'
    };

    const created = await store.create(newOrder);
    res.json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/*************************
 * CURRENT ORDER
 * GET /orders/current/:user_id
 * Protected
 *************************/
ordersRouter.get('/current/:user_id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ error: 'Token required' });

    const token = authHeader.split(' ')[1];
    verifyToken(token);

    const order = await store.currentOrder(Number(req.params.user_id));
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/*************************
 * COMPLETED ORDERS
 * GET /orders/completed/:user_id
 * Protected
 *************************/
ordersRouter.get('/completed/:user_id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ error: 'Token required' });

    const token = authHeader.split(' ')[1];
    verifyToken(token);

    const orders = await store.completedOrders(
      Number(req.params.user_id)
    );
    res.json(orders);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/*************************
 * ADD PRODUCT TO ORDER
 * POST /orders/:id/products
 * Protected
 *************************/
ordersRouter.post('/:id/products', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token required' });

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);   // ← already fixed

    const orderId = Number(req.params.id);
    const { product_id, quantity } = req.body;

    // ADD THIS VALIDATION
    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({
        error: 'product_id and quantity (positive integer) are required'
      });
    }

    const added = await store.addProduct(orderId, product_id, quantity);
    res.json(added);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/*************************
 * SHOW ORDER WITH PRODUCTS
 * GET /orders/:id
 * Protected
 *************************/
// GET /orders/:id
ordersRouter.get('/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token required' });

    const token = authHeader.split(' ')[1];
    verifyToken(token);

    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) return res.status(400).json({ error: 'Invalid order ID' });

    const order = await store.show(orderId);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default ordersRouter;
