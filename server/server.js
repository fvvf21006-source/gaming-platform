import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import env from './config/env.js';
import routes from './routes/index.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
import { verifyConnection } from './database/connection.js';

const app = express();

app.use(express.json());
app.use(cors({ origin: env.clientUrl }));
app.use(helmet());
app.use(morgan('dev'));

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

  app.listen(env.port, () => {
    console.log(`Gaming Platform API running on port ${env.port}`);
  });
}

startServer();