import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config.js';
import { errorHandler } from './middleware/error.js';
import authRouter from './routes/auth.js';
import meRouter from './routes/me.js';

const app = express();

app.set('trust proxy', true);
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Masar API',
    timezone: config.timezone,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);

import { fileURLToPath } from 'url';

// Central error handler
app.use(errorHandler);

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  app.listen(config.port, () => {
    console.log(`✓ Masar server listening on port ${config.port} (${config.timezone})`);
  });
}

export default app;

