import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { getFeedQuerySchema } from '../schemas/feed.schema.js';
import { getFeedForUser } from '../services/activity.service.js';

export async function feedRoutes(fastify: FastifyInstance): Promise<void> {
  // Protege todas as rotas de feed com autenticação Supabase JWT
  fastify.addHook('preHandler', authMiddleware);

  // GET /feed — Retorna o feed de atividades da rede do usuário
  fastify.get('/', async (request, reply) => {
    const parsed = getFeedQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Parâmetros de consulta inválidos.',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { page, limit } = parsed.data;
    const feedData = await getFeedForUser(request.userId, page, limit);

    return reply.send(feedData);
  });
}
