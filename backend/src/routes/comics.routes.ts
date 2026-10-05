import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  searchComicsQuerySchema,
  popularComicsQuerySchema,
  comicRecommendationsQuerySchema,
} from '../schemas/comic.schema.js';
import {
  searchComics,
  getComicDetails,
  fetchPopularComics,
} from '../services/comics.service.js';
import { getUserComicRecommendations } from '../services/comic-recommendation.service.js';

export async function comicsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /comics/search?q=&type=&limit=
  fastify.get('/search', async (request, reply) => {
    const parsed = searchComicsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Parâmetros de busca inválidos.',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const results = await searchComics(
        parsed.data.q,
        parsed.data.type,
        parsed.data.limit
      );
      return reply.send({ results });
    } catch (err) {
      fastify.log.error({ err }, 'Erro ao buscar quadrinhos e mangás.');
      return reply.status(500).send({ error: 'Erro ao buscar quadrinhos e mangás.' });
    }
  });

  // GET /comics/popular?limit=
  fastify.get('/popular', async (request, reply) => {
    const parsed = popularComicsQuerySchema.safeParse(request.query);
    const limit = parsed.success ? parsed.data.limit : 12;

    try {
      const results = await fetchPopularComics(limit);
      return reply.send({ results });
    } catch (err) {
      fastify.log.error({ err }, 'Erro ao buscar quadrinhos populares.');
      return reply.status(500).send({ error: 'Erro ao buscar quadrinhos populares.' });
    }
  });

  // GET /comics/recommendations?limit= (protegido por autenticação)
  fastify.get(
    '/recommendations',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const parsed = comicRecommendationsQuerySchema.safeParse(request.query);
      const limit = parsed.success ? parsed.data.limit : 10;

      try {
        const recommendations = await getUserComicRecommendations(request.userId, { limit });
        return reply.send({ recommendations });
      } catch (err) {
        fastify.log.error({ err }, 'Erro ao gerar recomendações de quadrinhos.');
        return reply.status(500).send({ error: 'Erro ao gerar recomendações de quadrinhos.' });
      }
    }
  );

  // GET /comics/:id — Detalhes da saga ou mangá com edições/volumes enumerados
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const comic = await getComicDetails(id);
      if (!comic) {
        return reply.status(404).send({ error: 'Quadrinho ou mangá não encontrado.' });
      }
      return reply.send(comic);
    } catch (err) {
      fastify.log.error({ err }, 'Erro ao buscar detalhes da saga ou mangá.');
      return reply.status(500).send({ error: 'Erro ao buscar detalhes da obra.' });
    }
  });
}
