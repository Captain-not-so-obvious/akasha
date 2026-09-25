export type NotificationType =
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'FRIEND_RATED'
  | 'NEW_EPISODE'
  | 'SYSTEM';

export interface NotificationData {
  tmdbId?: number;
  mediaType?: 'movie' | 'tv';
  friendId?: string;
  authorUsername?: string;
  authorAvatarUrl?: string | null;
  requesterUsername?: string;
  requesterAvatarUrl?: string | null;
  posterPath?: string | null;
  stillUrl?: string | null;
  userRating?: number;
  review?: string | null;
  episodeId?: number;
  episodeName?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  actionUrl?: string;
}

export interface NotificationItem {
  id: number;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    unreadCount: number;
  };
}
