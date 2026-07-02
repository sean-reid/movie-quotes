import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env.js';

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', async (c, next) => {
  const allowed = c.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : (allowed[0] ?? null)),
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  })(c, next);
});

app.get('/api/health', (c) => c.json({ status: 'ok' }));

export default app;
