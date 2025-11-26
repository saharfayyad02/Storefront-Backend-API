import client from '../database';

export type Product = {
  id?: number;
  name: string;
  price: number;
  category?: string;
};


// src/models/product.ts → Replace the whole ProductStore class

export class ProductStore {
  private parseRow(row: any): Product {
    return {
      id: row.id,
      name: row.name,
      price: parseFloat(row.price),  // ← CRITICAL: Convert string → number
      category: row.category || undefined
    };
  }

  async index(): Promise<Product[]> {
    const conn = await client.connect();
    const result = await conn.query('SELECT * FROM products');
    conn.release();
    return result.rows.map((row: any) => this.parseRow(row));
  }

  async show(id: number): Promise<Product> {
    const conn = await client.connect();
    const result = await conn.query('SELECT * FROM products WHERE id = $1', [id]);
    conn.release();

    if (result.rows.length === 0) {
      throw new Error('Product not found');
    }

    return this.parseRow(result.rows[0]);
  }

  async create(p: Product): Promise<Product> {
    const conn = await client.connect();
    const result = await conn.query(
      'INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING *',
      [p.name, p.price, p.category || null]
    );
    conn.release();
    return this.parseRow(result.rows[0]);
  }

  async productsByCategory(category: string): Promise<Product[]> {
    const conn = await client.connect();
    const result = await conn.query('SELECT * FROM products WHERE category = $1', [category]);
    conn.release();
    return result.rows.map((row: any) => this.parseRow(row));
  }

  async top5(): Promise<Product[]> {
    const conn = await client.connect();
    const sql = `
      SELECT p.*, COALESCE(SUM(op.quantity), 0) AS total_quantity
      FROM products p
      LEFT JOIN order_products op ON p.id = op.product_id
      GROUP BY p.id
      ORDER BY total_quantity DESC
      LIMIT 5
    `;
    const result = await conn.query(sql);
    conn.release();
    return result.rows.map((row: any) => this.parseRow(row));
  }
}
