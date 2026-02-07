import prisma from '../lib/prisma';

/**
 * Revoke a token (logout)
 */
export async function revokeToken(
  token: string,
  userId: string,
  expiresAt: Date
): Promise<void> {
  await prisma.revokedToken.create({
    data: {
      token,
      userId,
      expiresAt
    }
  });
}

/**
 * Check if a token is revoked
 */
export async function isTokenRevoked(token: string): Promise<boolean> {
  const revokedToken = await prisma.revokedToken.findUnique({
    where: { token }
  });

  return revokedToken !== null;
}

/**
 * Clean up expired tokens (should be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  await prisma.revokedToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });
}
