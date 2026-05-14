// Lightweight types for the mock data layer (prototype only).
// Real types live in @locore/api-contracts; here we keep them minimal.

export type Tier = 'S' | 'A' | 'B';
export type DurationType = '1h' | '半日' | '1日' | '数時間';

/**
 * 記事の種別タグ。
 * - spot_guide    : 個別の店・場所を紹介する記事
 * - itinerary     : 時間軸ありのコース・モデルプラン
 * - expat_info    : 駐在者・在外邦人向けの生活雑学（殺虫剤どこで買う？医療手続き等）
 * - photo_journal : 写真 + キャプション + 場所のインスタ風ビジュアル記事（縦スクロール）
 */
export type ArticleType =
  | 'spot_guide'
  | 'itinerary'
  | 'expat_info'
  | 'photo_journal';

/** photo_journal の 1 エントリ */
export type PhotoEntry = {
  imageUrl: string;
  caption: string;
  locationName?: string | null;
  spotId?: string | null;
  lat?: number | null;
  lng?: number | null;
  position: number;
};

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

/** 旅程プラン記事の構造化ブロック（articles.itinerary_blocks JSONB と一致） */
export interface ArticleItineraryBlock {
  id: string;
  startTime: string;
  endTime?: string | null;
  spotId?: string | null;
  freeName?: string | null;
  notes?: string | null;
  transportToNext?:
    | 'walk'
    | 'metro'
    | 'bus'
    | 'taxi'
    | 'bike'
    | 'train'
    | 'other'
    | null;
  transportNote?: string | null;
  travelMinutesAfter?: number | null;
}

export interface Article {
  id: string;
  title: string;
  /** 無料プレビュー本文（購入前に見える） */
  body: string; // markdown-ish
  /**
   * 有料部分本文（購入後に解放）。NULL のときは記事詳細側で旧フォールバックが動く
   * （body の冒頭2段落を free、残りを paid とみなす）。
   */
  bodyPaid?: string | null;
  /** 旅程プラン記事の構造化ブロック（articleType==='itinerary' のときに使う） */
  itineraryBlocks?: ArticleItineraryBlock[] | null;
  /** フォト日記の写真エントリ（articleType==='photo_journal' のときに使う） */
  photoEntries?: PhotoEntry[] | null;
  /**
   * クリエイターのサマリ情報（DB 連携で記事と一緒に JOIN して詰められる）。
   * mock や旧データでは undefined のまま → ArticleGrid 側で「匿名」表示。
   */
  writerName?: string;
  writerAvatarUrl?: string | null;
  writerTier?: 'S' | 'A' | 'B';
  writerYears?: number;
  coverImageUrl: string;
  writerId: string;
  cityId: string;
  area: string; // 例: "マレ" / "20区"
  priceJpy: number;
  tags: string[];
  durationType: DurationType;
  /**
   * 記事の種別。`spot_guide`（場所紹介）または `itinerary`（旅程プラン）。
   */
  articleType: ArticleType;
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
  /** Google Places から拾った写真 URL の配列（最大 5 枚） */
  photoUrls?: string[];
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
