import { Hono } from 'hono';
import { openApiSchema } from '../openapi.js';

const docs = new Hono();

docs.get('/docs', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>QCart API Docs</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
      <style>html { color-scheme: light dark; }</style>
    </head>
    <body style="margin:0">
      <div id="swagger-ui"></div>
      <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
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
