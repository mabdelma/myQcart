import { Hono } from 'hono';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { openApiSchema } from '../openapi.js';

const docs = new Hono();

// Self-host Swagger UI from the bundled swagger-ui-dist package instead of a CDN,
// so the API docs work fully offline / on-prem with no external requests.
let swaggerCss = '';
let swaggerJs = '';
try {
  const require = createRequire(import.meta.url);
  const dir = (require('swagger-ui-dist') as { getAbsoluteFSPath: () => string }).getAbsoluteFSPath();
  swaggerCss = readFileSync(join(dir, 'swagger-ui.css'), 'utf8');
  swaggerJs = readFileSync(join(dir, 'swagger-ui-bundle.js'), 'utf8');
} catch { /* assets unavailable — the docs page still serves, just unstyled */ }

docs.get('/docs/swagger-ui.css', (c) => c.body(swaggerCss, 200, { 'Content-Type': 'text/css' }));
docs.get('/docs/swagger-ui-bundle.js', (c) => c.body(swaggerJs, 200, { 'Content-Type': 'application/javascript' }));

docs.get('/docs', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Qlisted API Docs</title>
      <link rel="stylesheet" href="/api/docs/swagger-ui.css" />
      <style>html { color-scheme: light dark; }</style>
    </head>
    <body style="margin:0">
      <div id="swagger-ui"></div>
      <script src="/api/docs/swagger-ui-bundle.js"></script>
      <script>
        SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#swagger-ui' });
      </script>
    </body>
    </html>
  `);
});

docs.get('/openapi.json', (c) => {
  return c.json(openApiSchema);
});

export default docs;
