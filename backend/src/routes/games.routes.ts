import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  searchGamesQuerySchema,
  popularGamesQuerySchema,
  gameRecommendationsQuerySchema,
} from '../schemas/game.schema.js';
import {
  searchGames,
  fetchGameDetails,
  fetchPopularGames,
} from '../services/igdb.service.js';
import { getUserGameRecommendations } from '../services/game-recommendation.service.js';

export async function gamesRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /games/search?q=&limit=
  fastify.get('/search', async (request, reply) => {
    const parsed = searchGamesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Parâmetros de busca inválidos.',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const results = await searchGames(parsed.data.q, parsed.data.limit);
      return reply.send({ results });
    } catch (err) {
      fastify.log.error({ err }, 'Erro ao buscar jogos no IGDB.');
      return reply.status(500).send({ error: 'Erro ao buscar jogos.' });
    }
  });

  // GET /games/popular?limit=
  fastify.get('/popular', async (request, reply) => {
    const parsed = popularGamesQuerySchema.safeParse(request.query);
    const limit = parsed.success ? parsed.data.limit : 10;

    try {
      const results = await fetchPopularGames(limit);
      return reply.send({ results });
    } catch (err) {
      fastify.log.error({ err }, 'Erro ao buscar jogos populares.');
      return reply.status(500).send({ error: 'Erro ao buscar jogos populares.' });
    }
  });

  // GET /games/recommendations?limit= (protegido por autenticação)
  fastify.get(
    '/recommendations',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const parsed = gameRecommendationsQuerySchema.safeParse(request.query);
      const limit = parsed.success ? parsed.data.limit : 10;

      try {
        const recommendations = await getUserGameRecommendations(request.userId, { limit });
        return reply.send({ recommendations });
      } catch (err) {
        fastify.log.error({ err }, 'Erro ao gerar recomendações de jogos.');
        return reply.status(500).send({ error: 'Erro ao gerar recomendações de jogos.' });
      }
    }
  );

  // GET /games/:id — Detalhes de um jogo
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const game = await fetchGameDetails(id);
      if (!game) {
        return reply.status(404).send({ error: 'Jogo não encontrado.' });
      }
      return reply.send(game);
    } catch (err) {
      fastify.log.error({ err }, 'Erro ao buscar detalhes do jogo.');
      return reply.status(500).send({ error: 'Erro ao buscar detalhes do jogo.' });
    }
  });
}
