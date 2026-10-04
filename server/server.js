import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

import env from './config/env.js';
import routes from './routes/index.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
import { verifyConnection, pool } from './database/connection.js';
import { apiLimiter } from './middleware/rateLimiters.js';

const app = express();

// Render (and most hosts) put a proxy in front; trust it so rate limits see real client IPs.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(cors({ origin: env.clientUrl }));
app.use(helmet());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev', { skip: (req) => req.path === '/health' }));

// Health check stays outside the rate limiter so the host's probes never get throttled.
app.get('/health', (req, res) => res.json({ status: 'OK' }));
app.use('/api', apiLimiter);
app.use('/', routes);

app.use(notFound);
app.use(errorHandler);

async function startServer() {
  try {
    await verifyConnection();
  } catch (err) {
    console.error('Failed to connect to the database:', err.message);
    process.exit(1);
  }

  console.log('Database connection verified.');

  const server = app.listen(env.port, () => {
    console.log(`Gaming Platform API running on port ${env.port}`);
  });

  // Hosts like Render sit behind a proxy with a 60s+ idle timeout; keep ours longer
  // so the proxy never reuses a connection we have already closed.
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.requestTimeout = 30000;

  // Finish in-flight requests and release DB connections on deploy/restart.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
