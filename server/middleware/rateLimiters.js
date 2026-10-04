// Rate limiting. Limits are per client IP and deliberately generous for the
// general API (friends may share one network); the login limiter only counts
// failed attempts, so it stops password guessing without blocking real users.

import rateLimit from 'express-rate-limit';

const json429 = (message) => ({ error: message });

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 1500,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json429('Too many requests, please slow down'),
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json429('Too many failed login attempts, try again later'),
});
