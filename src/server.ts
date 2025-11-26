// src/server.ts
import express, { Request, Response } from 'express';
import usersRouter from './handlers/user';
import productsRouter from './handlers/product';
import ordersRouter from './handlers/order';

const app = express();

app.use(express.json());  

app.use('/users', usersRouter);
app.use('/products', productsRouter);
app.use('/orders', ordersRouter);

console.log("Connected to DB:", process.env.POSTGRES_DB, process.env.POSTGRES_DB_TEST, process.env.ENV);

if (process.env.ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;