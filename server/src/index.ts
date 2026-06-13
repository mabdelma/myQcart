import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { HTTPException } from 'hono/http-exception';
import { logger } from './lib/logger.js';
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
} from './routes/index.js';

const app = new Hono();

app.use('*', cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

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

// Serve uploaded files
app.use('/uploads/*', serveStatic({ root: './' }));

app.route('/api', adminRoutes);

// Error handling
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  logger.error({ err: err.message, stack: err.stack }, 'Unhandled error');
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
