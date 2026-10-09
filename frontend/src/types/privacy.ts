export interface PrivacySettings {
  activityVisibility: 'friends' | 'private';
  discoverableByEmail: boolean;
}

export interface McpConnection {
  id: string;
  clientId: string;
  scope: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface PendingConsentsResponse {
  pending: Array<'terms' | 'privacy'>;
}

export interface UserDataExport {
  exportMetadata: {
    exportDate: string;
    formatVersion: string;
    controller: string;
    contactEmail: string;
    legalGround: string;
  };
  profile: {
    id: string;
    email: string | null;
    username: string | null;
    avatarUrl: string | null;
    friendCode: string | null;
    activityVisibility: string;
    discoverableByEmail: boolean;
    updatedAt: string;
  };
  library: Array<{
    domain: string;
    externalId: string;
    title: string;
    status: string;
    userRating: number | null;
    notes: string | null;
    releaseYear: number | null;
  }>;
  activities: Array<{
    type: string;
    domain: string;
    title: string | null;
    userRating: number | null;
    status: string | null;
    review: string | null;
  }>;
  friends: Array<{
    friendshipId: number;
    friendUsername: string;
    friendsSince: string;
  }>;
  notifications: Array<{
    id: number;
    type: string;
    title: string;
    message: string;
    read: boolean;
  }>;
  mcpConnections: Array<{
    id: string;
    clientId: string;
    scope: string;
    createdAt: string;
    lastUsedAt: string | null;
  }>;
  consents: Array<{
    document: string;
    version: string;
    acceptedAt: string;
  }>;
}
