import { redirect, notFound } from 'next/navigation';
import { codeFromSlug } from '@/lib/geo/countrySlug';

/**
 * 旧国別コミュニティページは廃止。コミュニティ機能は国ハブ (/[country]) に
 * 内包した。/france/community → /france にリダイレクト。
 */
export default function CountryCommunityRedirect({
  params,
}: {
  params: { country: string };
}) {
  if (!codeFromSlug(params.country)) notFound();
  redirect(`/${params.country}`);
}
