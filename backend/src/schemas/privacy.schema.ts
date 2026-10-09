import { z } from 'zod';

export const updatePrivacySettingsSchema = z.object({
  activityVisibility: z.enum(['friends', 'private']).optional(),
  discoverableByEmail: z.boolean().optional(),
});

export const acceptConsentSchema = z.object({
  document: z.enum(['terms', 'privacy']),
  version: z.string().min(1).max(50),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal('EXCLUIR'),
});

export const connectionParamSchema = z.object({
  id: z.string().uuid(),
});

export type UpdatePrivacySettingsInput = z.infer<typeof updatePrivacySettingsSchema>;
export type AcceptConsentInput = z.infer<typeof acceptConsentSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
