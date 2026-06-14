import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { createDemoRequest } from '../services/demoService.js';

const demo = new Hono();

const createDemoSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  restaurant: z.string().min(1).max(100),
  phone: z.string().optional(),
  size: z.string().optional(),
  message: z.string().optional(),
});

demo.post('/', zValidator('json', createDemoSchema), async (c) => {
  const input = c.req.valid('json');
  const result = await createDemoRequest(input);

  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.data, result.status);
});

export default demo;
