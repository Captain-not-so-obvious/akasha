import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { prisma } from '../lib/prisma.js';
import { getUserRecommendations } from '../services/recommendation.service.js';
import { searchMedia } from '../services/tmdb.service.js';

export const AKASHA_MCP_TOOLS = [
  {
    name: 'get_recommendations',
    description: 'Obtém recomendações personalizadas de filmes e séries para o usuário baseado em seu histórico no Akasha.',
    inputSchema: {
      type: 'object',
      properties: {
        mediaType: { type: 'string', enum: ['movie', 'tv', 'all'], description: 'Tipo de mídia desejado' },
        limit: { type: 'number', description: 'Número de recomendações desejadas (padrão 10)' }
      }
    }
  },
  {
    name: 'search_media',
    description: 'Busca por filmes ou séries no TMDB por nome.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'O termo de busca (ex: nome do filme)' },
        mediaType: { type: 'string', enum: ['movie', 'tv'], description: 'Tipo de mídia' }
      },
      required: ['query', 'mediaType']
    }
  },
  {
    name: 'start_watching',
    description: 'Adiciona ou atualiza uma mídia na wishlist do usuário marcando-a como "watching" (assistindo).',
    inputSchema: {
      type: 'object',
      properties: {
        tmdbId: { type: 'number', description: 'ID da mídia no TMDB' },
        mediaType: { type: 'string', enum: ['movie', 'tv'], description: 'Tipo de mídia' }
      },
      required: ['tmdbId', 'mediaType']
    }
  },
  {
    name: 'remove_from_list',
    description: 'Remove uma mídia da wishlist do usuário.',
    inputSchema: {
      type: 'object',
      properties: {
        tmdbId: { type: 'number', description: 'ID da mídia no TMDB' },
        mediaType: { type: 'string', enum: ['movie', 'tv'], description: 'Tipo de mídia' }
      },
      required: ['tmdbId', 'mediaType']
    }
  },
  {
    name: 'rate_media',
    description: 'Adiciona uma nota (1 a 5) para uma mídia na wishlist do usuário.',
    inputSchema: {
      type: 'object',
      properties: {
        tmdbId: { type: 'number', description: 'ID da mídia no TMDB' },
        mediaType: { type: 'string', enum: ['movie', 'tv'], description: 'Tipo de mídia' },
        rating: { type: 'number', description: 'Nota de 1 a 5' }
      },
      required: ['tmdbId', 'mediaType', 'rating']
    }
  }
];

export async function executeAkashaMcpTool(name: string, args: any, userId: string) {
  if (name === 'get_recommendations') {
    const mediaType = args?.mediaType as 'movie' | 'tv' | 'all' | undefined;
    const limit = args?.limit as number | undefined;
    const recs = await getUserRecommendations(userId, { mediaType, limit });
    return recs;
  }

  if (name === 'search_media') {
    const query = args?.query as string;
    const mediaType = args?.mediaType as 'movie' | 'tv';
    const results = await searchMedia(query, mediaType);
    return results?.results || [];
  }

  if (name === 'start_watching') {
    const tmdbId = args?.tmdbId as number;
    const mediaType = args?.mediaType as 'movie' | 'tv';

    const wishlist = await prisma.wishlist.upsert({
      where: {
        userId_tmdbId_mediaType: {
          userId,
          tmdbId,
          mediaType,
        },
      },
      update: { status: 'watching' },
      create: {
        userId,
        tmdbId,
        mediaType,
        status: 'watching',
      },
    });

    return { message: `Status atualizado para 'watching'. ID da lista: ${wishlist.id}`, wishlist };
  }

  if (name === 'remove_from_list') {
    const tmdbId = args?.tmdbId as number;
    const mediaType = args?.mediaType as 'movie' | 'tv';

    await prisma.wishlist.delete({
      where: {
        userId_tmdbId_mediaType: {
          userId,
          tmdbId,
          mediaType,
        },
      },
    });

    return { message: 'Item removido da lista com sucesso.' };
  }

  if (name === 'rate_media') {
    const tmdbId = args?.tmdbId as number;
    const mediaType = args?.mediaType as 'movie' | 'tv';
    const rating = args?.rating as number;

    if (rating < 1 || rating > 5) {
      throw new Error('A avaliação deve ser entre 1 e 5 estrelas.');
    }

    const wishlist = await prisma.wishlist.upsert({
      where: {
        userId_tmdbId_mediaType: {
          userId,
          tmdbId,
          mediaType,
        },
      },
      update: { userRating: rating },
      create: {
        userId,
        tmdbId,
        mediaType,
        userRating: rating,
        status: 'completed',
      },
    });

    return { message: `Nota ${rating} aplicada com sucesso! ID: ${wishlist.id}`, wishlist };
  }

  throw new Error(`Tool desconhecida: ${name}`);
}

export function createMcpServer(userId: string): Server {
  const server = new Server(
    {
      name: 'akasha-mcp',
      version: '1.0.0',
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
      const result = await executeAkashaMcpTool(request.params.name, request.params.arguments, userId);
      return {
        content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Erro ao executar tool: ${error.message}` }],
        isError: true,
      };
    }
  });

  return server;
}

