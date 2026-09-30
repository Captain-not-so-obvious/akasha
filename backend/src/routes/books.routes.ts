import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  searchBooksQuerySchema,
  popularBooksQuerySchema,
  bookRecommendationsQuerySchema,
} from '../schemas/book.schema.js';
import {
  searchBooks,
  fetchBookDetails,
  fetchPopularBooks,
} from '../services/books.service.js';
import { getUserBookRecommendations } from '../services/book-recommendation.service.js';

export async function booksRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /books/search?q=&limit=
  fastify.get('/search', async (request, reply) => {
    const parsed = searchBooksQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Parâmetros de busca inválidos.',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const results = await searchBooks(parsed.data.q, parsed.data.limit);
      return reply.send({ results });
    } catch (err) {
      fastify.log.error({ err }, 'Erro ao buscar livros no Google Books.');
      return reply.status(500).send({ error: 'Erro ao buscar livros.' });
    }
  });

  // GET /books/popular?limit=
  fastify.get('/popular', async (request, reply) => {
    const parsed = popularBooksQuerySchema.safeParse(request.query);
    const limit = parsed.success ? parsed.data.limit : 12;

    try {
      const results = await fetchPopularBooks(limit);
      return reply.send({ results });
    } catch (err) {
      fastify.log.error({ err }, 'Erro ao buscar livros populares.');
      return reply.status(500).send({ error: 'Erro ao buscar livros populares.' });
    }
  });

  // GET /books/recommendations?limit= (protegido por autenticação)
  fastify.get(
    '/recommendations',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const parsed = bookRecommendationsQuerySchema.safeParse(request.query);
      const limit = parsed.success ? parsed.data.limit : 10;

      try {
        const recommendations = await getUserBookRecommendations(request.userId, { limit });
        return reply.send({ recommendations });
      } catch (err) {
        fastify.log.error({ err }, 'Erro ao gerar recomendações de livros.');
        return reply.status(500).send({ error: 'Erro ao gerar recomendações de livros.' });
      }
    }
  );

  // GET /books/:id — Detalhes de um livro
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const book = await fetchBookDetails(id);
      if (!book) {
        return reply.status(404).send({ error: 'Livro não encontrado.' });
      }
      return reply.send(book);
    } catch (err) {
      fastify.log.error({ err }, 'Erro ao buscar detalhes do livro.');
      return reply.status(500).send({ error: 'Erro ao buscar detalhes do livro.' });
    }
  });
}
