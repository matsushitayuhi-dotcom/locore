import { z } from 'zod';
import { Tier, WriterRole } from '@locore/shared';

/** UUID v4 等の ID 文字列。Supabase Auth と整合 */
export const UserIdSchema = z.string().uuid();

/** 公開可能なユーザー情報 */
export const UserSchema = z.object({
  id: UserIdSchema,
  displayName: z.string().min(1).max(80),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  role: z.nativeEnum(WriterRole),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

/** 書き手プロフィール（writer_profiles テーブルに対応） */
export const WriterProfileSchema = z.object({
  userId: UserIdSchema,
  tier: z.nativeEnum(Tier),
  residencyCountry: z.string().length(2).describe('ISO 3166-1 alpha-2'),
  residencyYears: z.number().int().min(0).max(80),
  verifiedAt: z.string().datetime().nullable(),
  bio: z.string().max(2000).nullable(),
});
export type WriterProfile = z.infer<typeof WriterProfileSchema>;

/** ユーザー新規作成入力 */
export const CreateUserSchema = UserSchema.pick({
  displayName: true,
  email: true,
  avatarUrl: true,
}).extend({
  role: z.nativeEnum(WriterRole).default(WriterRole.READER),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
