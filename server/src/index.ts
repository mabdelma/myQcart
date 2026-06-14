import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { HTTPException } from 'hono/http-exception';
import { logger } from './lib/logger.js';
import { initSentry, captureError } from './lib/sentry.js';
import { generalLimiter, authLimiter, publicLimiter } from './middleware/rateLimiter.js';

initSentry();
import {
  authRoutes,
  tenantRoutes,
  menuRoutes,
  tableRoutes,
  orderRoutes,
  paymentRoutes,
  webhookRoutes,
  userRoutes,
  adminRoutes,
  eventRoutes,
  uploadRoutes,
  demoRoutes,
  analyticsRoutes,
} from './routes/index.js';

const app = new Hono();

app.use('*', cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
app.use('/api/auth/*', authLimiter);
app.use('/api/tenants/*', generalLimiter);
app.use('/api/r/*', publicLimiter);
app.use('/api/admin/*', generalLimiter);
app.use('/api/demo', publicLimiter);
app.use('/api/health', publicLimiter);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/tenants', tenantRoutes);
app.route('/api/r', menuRoutes);
app.route('/api/r', tableRoutes);
app.route('/api/r', orderRoutes);
app.route('/api/r', paymentRoutes);
app.route('/api', webhookRoutes);
app.route('/api/r', userRoutes);
app.route('/api/r', eventRoutes);
app.route('/api/r', uploadRoutes);
app.route('/api/r', analyticsRoutes);
app.route('/api/demo', demoRoutes);

// Serve uploaded files
app.use('/uploads/*', serveStatic({ root: './' }));

app.route('/api', adminRoutes);

// Error handling
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  logger.error({ err: err.message, stack: err.stack }, 'Unhandled error');
  captureError(err, { path: c.req.path, method: c.req.method });
  return c.json({ error: 'Internal server error' }, 500);
});

// 404
app.notFound((c) => c.json({ error: 'Not found' }, 404));

const port = parseInt(process.env.PORT || '3001', 10);

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  logger.info({ port: info.port }, 'QCart API server started');
});

export default app;
