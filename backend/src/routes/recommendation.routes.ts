import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { recommendationQuerySchema } from '../schemas/recommendation.schema.js';
import { getUserRecommendations } from '../services/recommendation.service.js';

export async function recommendationRoutes(fastify: FastifyInstance): Promise<void> {
  // Protege a rota com JWT do Supabase
  fastify.addHook('preHandler', authMiddleware);

  // GET /recommendations — Lista recomendações personalizadas
  fastify.get('/', async (request, reply) => {
    const parsed = recommendationQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'Parâmetros de busca inválidos.', details: parsed.error.flatten().fieldErrors });
    }

    try {
      const recommendations = await getUserRecommendations(request.userId, parsed.data);
      return reply.send(recommendations);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Falha interna ao gerar recomendações.' });
    }
  });
}
