import { prisma } from '../lib/prisma.js';
import { DomainType } from '@prisma/client';
import {
  searchBooksByAuthor,
  searchBooksBySubject,
  fetchPopularBooks,
  BookDetails,
} from './books.service.js';

export interface BookRecommendationItem {
  id: string; // externalId do Google Books
  title: string;
  authors: string[];
  coverUrl: string | null;
  releaseYear: number | null;
  categories: string[];
  pageCount?: number;
  score: number;
  reason: string;
}

export interface UserBookItem {
  externalId: string;
  title: string;
  userRating: number | null;
  status: string;
  extraMeta?: Record<string, unknown> | null;
}

/**
 * Calcula o peso de afinidade de um livro da biblioteca do usuário com base na nota e status de leitura.
 */
export function calculateBookWeight(item: UserBookItem): number {
  if (item.status === 'dropped') {
    return -3.0;
  }

  let ratingWeight = 1.0;
  if (item.userRating === 5) {
    ratingWeight = 3.0;
  } else if (item.userRating === 4) {
    ratingWeight = 2.0;
  } else if (item.userRating === 3) {
    ratingWeight = 1.0;
  } else if (item.userRating === 2) {
    ratingWeight = -1.0;
  } else if (item.userRating === 1) {
    ratingWeight = -2.0;
  }

  let statusMultiplier = 1.0;
  switch (item.status) {
    case 'completed':
      statusMultiplier = 1.5; // Lido
      break;
    case 'watching':
      statusMultiplier = 1.2; // Lendo
      break;
    case 'plan_to_watch':
      statusMultiplier = 1.0; // Quero Ler
      break;
  }

  return ratingWeight * statusMultiplier;
}

/**
 * Extrai autores a partir do campo extraMeta salvo na wishlist.
 */
function extractAuthorsFromMeta(extraMeta: unknown): string[] {
  if (extraMeta && typeof extraMeta === 'object' && 'authors' in extraMeta) {
    const raw = (extraMeta as { authors?: unknown }).authors;
    if (Array.isArray(raw)) {
      return raw.filter((a): a is string => typeof a === 'string' && a.trim().length > 0);
    }
  }
  return [];
}

/**
 * Extrai categorias/assuntos a partir do campo extraMeta salvo na wishlist.
 */
function extractCategoriesFromMeta(extraMeta: unknown): string[] {
  if (extraMeta && typeof extraMeta === 'object' && 'categories' in extraMeta) {
    const raw = (extraMeta as { categories?: unknown }).categories;
    if (Array.isArray(raw)) {
      return raw.filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
    }
  }
  return [];
}

/**
 * Retorna recomendações literárias personalizadas para o usuário com base em seu histórico de leituras.
 */
export async function getUserBookRecommendations(
  userId: string,
  options: { limit?: number } = {}
): Promise<BookRecommendationItem[]> {
  const limit = options.limit ?? 10;

  // 1. Busca os livros do usuário no banco
  const userBooks = await prisma.wishlist.findMany({
    where: {
      userId,
      domain: DomainType.book,
    },
    orderBy: { updatedAt: 'desc' },
  });

  const existingBookIds = new Set(userBooks.map((item) => item.externalId));
  const existingTitles = new Set(userBooks.map((item) => item.title.trim().toLowerCase()));

  // 2. Filtra itens com peso positivo (livros amados ou em leitura)
  const positiveItems = userBooks
    .map((item) => ({
      item,
      weight: calculateBookWeight({
        externalId: item.externalId,
        title: item.title,
        userRating: item.userRating,
        status: item.status,
        extraMeta: item.extraMeta as Record<string, unknown> | null,
      }),
    }))
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  // 3. Cold Start: se o usuário não tem livros ou avaliações positivas, recomenda clássicos e populares
  if (positiveItems.length === 0) {
    const popularBooks = await fetchPopularBooks(limit + existingBookIds.size);
    return popularBooks
      .filter((book) => !existingBookIds.has(book.id) && !existingTitles.has(book.title.trim().toLowerCase()))
      .slice(0, limit)
      .map((book) => ({
        id: book.id,
        title: book.title,
        authors: book.authors,
        coverUrl: book.coverUrl,
        releaseYear: book.releaseYear,
        categories: book.categories,
        pageCount: book.pageCount,
        score: 1.0,
        reason: 'Clássico da literatura recomendado para iniciar sua estante no Akasha',
      }));
  }

  // 4. Seleciona até 3 livros semente de maior peso
  const seedItems = positiveItems.slice(0, 3);
  const candidateMap = new Map<string, BookRecommendationItem>();

  for (const { item, weight } of seedItems) {
    const authors = extractAuthorsFromMeta(item.extraMeta);
    const categories = extractCategoriesFromMeta(item.extraMeta);

    // Consulta por autor favorito
    for (const author of authors.slice(0, 2)) {
      if (author === 'Autor Desconhecido') continue;
      const authorBooks = await searchBooksByAuthor(author, 6);
      for (const book of authorBooks) {
        const normalizedTitle = book.title.trim().toLowerCase();
        if (existingBookIds.has(book.id) || existingTitles.has(normalizedTitle)) continue;

        const currentScore = (candidateMap.get(book.id)?.score || 0) + weight * 2.0;
        candidateMap.set(book.id, {
          id: book.id,
          title: book.title,
          authors: book.authors,
          coverUrl: book.coverUrl,
          releaseYear: book.releaseYear,
          categories: book.categories,
          pageCount: book.pageCount,
          score: currentScore,
          reason: `Porque você apreciou obras de ${author}`,
        });
      }
    }

    // Consulta por categoria/assunto
    for (const category of categories.slice(0, 2)) {
      const subjectBooks = await searchBooksBySubject(category, 6);
      for (const book of subjectBooks) {
        const normalizedTitle = book.title.trim().toLowerCase();
        if (existingBookIds.has(book.id) || existingTitles.has(normalizedTitle)) continue;

        if (!candidateMap.has(book.id)) {
          candidateMap.set(book.id, {
            id: book.id,
            title: book.title,
            authors: book.authors,
            coverUrl: book.coverUrl,
            releaseYear: book.releaseYear,
            categories: book.categories,
            pageCount: book.pageCount,
            score: weight * 1.2,
            reason: `Com base no seu interesse em ${category}`,
          });
        }
      }
    }
  }

  // 5. Se os candidatos forem insuficientes para atingir o limite, complementa com populares
  let recommendations = Array.from(candidateMap.values()).sort((a, b) => b.score - a.score);

  if (recommendations.length < limit) {
    const popularBooks = await fetchPopularBooks(limit);
    for (const book of popularBooks) {
      if (recommendations.length >= limit) break;
      const normalizedTitle = book.title.trim().toLowerCase();
      if (!existingBookIds.has(book.id) && !existingTitles.has(normalizedTitle) && !candidateMap.has(book.id)) {
        recommendations.push({
          id: book.id,
          title: book.title,
          authors: book.authors,
          coverUrl: book.coverUrl,
          releaseYear: book.releaseYear,
          categories: book.categories,
          pageCount: book.pageCount,
          score: 0.8,
          reason: 'Leitura aclamada em alta no acervo Akasha',
        });
      }
    }
  }

  return recommendations.slice(0, limit);
}
