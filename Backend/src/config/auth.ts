/**
 * Authentication configuration
 */

export const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'apcs_super_secret_key_change_in_production_2026',
  jwtAccessExpiry: process.env.JWT_EXPIRES_IN || '7d', // Use env var or 7 days
  jwtRefreshExpiry: '30d', // 30 days
  bcryptRounds: 10,
  
  // SuperAdmin credentials (for seeding)
  superAdmin: {
    email: 'apcsSuperAdmin@gmail.com',
    password: 'superAdmin123', // Will be hashed in seed
    name: 'APCS Super Admin'
  }
};
