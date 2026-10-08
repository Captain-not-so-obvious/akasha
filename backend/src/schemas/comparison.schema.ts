import { z } from 'zod';

export const compareFriendParamSchema = z.object({
  id: z.string().uuid({ message: 'ID de amigo deve ser um UUID válido.' }),
});

export type CompareFriendParam = z.infer<typeof compareFriendParamSchema>;

export const compareFriendQuerySchema = z.object({
  domain: z.enum(['movie', 'tv', 'game', 'book', 'comic', 'all']).optional(),
});

export type CompareFriendQuery = z.infer<typeof compareFriendQuerySchema>;
