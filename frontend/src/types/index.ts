// User types
export interface User {
  id: number;
  email: string;
  displayName: string;
  avatar?: string;
  role: "admin" | "author" | "user";
  isActive: boolean;
  createdAt: string;
}

// Category types
export interface Category {
  id: number;
  name: string;
  slug: string;
  parentId?: number;
  sortOrder: number;
  children?: Category[];
}

// Tag types
export interface Tag {
  id: number;
  name: string;
  slug: string;
}

// Article types
export type ArticleStatus = "draft" | "published" | "scheduled";

export interface Article {
  id: number;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  coverImage?: string;
  categoryId?: number;
  category?: Category;
  authorId: number;
  author: User;
  status: ArticleStatus;
  publishedAt?: string;
  viewCount: number;
  version: number;
  tags: Tag[];
  createdAt: string;
  updatedAt?: string;
}

export interface ArticleListItem {
  id: number;
  title: string;
  slug: string;
  summary?: string;
  coverImage?: string;
  category?: Category;
  author: Pick<User, "id" | "displayName" | "avatar">;
  status: ArticleStatus;
  publishedAt?: string;
  viewCount: number;
  tags: Tag[];
}

// Comment types
export type CommentStatus = "pending" | "approved" | "rejected";

export interface Comment {
  id: number;
  articleId: number;
  userId: number;
  user: Pick<User, "id" | "displayName" | "avatar">;
  parentId?: number;
  content: string;
  status: CommentStatus;
  replies?: Comment[];
  createdAt: string;
}

// Reaction types
export type ReactionType = "like" | "dislike";

export interface Reaction {
  id: number;
  articleId: number;
  userId?: number;
  type: ReactionType;
}

export interface ReactionCount {
  likes: number;
  dislikes: number;
  userReaction?: ReactionType;
}

// Media types
export interface Media {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}
