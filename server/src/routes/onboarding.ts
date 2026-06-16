import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { onboardTenant, getPlans, createPlan } from '../services/onboardingService.js';

const onboarding = new Hono();

const signupSchema = z.object({
  restaurantName: z.string().min(1),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  address: z.string().optional(),
  currency: z.string().optional().default('USD'),
  timezone: z.string().optional().default('UTC'),
});

const planSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  maxMenus: z.number().int().optional(),
  maxTables: z.number().int().optional(),
  maxStaff: z.number().int().optional(),
  features: z.string().optional(),
});

onboarding.post('/onboarding/signup', zValidator('json', signupSchema), async (c) => {
  const body = c.req.valid('json');
  const result = await onboardTenant(body);
  if ('error' in result) return c.json({ error: result.error }, result.status);
  return c.json(result.data, result.status);
});

onboarding.get('/onboarding/plans', async (c) => {
  const plans = await getPlans();
  return c.json({ data: plans });
});

onboarding.post('/onboarding/plans', authMiddleware, requireRole('super_admin'), zValidator('json', planSchema), async (c) => {
  const body = c.req.valid('json');
  const result = await createPlan(body);
  return c.json({ data: result }, 201);
});

export default onboarding;
