import { redirect, notFound } from 'next/navigation';
import { codeFromSlug } from '@/lib/geo/countrySlug';

/**
 * 旧国別記事ページは廃止。グローバル /articles の国フィルタへ集約した。
 * /france/articles → /articles?country=fr にリダイレクト。
 */
export default function CountryArticlesRedirect({
  params,
}: {
  params: { country: string };
}) {
  const code = codeFromSlug(params.country);
  if (!code) notFound();
  redirect(`/articles?country=${code}`);
}
