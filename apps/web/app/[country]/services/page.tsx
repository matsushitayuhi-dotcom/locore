import { redirect, notFound } from 'next/navigation';
import { codeFromSlug } from '@/lib/geo/countrySlug';

/**
 * 旧国別サービスページは廃止。グローバル /services の国フィルタへ集約した。
 * /france/services → /services?country=fr にリダイレクト。
 */
export default function CountryServicesRedirect({
  params,
}: {
  params: { country: string };
}) {
  const code = codeFromSlug(params.country);
  if (!code) notFound();
  redirect(`/services?country=${code}`);
}
