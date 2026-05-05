import { z } from 'zod';
import { ArticleStatus, PRICE_TIERS } from '@locore/shared';
import { UserIdSchema } from './users';

/** ID 型 */
export const ArticleIdSchema = z.string().uuid();

const PriceJpySchema = z
  .number()
  .int()
  .nonnegative()
  .refine((v) => PRICE_TIERS.includes(v), {
    message: `price_jpy must be one of ${PRICE_TIERS.join(', ')}`,
  });

/** 記事に紐づくスポットの最小プレビュー */
export const SpotSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(160),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  category: z.string().max(40).nullable(),
});
export type SpotSummary = z.infer<typeof SpotSummarySchema>;

/** 公開記事の正規スキーマ */
export const ArticleSchema = z.object({
  id: ArticleIdSchema,
  writerId: UserIdSchema,
  cityId: z.string().uuid(),
  title: z.string().min(8).max(120),
  body: z.string().min(1),
  coverImageUrl: z.string().url().nullable(),
  priceJpy: PriceJpySchema,
  status: z.nativeEnum(ArticleStatus),
  tags: z.array(z.string().min(1).max(30)).max(20),
  durationType: z.enum(['under_2h', 'half_day', 'full_day', 'multi_day']).nullable(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  spots: z.array(SpotSummarySchema).max(50).default([]),
});
export type Article = z.infer<typeof ArticleSchema>;

/** 記事新規作成入力 */
export const CreateArticleSchema = ArticleSchema.pick({
  cityId: true,
  title: true,
  body: true,
  coverImageUrl: true,
  priceJpy: true,
  tags: true,
  durationType: true,
}).extend({
  spots: z.array(SpotSummarySchema.omit({ id: true })).min(1).max(50),
  status: z.nativeEnum(ArticleStatus).default(ArticleStatus.DRAFT),
});
export type CreateArticleInput = z.infer<typeof CreateArticleSchema>;

/** GET /articles のページネーションパラメータ */
export const ListArticlesQuerySchema = z.object({
  cityId: z.string().uuid().optional(),
  writerId: UserIdSchema.optional(),
  status: z.nativeEnum(ArticleStatus).default(ArticleStatus.PUBLISHED),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListArticlesQuery = z.infer<typeof ListArticlesQuerySchema>;

/** GET /articles レスポンス */
export const GetArticlesResponseSchema = z.object({
  items: z.array(ArticleSchema),
  nextCursor: z.string().nullable(),
});
export type GetArticlesResponse = z.infer<typeof GetArticlesResponseSchema>;
