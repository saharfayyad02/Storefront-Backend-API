import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const { TOKEN_SECRET } = process.env;

export interface TokenPayload {
  userId: number;
  iat?: number;
  exp?: number;
}


export const generateToken = (userId: number) => {
  return jwt.sign({ userId }, TOKEN_SECRET as string, { expiresIn: '2h' });
};

export const verifyToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, TOKEN_SECRET as string) as TokenPayload;
  return decoded;
};

export function getAuthHeader(userId: number): string {
  const token = jwt.sign(
    { userId },
    process.env.TOKEN_SECRET as string,
    { expiresIn: '2h' }
  );
  return `Bearer ${token}`;
}