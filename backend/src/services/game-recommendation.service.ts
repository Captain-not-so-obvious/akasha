import { prisma } from '../lib/prisma.js';
import { fetchSimilarGames, fetchPopularGames, fetchGameDetails, GameDetails } from './igdb.service.js';

export interface GameRecommendationItem {
  id: string; // externalId do IGDB
  title: string;
  coverUrl: string | null;
  backdropUrl: string | null;
  releaseYear: number | null;
  genres: string[];
  platforms: string[];
  developer?: string;
  rating?: number;
  score: number;
  reason: string;
  summary?: string;
}

interface UserGameItem {
  externalId: string;
  title: string;
  userRating: number | null;
  status: string;
}

/**
 * Calcula o peso de um jogo da biblioteca do usuário com base na nota e status.
 */
export function calculateGameWeight(item: UserGameItem): number {
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
      statusMultiplier = 1.5;
      break;
    case 'watching': // Jogando
      statusMultiplier = 1.2;
      break;
    case 'plan_to_watch': // Quero Jogar
      statusMultiplier = 1.0;
      break;
  }

  return ratingWeight * statusMultiplier;
}

/**
 * Retorna recomendações de jogos personalizadas para o usuário com base em seu histórico.
 */
export async function getUserGameRecommendations(
  userId: string,
  options: { limit?: number } = {}
): Promise<GameRecommendationItem[]> {
  const limit = options.limit ?? 10;

  // 1. Busca os jogos do usuário no banco
  const userGames = await prisma.wishlist.findMany({
    where: {
      userId,
      domain: 'game',
    },
    orderBy: { updatedAt: 'desc' },
  });

  const existingGameIds = new Set(userGames.map((item) => item.externalId));

  // 2. Filtra apenas itens com peso positivo
  const positiveItems = userGames.filter((item) => {
    const weight = calculateGameWeight({
      externalId: item.externalId,
      title: item.title,
      userRating: item.userRating,
      status: item.status,
    });
    return weight > 0;
  });

  // Se não houver jogos ou avaliações positivas, executa Cold Start de jogos
  if (positiveItems.length === 0) {
    const popularGames = await fetchPopularGames(limit + existingGameIds.size);
    return popularGames
      .filter((game) => !existingGameIds.has(game.id))
      .slice(0, limit)
      .map((game) => ({
        id: game.id,
        title: game.title,
        coverUrl: game.coverUrl,
        backdropUrl: game.backdropUrl,
        releaseYear: game.releaseYear,
        genres: game.genres,
        platforms: game.platforms,
        developer: game.developer,
        rating: game.rating,
        summary: game.summary,
        score: game.rating || 90,
        reason: 'Em alta na Twitch e na comunidade gamer',
      }));
  }

  // Ordena por peso decrescente e recência
  const sortedItems = [...positiveItems].sort((a, b) => {
    const wA = calculateGameWeight({
      externalId: a.externalId,
      title: a.title,
      userRating: a.userRating,
      status: a.status,
    });
    const wB = calculateGameWeight({
      externalId: b.externalId,
      title: b.title,
      userRating: b.userRating,
      status: b.status,
    });

    if (wB !== wA) return wB - wA;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Seleciona as até 3 melhores sementes de jogos
  const seeds = sortedItems.slice(0, 3);
  const candidatesMap = new Map<string, { game: GameDetails; score: number; reason: string }>();

  for (const seed of seeds) {
    const seedWeight = calculateGameWeight({
      externalId: seed.externalId,
      title: seed.title,
      userRating: seed.userRating,
      status: seed.status,
    });

    const similar = await fetchSimilarGames(seed.externalId, 6);

    for (const simGame of similar) {
      if (existingGameIds.has(simGame.id)) {
        continue;
      }

      const existing = candidatesMap.get(simGame.id);
      const addedScore = Math.round(seedWeight * 15 + (simGame.rating || 80) * 0.5);

      if (existing) {
        existing.score += addedScore;
        existing.reason = `Forte afinidade com ${seed.title} e seus gostos`;
      } else {
        candidatesMap.set(simGame.id, {
          game: simGame,
          score: addedScore,
          reason: `Porque você curtiu ${seed.title}`,
        });
      }
    }
  }

  // Se gerou poucos candidatos, complementa com populares
  if (candidatesMap.size < limit) {
    const popular = await fetchPopularGames(limit * 2);
    for (const popGame of popular) {
      if (!existingGameIds.has(popGame.id) && !candidatesMap.has(popGame.id)) {
        candidatesMap.set(popGame.id, {
          game: popGame,
          score: (popGame.rating || 85) * 0.5,
          reason: 'Tendência mais assistida na Twitch',
        });
      }
      if (candidatesMap.size >= limit) break;
    }
  }

  const results: GameRecommendationItem[] = Array.from(candidatesMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ game, score, reason }) => ({
      id: game.id,
      title: game.title,
      coverUrl: game.coverUrl,
      backdropUrl: game.backdropUrl,
      releaseYear: game.releaseYear,
      genres: game.genres,
      platforms: game.platforms,
      developer: game.developer,
      rating: game.rating,
      summary: game.summary,
      score,
      reason,
    }));

  return results;
}
