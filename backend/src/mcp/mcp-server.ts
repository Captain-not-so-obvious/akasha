import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { prisma } from '../lib/prisma.js';
import { getUserRecommendations } from '../services/recommendation.service.js';
import { searchMedia } from '../services/tmdb.service.js';

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
    return {
      tools: [
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
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      if (request.params.name === 'get_recommendations') {
        const mediaType = request.params.arguments?.mediaType as 'movie' | 'tv' | 'all' | undefined;
        const limit = request.params.arguments?.limit as number | undefined;
        const recs = await getUserRecommendations(userId, { mediaType, limit });
        return {
          content: [{ type: 'text', text: JSON.stringify(recs, null, 2) }]
        };
      }

      if (request.params.name === 'search_media') {
        const query = request.params.arguments?.query as string;
        const mediaType = request.params.arguments?.mediaType as 'movie' | 'tv';
        const results = await searchMedia(query, mediaType);
        return {
          content: [{ type: 'text', text: JSON.stringify(results?.results || [], null, 2) }]
        };
      }

      if (request.params.name === 'start_watching') {
        const tmdbId = request.params.arguments?.tmdbId as number;
        const mediaType = request.params.arguments?.mediaType as 'movie' | 'tv';

        // Upsert na wishlist
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

        return {
          content: [{ type: 'text', text: `Status atualizado para 'watching'. ID da lista: ${wishlist.id}` }]
        };
      }

      if (request.params.name === 'remove_from_list') {
        const tmdbId = request.params.arguments?.tmdbId as number;
        const mediaType = request.params.arguments?.mediaType as 'movie' | 'tv';

        await prisma.wishlist.delete({
          where: {
            userId_tmdbId_mediaType: {
              userId,
              tmdbId,
              mediaType,
            },
          },
        });

        return {
          content: [{ type: 'text', text: 'Item removido da lista com sucesso.' }]
        };
      }

      if (request.params.name === 'rate_media') {
        const tmdbId = request.params.arguments?.tmdbId as number;
        const mediaType = request.params.arguments?.mediaType as 'movie' | 'tv';
        const rating = request.params.arguments?.rating as number;

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
            status: 'completed', // Se deu nota, presume-se que assistiu, mas vamos apenas criar
          },
        });

        return {
          content: [{ type: 'text', text: `Nota ${rating} aplicada com sucesso! ID: ${wishlist.id}` }]
        };
      }

      throw new Error(`Tool desconhecida: ${request.params.name}`);
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Erro ao executar tool: ${error.message}` }],
        isError: true,
      };
    }
  });

  return server;
}
