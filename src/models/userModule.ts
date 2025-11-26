import client from '../database';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const {
  BCRYPT_PASSWORD,
  SALT_ROUNDS
} = process.env;


export type User = {
  id?: number;
  first_name: string;
  last_name: string;
  password: string;
};

export class UserStore {
  async index(): Promise<User[]> {
    const conn = await client.connect();
    const result = await conn.query(
      'SELECT id, first_name, last_name FROM users'
    );
    conn.release();
    return result.rows;
  }

  async show(id: number): Promise<User> {
    const conn = await client.connect();
    const result = await conn.query(
      'SELECT id, first_name, last_name FROM users WHERE id = $1',
      [id]
    );
    conn.release();
    return result.rows[0];
  }

  async create(u: User): Promise<User> {
    try {

      const conn = await client.connect();

      // Hash password
      const salt = parseInt(SALT_ROUNDS as string);
      const hash = bcrypt.hashSync(u.password + BCRYPT_PASSWORD, salt);

      const sql =
        'INSERT INTO users (first_name, last_name, password_digest) VALUES ($1, $2, $3) RETURNING id, first_name, last_name';

      const result = await conn.query(sql, [
        u.first_name,
        u.last_name,
        hash,
      ]);

      const user = result.rows[0];
      conn.release();
      return user;
    } catch (err) {
      throw new Error(`Unable to create user ${u.first_name}: ${err}`);
    }
  }

  async authenticate(firstName: string, password: string): Promise<User | null> {
    const conn = await client.connect();
    const sql = 'SELECT * FROM users WHERE first_name = $1';

    const result = await conn.query(sql, [firstName]);
    conn.release();

    if (result.rows.length) {
      const user = result.rows[0];

      const valid = bcrypt.compareSync(
        password + BCRYPT_PASSWORD,
        user.password_digest
      );

      if (valid) {
        return {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          password: '',
        };
      }
    }

    return null;
  }

  async recentPurchases(userId: number): Promise<any[]> {
  const conn = await client.connect();

  const sql = `
    SELECT 
      p.id AS product_id,
      p.name,
      p.price,
      op.quantity,
      o.id AS order_id,
      o.status,
      o.created_at AS order_date
    FROM order_products op
    JOIN orders o ON op.order_id = o.id
    JOIN products p ON op.product_id = p.id
    WHERE o.user_id = $1
      AND o.status = 'complete'
    ORDER BY o.created_at DESC
    LIMIT 5;
  `;

  const result = await conn.query(sql, [userId]);
  conn.release();

  return result.rows;
}

}
