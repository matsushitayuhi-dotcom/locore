/**
 * 駐在員ハブの共有定数 + parseTab。
 *
 * 'use client' を付けないことで、Server Component と Client Component の
 * 両方から import できる。旧 ResidentHubTabs.tsx ('use client') から
 * これらを export していた結果、Server Component で parseTab を呼ぶと
 * 「parseTab is not a function」エラーが本番ビルドで発生していたのを修正。
 */

export const RESIDENT_HUB_TABS = [
  { key: 'overview', label: '概要' },
  { key: 'articles', label: '記事' },
  { key: 'services', label: '出品' },
  { key: 'reviews', label: 'レビュー' },
  { key: 'contact', label: '問い合わせ' },
] as const;

export type ResidentHubTabKey = (typeof RESIDENT_HUB_TABS)[number]['key'];

export function parseTab(
  value: string | null | undefined,
): ResidentHubTabKey {
  const found = RESIDENT_HUB_TABS.find((t) => t.key === value);
  return (found?.key ?? 'overview') as ResidentHubTabKey;
}
