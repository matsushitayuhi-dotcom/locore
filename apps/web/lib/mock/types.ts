// Lightweight types for the mock data layer (prototype only).
// Real types live in @locore/api-contracts; here we keep them minimal.

export type Tier = 'S' | 'A' | 'B';
export type DurationType = '1h' | '半日' | '1日' | '数時間';

export interface Writer {
  id: string;
  name: string;
  city: string; // 居住都市
  cityId: string;
  tier: Tier;
  residencyYears: number;
  bio: string;
  avatarUrl: string;
  isFounding: boolean;
  isVerifiedCreator: boolean;
  social: {
    tiktok?: string;
    instagram?: string;
    youtube?: string;
    x?: string;
  };
  followerCount: number;
}

export interface Article {
  id: string;
  title: string;
  body: string; // markdown-ish
  coverImageUrl: string;
  writerId: string;
  cityId: string;
  area: string; // 例: "マレ" / "20区"
  priceJpy: number;
  tags: string[];
  durationType: DurationType;
  createdAt: string;
  publishedAt: string;
  localScoreAverage: number;
  satisfactionAverage: number;
  reviewCount: number;
  purchaseCount: number;
  spotIds: string[];
}

export interface Spot {
  id: string;
  articleId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  priceEstimate: string;
  openingHours: string;
  tags: string[];
  description?: string;
}

export interface Review {
  id: string;
  articleId: string;
  authorName: string;
  localScore: number;
  satisfaction: number;
  tags: string[];
  body: string;
  visitedAt: string;
}

export interface TripItem {
  id: string;
  startTime: string; // "10:00"
  endTime: string;
  spotId?: string;
  freeSpotName?: string;
  notes?: string;
  budgetJpy?: number;
  travelMinutesAfter?: number;
}

export interface TripDay {
  id: string;
  date: string; // ISO
  label: string; // "Day 1"
  items: TripItem[];
}

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  travelers: number;
  cityId: string;
  days: TripDay[];
}

export interface Collection {
  id: string;
  title: string;
  subtitle: string;
  intro: string;
  coverImageUrl: string;
  curatorName: string;
  curatorRole: string;
  articleIds: string[];
  publishedAt: string;
}

export interface CrisisEvent {
  id: string;
  cityId: string;
  severity: 1 | 2 | 3 | 4 | 5;
  title: string;
  summary: string;
  affectedRoutes?: string[];
  startsAt: string;
  endsAt: string;
}

export interface LightDiary {
  id: string;
  authorName: string;
  avatarUrl: string;
  title: string;
  body: string;
  cityId: string;
  visitedAt: string;
  likes: number;
}
