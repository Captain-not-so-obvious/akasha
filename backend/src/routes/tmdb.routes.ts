import { FastifyInstance } from 'fastify';
import { fetchMediaDetails, searchMedia } from '../services/tmdb.service.js';

interface SearchQuerystring {
  q: string;
  type: 'movie' | 'tv';
  page?: string;
}

interface DetailsParams {
  type: 'movie' | 'tv';
  id: string;
}

export async function tmdbRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /tmdb/search?q=batman&type=movie — Busca de filmes ou séries
  fastify.get<{ Querystring: SearchQuerystring }>('/search', async (request, reply) => {
    const { q, type, page } = request.query;

    if (!q || !q.trim()) {
      return reply.status(400).send({ error: 'Parâmetro "q" é obrigatório.' });
    }

    if (type !== 'movie' && type !== 'tv') {
      return reply.status(400).send({ error: 'Parâmetro "type" deve ser "movie" ou "tv".' });
    }

    const results = await searchMedia(q.trim(), type, page ? Number(page) : 1);

    if (!results) {
      return reply.status(502).send({ error: 'Falha ao comunicar com o TMDB.' });
    }

    return reply.send(results);
  });

  // GET /tmdb/:type/:id — Detalhes de um filme ou série específico
  fastify.get<{ Params: DetailsParams }>('/:type/:id', async (request, reply) => {
    const { type, id } = request.params;

    if (type !== 'movie' && type !== 'tv') {
      return reply.status(400).send({ error: 'Tipo deve ser "movie" ou "tv".' });
    }

    const details = await fetchMediaDetails(Number(id), type);

    if (!details) {
      return reply.status(404).send({ error: 'Mídia não encontrada.' });
    }

    return reply.send(details);
  });
}
