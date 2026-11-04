import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config.js';
import { errorHandler } from './middleware/error.js';

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

// Central error handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`✓ Masar server listening on port ${config.port} (${config.timezone})`);
  });
}

export default app;

