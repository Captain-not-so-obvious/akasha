export type ActivityType = 'ADDED_TO_LIST' | 'STATUS_CHANGED' | 'RATED_MEDIA';
export type MediaType = 'movie' | 'tv';
export type WatchStatus = 'plan_to_watch' | 'watching' | 'completed' | 'dropped';

export interface ActivityProfile {
  id: string;
  username: string | null;
  avatarUrl: string | null;
}

export interface ActivityItem {
  id: number;
  userId: string;
  type: ActivityType;
  tmdbId: number;
  mediaType: MediaType;
  title: string | null;
  posterPath: string | null;
  userRating: number | null;
  status: WatchStatus | null;
  review?: string | null;
  createdAt: string;
  profile: ActivityProfile;
}

export interface ActivityFeedResponse {
  activities: ActivityItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
