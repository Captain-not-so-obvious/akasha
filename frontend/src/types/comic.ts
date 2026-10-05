export interface ComicIssueItem {
  id: string;
  name: string;
  issueNumber?: string;
}

export interface ComicDetails {
  id: string; // Ex: 'cv-4050-3622' ou 'al-30002'
  title: string;
  originalTitle?: string;
  type: 'comic' | 'manga' | 'manhwa';
  description?: string;
  coverUrl: string | null;
  releaseYear: number | null;
  publisher?: string;
  creators: string[];
  genres: string[];
  volumeCount?: number | null;
  issueCount?: number | null;
  chapterCount?: number | null;
  status?: string;
  issues?: ComicIssueItem[]; // Checklist das edições enumeradas que compõem a saga/volume
  reason?: string;
}

export interface ComicRecommendationItem {
  id: string;
  title: string;
  type: 'comic' | 'manga' | 'manhwa';
  coverUrl: string | null;
  releaseYear: number | null;
  publisher?: string;
  creators: string[];
  genres: string[];
  volumeCount?: number | null;
  issueCount?: number | null;
  score: number;
  reason: string;
  description?: string;
}
