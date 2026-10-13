import { z } from 'zod';

export const searchMediaQuerystringSchema = z.object({
  q: z.string().min(1, 'Parâmetro "q" é obrigatório.').max(200),
  type: z.enum(['movie', 'tv'], {
    errorMap: () => ({ message: 'Parâmetro "type" deve ser "movie" ou "tv".' }),
  }),
  page: z.coerce.number().int().positive().max(100).default(1),
});

export const mediaDetailsParamSchema = z.object({
  type: z.enum(['movie', 'tv'], {
    errorMap: () => ({ message: 'Tipo deve ser "movie" ou "tv".' }),
  }),
  id: z.coerce.number().int().positive('ID da mídia deve ser um número inteiro positivo.'),
});

export type SearchMediaQuerystring = z.infer<typeof searchMediaQuerystringSchema>;
export type MediaDetailsParams = z.infer<typeof mediaDetailsParamSchema>;
