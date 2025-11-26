import { generateToken } from '../../utils/jwt';

export function createTestToken(userId: number): string {
  return generateToken(userId);
}

export function getAuthHeader(userId: number): string {
  return `Bearer ${createTestToken(userId)}`;
}