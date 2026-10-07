import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { prisma } from '../lib/prisma.js';
import { getUserRecommendations } from '../services/recommendation.service.js';
import { searchMedia } from '../services/tmdb.service.js';
import { searchGames } from '../services/igdb.service.js';
import { getUserGameRecommendations } from '../services/game-recommendation.service.js';
import { searchBooks } from '../services/books.service.js';
import { getUserBookRecommendations } from '../services/book-recommendation.service.js';
import { searchComics } from '../services/comics.service.js';
import { getUserComicRecommendations } from '../services/comic-recommendation.service.js';
import {
  getUserTransmediaRecommendations,
  getUserArchiveStats,
  CANONICAL_FRANCHISES,
} from '../services/transmedia.service.js';
import { DomainType, WatchStatus } from '@prisma/client';

export const AKASHA_MCP_TOOLS = [
  {
    name: 'search_media',
    description: 'Busca por obras de qualquer mídia no Akasha: filmes, séries, jogos, livros e quadrinhos.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'O termo de busca (ex: título da obra)' },
        domain: {
          type: 'string',
          enum: ['movie', 'tv', 'game', 'book', 'comic'],
          description: 'Domínio cultural da busca (movie, tv, game, book, comic)',
        },
        mediaType: {
          type: 'string',
          enum: ['movie', 'tv'],
          description: '[Legado/Compatibilidade] Use domain em vez de mediaType',
        },
        limit: { type: 'number', description: 'Número máximo de resultados (padrão 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_recommendations',
    description: 'Obtém recomendações personalizadas baseadas no histórico do usuário para cinema, games, livros, quadrinhos ou conexões transmídia.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          enum: ['movie', 'tv', 'game', 'book', 'comic', 'transmedia', 'all'],
          description: 'Domínio desejado para recomendações. Use "transmedia" para descobertas cruzadas entre franquias.',
        },
        mediaType: {
          type: 'string',
          enum: ['movie', 'tv', 'all'],
          description: '[Legado/Compatibilidade] Use domain em vez de mediaType',
        },
        limit: { type: 'number', description: 'Número de recomendações desejadas (padrão 10)' },
      },
    },
  },
  {
    name: 'add_to_library',
    description: 'Adiciona ou atualiza uma obra no acervo pessoal do usuário em qualquer domínio cultural (cinema, tv, games, livros, quadrinhos).',
    inputSchema: {
      type: 'object',
      properties: {
        externalId: { type: 'string', description: 'Identificador único da obra no domínio' },
        domain: {
          type: 'string',
          enum: ['movie', 'tv', 'game', 'book', 'comic'],
          description: 'Domínio cultural da obra',
        },
        status: {
          type: 'string',
          enum: ['plan_to_watch', 'watching', 'completed', 'dropped'],
          description: 'Status no acervo: plan_to_watch (Quero Ver/Jogar/Ler), watching (Consumindo), completed (Concluído), dropped (Abandonado)',
        },
        title: { type: 'string', description: 'Título da obra' },
        coverUrl: { type: 'string', description: 'URL da capa ou pôster' },
        releaseYear: { type: 'number', description: 'Ano de lançamento' },
        userRating: { type: 'number', description: 'Nota opcional de 1 a 5 estrelas' },
        notes: { type: 'string', description: 'Anotações pessoais ou resenha' },
      },
      required: ['externalId', 'domain'],
    },
  },
  {
    name: 'rate_media',
    description: 'Avalia uma obra (de 1 a 5 estrelas) no acervo pessoal do usuário em qualquer domínio.',
    inputSchema: {
      type: 'object',
      properties: {
        externalId: { type: 'string', description: 'Identificador da obra' },
        domain: {
          type: 'string',
          enum: ['movie', 'tv', 'game', 'book', 'comic'],
          description: 'Domínio cultural',
        },
        rating: { type: 'number', description: 'Nota de 1 a 5 estrelas' },
        notes: { type: 'string', description: 'Comentário ou resenha opcional' },
        tmdbId: { type: 'number', description: '[Legado/Compatibilidade] ID TMDB' },
        mediaType: { type: 'string', enum: ['movie', 'tv'], description: '[Legado/Compatibilidade]' },
      },
      required: ['rating'],
    },
  },
  {
    name: 'remove_from_list',
    description: 'Remove uma obra do acervo do usuário em qualquer domínio.',
    inputSchema: {
      type: 'object',
      properties: {
        externalId: { type: 'string', description: 'Identificador da obra' },
        domain: {
          type: 'string',
          enum: ['movie', 'tv', 'game', 'book', 'comic'],
          description: 'Domínio cultural',
        },
        tmdbId: { type: 'number', description: '[Legado/Compatibilidade] ID TMDB' },
        mediaType: { type: 'string', enum: ['movie', 'tv'], description: '[Legado/Compatibilidade]' },
      },
    },
  },
  {
    name: 'get_library_stats',
    description: 'Retorna o Dashboard analítico do Grande Acervo: métricas consolidadas de consumo cultural por domínio, horas/páginas estimadas, franquias e Índice de Amplitude Cultural.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_transmedia_connections',
    description: 'Retorna descobertas e pontes transmídia conectando universos entre cinema, games, livros e quadrinhos para o usuário.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Quantidade máxima de conexões (padrão 10)' },
      },
    },
  },
  {
    name: 'start_watching',
    description: '[Compatibilidade Legada] Marca uma obra de cinema ou TV como em andamento.',
    inputSchema: {
      type: 'object',
      properties: {
        tmdbId: { type: 'number', description: 'ID da mídia no TMDB' },
        mediaType: { type: 'string', enum: ['movie', 'tv'], description: 'Tipo de mídia' },
      },
      required: ['tmdbId', 'mediaType'],
    },
  },
];

export async function executeAkashaMcpTool(name: string, args: Record<string, unknown>, userId: string) {
  // 1. search_media
  if (name === 'search_media') {
    const query = String(args?.query || '');
    const domain = (args?.domain as DomainType) || (args?.mediaType as DomainType) || 'movie';
    const limit = typeof args?.limit === 'number' ? args.limit : 10;

    if (domain === 'game') {
      const results = await searchGames(query, limit);
      return { domain, count: results.length, results };
    }
    if (domain === 'book') {
      const results = await searchBooks(query, limit);
      return { domain, count: results.length, results };
    }
    if (domain === 'comic') {
      const results = await searchComics(query, 'all', limit);
      return { domain, count: results.length, results };
    }
    // movie ou tv
    const mediaType = domain === 'tv' ? 'tv' : 'movie';
    const results = await searchMedia(query, mediaType);
    return { domain, count: results?.results?.length || 0, results: results?.results || [] };
  }

  // 2. get_recommendations
  if (name === 'get_recommendations') {
    const domain = (args?.domain as string) || (args?.mediaType as string) || 'all';
    const limit = typeof args?.limit === 'number' ? args.limit : 10;

    if (domain === 'game') {
      const recommendations = await getUserGameRecommendations(userId, { limit });
      return { domain: 'game', recommendations };
    }
    if (domain === 'book') {
      const recommendations = await getUserBookRecommendations(userId, { limit });
      return { domain: 'book', recommendations };
    }
    if (domain === 'comic') {
      const recommendations = await getUserComicRecommendations(userId, { limit });
      return { domain: 'comic', recommendations };
    }
    if (domain === 'transmedia') {
      const recommendations = await getUserTransmediaRecommendations(userId, limit);
      return { domain: 'transmedia', recommendations };
    }
    // movie, tv ou all
    const mediaType = domain === 'movie' || domain === 'tv' ? domain : 'all';
    const recommendations = await getUserRecommendations(userId, { mediaType, limit });
    return { domain, recommendations };
  }

  // 3. add_to_library
  if (name === 'add_to_library') {
    const externalId = String(args?.externalId || '');
    const domain = (args?.domain as DomainType) || 'movie';
    const status = (args?.status as WatchStatus) || 'plan_to_watch';
    const title = typeof args?.title === 'string' ? args.title : 'Sem título';
    const coverUrl = typeof args?.coverUrl === 'string' ? args.coverUrl : null;
    const releaseYear = typeof args?.releaseYear === 'number' ? args.releaseYear : null;
    const userRating = typeof args?.userRating === 'number' ? args.userRating : null;
    const notes = typeof args?.notes === 'string' ? args.notes : null;

    const wishlist = await prisma.wishlist.upsert({
      where: {
        userId_domain_externalId: {
          userId,
          domain,
          externalId,
        },
      },
      update: {
        status,
        ...(userRating !== null ? { userRating } : {}),
        ...(notes !== null ? { notes } : {}),
        title,
        ...(coverUrl ? { coverUrl } : {}),
        ...(releaseYear ? { releaseYear } : {}),
      },
      create: {
        userId,
        domain,
        externalId,
        status,
        title,
        coverUrl,
        releaseYear,
        userRating,
        notes,
      },
    });

    return {
      message: `Obra adicionada/atualizada com sucesso no domínio ${domain}!`,
      wishlist,
    };
  }

  // 4. rate_media
  if (name === 'rate_media') {
    const rating = Number(args?.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      throw new Error('A avaliação deve ser entre 1 e 5 estrelas.');
    }

    const externalId = String(args?.externalId || args?.tmdbId || '');
    const domain = (args?.domain as DomainType) || (args?.mediaType as DomainType) || 'movie';
    const notes = typeof args?.notes === 'string' ? args.notes : null;

    if (!externalId) {
      throw new Error('externalId ou tmdbId é obrigatório.');
    }

    const wishlist = await prisma.wishlist.upsert({
      where: {
        userId_domain_externalId: {
          userId,
          domain,
          externalId,
        },
      },
      update: {
        userRating: rating,
        status: 'completed',
        ...(notes ? { notes } : {}),
      },
      create: {
        userId,
        domain,
        externalId,
        userRating: rating,
        status: 'completed',
        notes,
        title: 'Obra Avaliada via MCP',
      },
    });

    return {
      message: `Nota ${rating}★ aplicada com sucesso para ${domain}:${externalId}!`,
      wishlist,
    };
  }

  // 5. remove_from_list
  if (name === 'remove_from_list') {
    const externalId = String(args?.externalId || args?.tmdbId || '');
    const domain = (args?.domain as DomainType) || (args?.mediaType as DomainType) || 'movie';

    if (!externalId) {
      throw new Error('externalId ou tmdbId é obrigatório.');
    }

    await prisma.wishlist.deleteMany({
      where: {
        userId,
        domain,
        externalId,
      },
    });

    return { message: `Obra ${domain}:${externalId} removida da lista com sucesso.` };
  }

  // 6. get_library_stats
  if (name === 'get_library_stats') {
    const stats = await getUserArchiveStats(userId);
    return stats;
  }

  // 7. get_transmedia_connections
  if (name === 'get_transmedia_connections') {
    const limit = typeof args?.limit === 'number' ? args.limit : 10;
    const recommendations = await getUserTransmediaRecommendations(userId, limit);
    return {
      totalFound: recommendations.length,
      recommendations,
      availableFranchises: CANONICAL_FRANCHISES.map((f) => f.name),
    };
  }

  // 8. start_watching (compatibilidade legada)
  if (name === 'start_watching') {
    const tmdbId = args?.tmdbId as number;
    const mediaType = (args?.mediaType as 'movie' | 'tv') || 'movie';

    const wishlist = await prisma.wishlist.upsert({
      where: {
        userId_domain_externalId: {
          userId,
          domain: mediaType,
          externalId: String(tmdbId),
        },
      },
      update: { status: 'watching' },
      create: {
        userId,
        domain: mediaType,
        externalId: String(tmdbId),
        tmdbId,
        mediaType,
        status: 'watching',
      },
    });

    return { message: `Status atualizado para 'watching'. ID da lista: ${wishlist.id}`, wishlist };
  }

  throw new Error(`Tool desconhecida: ${name}`);
}

export function createMcpServer(userId: string): Server {
  const server = new Server(
    {
      name: 'akasha-mcp',
      version: '1.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: AKASHA_MCP_TOOLS };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const result = await executeAkashaMcpTool(request.params.name, (request.params.arguments || {}) as Record<string, unknown>, userId);
      return {
        content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Erro ao executar tool: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}
