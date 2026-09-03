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
  likeCount: number;
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
  likeCount: number;
  tags: Tag[];
  /** 由後端從 content 即時估算（中文 350 字/分、英文 220 詞/分），最少 1。 */
  readingMinutes?: number;
}

// Article knowledge links（知識串連）
export interface SeriesItem {
  id: number;
  title: string;
  slug: string;
  publishedAt?: string;
  note?: string;
  isCurrent?: boolean;
}

export interface RelatedArticles {
  series: SeriesItem[];
  related: SeriesItem[];
}

// 自我覺察日記（薩提爾冰山）— 私人，僅本人可見。一天一篇，各層為選項陣列。
export interface JournalEntry {
  entryDate: string;          // YYYY-MM-DD
  behavior: string[];
  feeling: string[];
  meta: string[];
  view: string[];
  expectSelf: string[];
  expectOther: string[];
  expectFrom: string[];
  values: string[];
  note: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface JournalDay {
  entryDate: string;
  depthFilled: number;
  itemCount: number;
  hasNote: boolean;
  preview: string[];
}

export interface ValueTally { value: string; count: number }

export interface JournalStats {
  totalDays: number;
  last30Days: number;
  currentStreak: number;
  topByField: Record<string, ValueTally[]>;
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
