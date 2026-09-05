import type { EducationEntry } from '@locore/db';

/**
 * 学歴の学校名表示ヘルパ。
 *
 * オートコンプリート（0081 大学マスタ）経由の学歴は school（日本語優先の表示名）
 * と schoolNameEn（英語名）の両方を持つ。表示側はこのヘルパを使い、
 * 「ハーバード大学（Harvard University）」のように正式名称＋英語名で出す。
 * /experts のプロフィール・経歴・詳細ヒーローの適用は再デザイン側が行う。
 */
export function formatSchoolName(
  entry: Pick<EducationEntry, 'school' | 'schoolNameEn'>,
): string {
  const ja = entry.school?.trim() ?? '';
  const en = entry.schoolNameEn?.trim() ?? '';
  if (ja && en && ja !== en) return `${ja}（${en}）`;
  return ja || en;
}
