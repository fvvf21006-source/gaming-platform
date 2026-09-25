// Centralized environment variable loading.
// Import this module wherever configuration values are needed,
// instead of reading from process.env directly across the codebase.

import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL || '',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
};

// Fail fast in production instead of booting with settings that only break later
// (CORS rejecting the real client, or every login failing with a missing JWT secret).
if (env.nodeEnv === 'production') {
  const missing = [
    ['DATABASE_URL', env.databaseUrl],
    ['JWT_SECRET', env.jwtSecret],
    ['CLIENT_URL', process.env.CLIENT_URL],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

export default env;
