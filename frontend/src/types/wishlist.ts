import type { MediaType } from './media';

export type WishlistStatus = 'plan_to_watch' | 'watching' | 'completed' | 'dropped';

export interface WishlistItem {
  id: number;
  userId: string;
  tmdbId: number;
  mediaType: MediaType;
  status: WishlistStatus;
  userRating: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWishlistItemInput {
  tmdbId: number;
  mediaType: MediaType;
  status?: WishlistStatus;
  userRating?: number;
  notes?: string;
}

export interface UpdateWishlistItemInput {
  status?: WishlistStatus;
  userRating?: number;
  notes?: string;
}

export type LibraryItem = WishlistItem & {
  media: import('./media').MediaDetails;
};
