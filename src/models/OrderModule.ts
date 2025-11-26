import client from '../database';

export type Order = {
  id?: number;
  user_id: number;
  status: string;   // 'active' | 'complete'
};

export class OrderStore {
  // Create new order
  async create(o: Order): Promise<Order> {
    const conn = await client.connect();
    const sql =
      'INSERT INTO orders (user_id, status) VALUES ($1, $2) RETURNING *';
    const result = await conn.query(sql, [o.user_id, o.status]);
    conn.release();
    return result.rows[0];
  }

  // Get current active order for user
  async currentOrder(user_id: number): Promise<Order> {
    const conn = await client.connect();
    const sql =
      "SELECT * FROM orders WHERE user_id = $1 AND status = 'active' LIMIT 1";
    const result = await conn.query(sql, [user_id]);
    conn.release();
    return result.rows[0];
  }

  // Get completed orders for user
  async completedOrders(user_id: number): Promise<Order[]> {
    const conn = await client.connect();
    const sql =
      "SELECT * FROM orders WHERE user_id = $1 AND status = 'complete'";
    const result = await conn.query(sql, [user_id]);
    conn.release();
    return result.rows;
  }

  // Add product to an order (order_products)
  async addProduct(
    order_id: number,
    product_id: number,
    quantity: number
  ) {
    const conn = await client.connect();
    const sql =
      'INSERT INTO order_products (order_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *';

    const result = await conn.query(sql, [order_id, product_id, quantity]);
    conn.release();
    return result.rows[0];
  }

  // Get order with items
 // src/models/order.ts → REPLACE the show() method completely

async show(order_id: number): Promise<{
  id: number;
  user_id: number;
  status: string;
  products?: Array<{
    product_id: number;
    name: string;
    price: number;
    quantity: number;
  }>;
}> {
  const conn = await client.connect();
  try {
    // Get the order itself
    const orderResult = await conn.query(
      'SELECT id, user_id, status FROM orders WHERE id = $1',
      [order_id]
    );

    if (orderResult.rows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderResult.rows[0];

    // Get products in the order
    const productsResult = await conn.query(
      `SELECT p.id AS product_id, p.name, p.price::numeric, op.quantity
       FROM order_products op
       JOIN products p ON op.product_id = p.id
       WHERE op.order_id = $1`,
      [order_id]
    );

    return {
      id: order.id,
      user_id: order.user_id,
      status: order.status,
      products: productsResult.rows.length > 0 ? productsResult.rows : []
    };
  } finally {
    conn.release();
  }
}
}