import { z } from 'zod';

export const sendFriendRequestSchema = z.object({
  target: z
    .string()
    .trim()
    .min(3, 'O identificador de busca deve ter no mínimo 3 caracteres.')
    .max(120, 'O identificador não pode ultrapassar 120 caracteres.'),
});

export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;

export const respondFriendRequestSchema = z.object({
  action: z.enum(['accept', 'decline', 'block'], {
    errorMap: () => ({ message: 'Ação inválida. Escolha: accept, decline ou block.' }),
  }),
});

export type RespondFriendRequestInput = z.infer<typeof respondFriendRequestSchema>;

export const friendshipParamSchema = z.object({
  id: z.coerce.number().int().positive('ID de solicitação inválido.'),
});

export type FriendshipParam = z.infer<typeof friendshipParamSchema>;

export const friendParamSchema = z.object({
  id: z.string().uuid('ID de usuário inválido.'),
});

export type FriendParam = z.infer<typeof friendParamSchema>;

export const ALLOWED_AVATAR_PREFIXES = [
  'https://api.dicebear.com/7.x/bottts/',
] as const;

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'O nome de usuário deve ter no mínimo 3 caracteres.')
    .max(30, 'O nome de usuário deve ter no máximo 30 caracteres.')
    .regex(/^[a-zA-Z0-9_-]+$/, 'O nome de usuário pode conter apenas letras, números, hifens e sublinhados.')
    .optional(),
  avatarUrl: z
    .string()
    .max(500_000, 'A imagem não pode ultrapassar 500KB.')
    .refine(
      (val) => {
        // 1. Imagem raster codificada via upload local
        if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(val)) return true;
        // 2. Avatares temáticos oficiais Akasha
        if (ALLOWED_AVATAR_PREFIXES.some(prefix => val.startsWith(prefix))) return true;
        // 3. Avatares oficiais do Google OAuth
        if (/^https:\/\/([a-zA-Z0-9_.-]+\.)?googleusercontent\.com\//i.test(val)) return true;
        return false;
      },
      {
        message:
          'Foto de perfil inválida. Selecione uma foto do seu dispositivo, use um avatar temático ou sua conta Google.',
      }
    )
    .nullable()
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
