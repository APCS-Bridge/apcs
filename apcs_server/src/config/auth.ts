/**
 * Authentication configuration
 */

export const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'apcs_super_secret_key_change_in_production_2026',
  jwtAccessExpiry: '30m', // 30 minutes
  jwtRefreshExpiry: '7d', // 7 days
  bcryptRounds: 10,
  
  // SuperAdmin credentials (for seeding)
  superAdmin: {
    email: 'apcsSuperAdmin@gmail.com',
    password: 'superAdmin123', // Will be hashed in seed
    name: 'APCS Super Admin'
  }
};
