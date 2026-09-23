export interface Friend {
  friendshipId: number;
  id: string;
  username: string;
  avatarUrl: string | null;
  friendCode: string | null;
  totalMedia: number;
  friendsSince: string;
}

export interface FriendRequestUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  friendCode: string | null;
  totalMedia?: number;
}

export interface FriendRequestItem {
  id: number;
  createdAt: string;
  user: FriendRequestUser;
}

export interface FriendRequestsData {
  received: FriendRequestItem[];
  sent: FriendRequestItem[];
}

export interface UserProfileData {
  id: string;
  email: string | null;
  username: string | null;
  avatarUrl: string | null;
  friendCode: string | null;
  totalMedia: number;
  totalFriends: number;
}

export interface BlockedUser {
  friendshipId: number;
  id: string;
  username: string;
  avatarUrl: string | null;
  friendCode: string | null;
  blockedAt: string;
}

