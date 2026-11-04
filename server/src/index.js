import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { errorHandler } from './middleware/error.js';
import authRouter from './routes/auth.js';
import meRouter from './routes/me.js';
import uploadsRouter from './routes/uploads.js';
import referenceRouter from './routes/reference.js';
import geoRouter from './routes/geo.js';
import adminRouter from './routes/admin.js';
import locationsRouter from './routes/locations.js';
import ticketsRouter from './routes/tickets.js';
import driverRouter from './routes/driver.js';
import notificationsRouter from './routes/notifications.js';
import settingsRouter from './routes/settings.js';
import devEmailsRouter from './routes/devEmails.js';
import reportsRouter from './routes/reports.js';
import manufacturersRouter from './routes/manufacturers.js';
import driversRouter from './routes/drivers.js';
import searchRouter from './routes/search.js';

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
app.use('/api/uploads', uploadsRouter);
app.use('/api/files', uploadsRouter);
app.use('/api/reference', referenceRouter);
app.use('/api/geo', geoRouter);
app.use('/api/admin', adminRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/driver', driverRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/dev/emails', devEmailsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/manufacturers', manufacturersRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/search', searchRouter);

// Central error handler
app.use(errorHandler);

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  app.listen(config.port, () => {
    console.log(`✓ Masar server listening on port ${config.port} (${config.timezone})`);
  });
}

export default app;

