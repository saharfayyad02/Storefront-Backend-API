import { Product, ProductStore } from '../models/ProductModule';
import { verifyToken } from '../utils/jwt';
import express from 'express';

const store = new ProductStore();
export const productsRouter = express.Router();

/***************
 * TOP 5 POPULAR PRODUCTS
 * GET /products/top
 ***************/
productsRouter.get('/top', async (_req, res) => {
  try {
    const products = await store.top5();
    res.json(products);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/***************
 * PRODUCTS BY CATEGORY
 * GET /products/category/:category
 ***************/
productsRouter.get('/category/:category', async (req, res) => {
  try {
    const products = await store.productsByCategory(req.params.category);
    res.json(products);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/***************
 * INDEX
 * GET /products
 ***************/
productsRouter.get('/', async (_req, res) => {
  try {
    const products = await store.index();
    res.json(products);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/***************
 * SHOW
 * GET /products/:id
 ***************/
// In productsRouter GET /:id
productsRouter.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    const product = await store.show(id);
    res.json(product);
  } catch (err: any) {
    if (err.message === 'Product not found') {
      res.status(404).json({ error: 'Product not found' });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
});

/***************
 * CREATE
 * POST /products
 ***************/
productsRouter.post('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ error: 'Token required' });

    const token = authHeader.split(' ')[1];
    verifyToken(token);

    const product: Product = {
      name: req.body.name,
      price: req.body.price,
      category: req.body.category,
    };

    const newProduct = await store.create(product);
    res.json(newProduct);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

export default productsRouter;
