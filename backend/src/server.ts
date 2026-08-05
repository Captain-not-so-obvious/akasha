import Fastify from 'fastify';
import cors from '@fastify/cors';
import { wishlistRoutes } from './routes/wishlist.routes.js';
import { tmdbRoutes } from './routes/tmdb.routes.js';
import { recommendationRoutes } from './routes/recommendation.routes.js';

const fastify = Fastify({
  logger: {
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

// CORS: em produção, só aceita o domínio do frontend
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Registro de rotas com prefixo
await fastify.register(wishlistRoutes, { prefix: '/wishlist' });
await fastify.register(tmdbRoutes, { prefix: '/tmdb' });
await fastify.register(recommendationRoutes, { prefix: '/recommendations' });

// Health check — usado pelo Render para verificar se o servidor está vivo
fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

const PORT = Number(process.env.PORT) || 3000;

try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
