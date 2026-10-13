import { FastifyInstance } from 'fastify';
import { fetchMediaDetails, searchMedia } from '../services/tmdb.service.js';
import {
  searchMediaQuerystringSchema,
  mediaDetailsParamSchema,
} from '../schemas/tmdb.schema.js';

export async function tmdbRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /tmdb/search?q=batman&type=movie — Busca de filmes ou séries
  fastify.get('/search', async (request, reply) => {
    const parsed = searchMediaQuerystringSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Parâmetros de busca inválidos.',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { q, type, page } = parsed.data;
    const results = await searchMedia(q.trim(), type, page);

    if (!results) {
      return reply.status(502).send({ error: 'Falha ao comunicar com o TMDB.' });
    }

    return reply.send(results);
  });

  // GET /tmdb/:type/:id — Detalhes de um filme ou série específico
  fastify.get('/:type/:id', async (request, reply) => {
    const parsed = mediaDetailsParamSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Parâmetros de rota inválidos.',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { type, id } = parsed.data;
    const details = await fetchMediaDetails(id, type);

    if (!details) {
      return reply.status(404).send({ error: 'Mídia não encontrada.' });
    }

    return reply.send(details);
  });
}
