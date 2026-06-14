import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { registerUser, loginUser, getCurrentUser } from '../services/authService.js';

const auth = new Hono();

const registerSchema = z.object({
  tenantSlug: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(['admin', 'manager', 'waiter', 'kitchen', 'cashier']).optional().default('waiter'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const input = c.req.valid('json');
  const result = await registerUser(input);

  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data, result.status);
});

auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const input = c.req.valid('json');
  const result = await loginUser(input);

  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data, result.status);
});

auth.get('/me', async (c) => {
  const result = await getCurrentUser(c);

  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data, result.status);
});

export default auth;
