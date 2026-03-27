import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'xenfi-secret-key-change-in-production';
const JWT_EXPIRES = '30d';

export function signToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}
