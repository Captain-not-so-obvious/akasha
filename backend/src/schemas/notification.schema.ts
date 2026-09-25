import { z } from 'zod';

export const getNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
});

export const notificationIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const savePushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const deletePushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
});

export type GetNotificationsQuery = z.infer<typeof getNotificationsQuerySchema>;
export type NotificationIdParam = z.infer<typeof notificationIdParamSchema>;
export type SavePushSubscriptionBody = z.infer<typeof savePushSubscriptionSchema>;
export type DeletePushSubscriptionBody = z.infer<typeof deletePushSubscriptionSchema>;
