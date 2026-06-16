import { Hono } from 'hono';
import { v4 as uuid } from 'uuid';
import { writeFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { uploadFile, isS3Configured } from '../lib/storage.js';

const uploads = new Hono();

const UPLOAD_DIR = join(process.cwd(), 'uploads');

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

uploads.post('/:slug/upload', authMiddleware, requireRole('admin', 'manager'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');

  const body = await c.req.parseBody();
  const file = body['file'] as File | undefined;

  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return c.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' }, 400);
  }

  if (file.size > MAX_SIZE) {
    return c.json({ error: 'File too large. Maximum 5MB' }, 400);
  }

  const ext = extname(file.name) || '.jpg';
  const filename = `${tenantId}-${uuid()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isS3Configured()) {
    const url = await uploadFile(filename, buffer, file.type);
    if (url) {
      return c.json({ url, filename, storage: 's3' }, 201);
    }
  }

  const filepath = join(UPLOAD_DIR, filename);
  await writeFile(filepath, buffer);
  const url = `/uploads/${filename}`;

  return c.json({ url, filename, storage: 'local' }, 201);
});

export default uploads;
