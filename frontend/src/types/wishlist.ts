import type { MediaType } from './media';

export type DomainType = 'movie' | 'tv' | 'game' | 'book' | 'comic';

export type WishlistStatus = 'plan_to_watch' | 'watching' | 'completed' | 'dropped';

export interface WishlistItem {
  id: number;
  userId: string;
  domain: DomainType;
  externalId: string;
  tmdbId?: number | null;
  mediaType?: MediaType | null;
  status: WishlistStatus;
  userRating: number | null;
  notes: string | null;
  title: string;
  coverUrl?: string | null;
  releaseYear?: number | null;
  extraMeta?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWishlistItemInput {
  domain?: DomainType;
  externalId?: string;
  tmdbId?: number;
  mediaType?: MediaType;
  status?: WishlistStatus;
  userRating?: number;
  notes?: string;
  title?: string;
  posterPath?: string;
  coverUrl?: string;
  releaseYear?: number;
  extraMeta?: Record<string, unknown>;
}

export interface UpdateWishlistItemInput {
  status?: WishlistStatus;
  userRating?: number;
  notes?: string;
  title?: string;
  posterPath?: string;
  coverUrl?: string;
  releaseYear?: number;
  extraMeta?: Record<string, unknown>;
}

export type LibraryItem = WishlistItem & {
  media: import('./media').MediaDetails;
};
