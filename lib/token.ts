import crypto from 'crypto';

const SECRET_KEY = process.env.SECRET_KEY || 'intellistreet-super-secret-key-2026';

interface TokenPayload {
  id: string;
  email: string;
  role: 'citizen' | 'officer' | 'admin';
  exp: number;
}

// Generate token: payload + "." + signature
export function signToken(payload: Omit<TokenPayload, 'exp'>): string {
  // Token expires in 7 days
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const fullPayload: TokenPayload = { ...payload, exp };

  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(encodedPayload);
  const signature = hmac.digest('base64url');

  return `${encodedPayload}.${signature}`;
}

// Verify token signature and expiration
export function verifyToken(token: string): TokenPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;

  // Verify signature
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(encodedPayload);
  const expectedSignature = hmac.digest('base64url');

  if (signature !== expectedSignature) {
    return null; // Invalid signature
  }

  try {
    const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const payload: TokenPayload = JSON.parse(payloadJson);

    // Check expiration
    if (payload.exp < Date.now()) {
      return null; // Expired
    }

    return payload;
  } catch (e) {
    return null;
  }
}
