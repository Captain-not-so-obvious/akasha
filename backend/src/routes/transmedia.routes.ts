import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  TransmediaRecommendationQuerySchema,
} from '../schemas/transmedia.schema.js';
import {
  getUserTransmediaRecommendations,
  getUserArchiveStats,
  CANONICAL_FRANCHISES,
} from '../services/transmedia.service.js';

export async function transmediaRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /transmedia/recommendations?limit=
  fastify.get(
    '/recommendations',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const parsed = TransmediaRecommendationQuerySchema.safeParse(request.query);
      const limit = parsed.success ? parsed.data.limit : 10;

      try {
        const recommendations = await getUserTransmediaRecommendations(request.userId, limit);
        return reply.send({ recommendations });
      } catch (err) {
        fastify.log.error({ err }, 'Erro ao gerar recomendações transmídia.');
        return reply.status(500).send({ error: 'Erro ao gerar recomendações transmídia.' });
      }
    }
  );

  // GET /transmedia/stats — Métricas consolidadas do Grande Acervo do usuário
  fastify.get(
    '/stats',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const stats = await getUserArchiveStats(request.userId);
        return reply.send(stats);
      } catch (err) {
        fastify.log.error({ err }, 'Erro ao calcular métricas do grande acervo.');
        return reply.status(500).send({ error: 'Erro ao calcular métricas do acervo.' });
      }
    }
  );

  // GET /transmedia/franchises — Catálogo de franquias canônicas e conexões entre mídias
  fastify.get('/franchises', async (_request, reply) => {
    return reply.send({
      franchises: CANONICAL_FRANCHISES.map((f) => ({
        id: f.id,
        name: f.name,
        mediaCount: f.medias.length,
        availableDomains: Array.from(new Set(f.medias.map((m) => m.domain))),
        medias: f.medias,
      })),
    });
  });
}
