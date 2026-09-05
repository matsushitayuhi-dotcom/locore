import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { ArrowRight, Globe } from 'lucide-react';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { ProfileForm } from '@/components/settings/ProfileForm';
import { ResidentProfileForm } from '@/components/settings/ResidentProfileForm';
import { SnsLinksEditor } from '@/components/settings/SnsLinksEditor';
import { getProfileCompleteness } from '@/lib/experts/completeness';
import type { FamilyStage, LanguageLevel } from '@/lib/resident/constants';

export const metadata = {
  title: 'プロフィール編集',
};

export const dynamic = 'force-dynamic';

export default async function ProfileSettingsPage() {
  const user = await requireUser('/settings/profile');
  const db = getDb();
  const isWriter = user.role === 'resident_writer' || user.role === 'editor';

  const [snsRows, fullUser] = await Promise.all([
    db
      .select({
        id: schema.snsLinks.id,
        platform: schema.snsLinks.platform,
        url: schema.snsLinks.url,
      })
      .from(schema.snsLinks)
      .where(eq(schema.snsLinks.userId, user.id)),
    db
      .select({
        homeCountry: schema.users.homeCountry,
        homeRegion: schema.users.homeRegion,
        residencyCountry: schema.users.residencyCountry,
        residencyCity: schema.users.residencyCity,
        arrivalYear: schema.users.arrivalYear,
        familyStage: schema.users.familyStage,
        occupation: schema.users.occupation,
        coverImageUrl: schema.users.coverImageUrl,
        offerings: schema.users.offerings,
        specialties: schema.users.specialties,
        education: schema.users.education,
        workHistory: schema.users.workHistory,
        languages: schema.users.languages,
        interests: schema.users.interests,
        lookingFor: schema.users.lookingFor,
        openToMeetups: schema.users.openToMeetups,
      })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1),
  ]);

  const me = fullUser[0];
  // 公開の可否はメニュー作成など他タブにも依存するので、公開ボタンは /settings ハブに一本化。
  // ここでは完成度と「あと何が必要か」だけを短く示してハブへ送る。
  const completeness = isWriter ? await getProfileCompleteness(user.id) : null;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-[20px] font-semibold tracking-tight">プロフィール</h2>
        <p className="mt-1 text-[12px] text-foreground/60">
          基本情報（写真・表示名・自己紹介）と、相談者に見せるエキスパート情報を編集します。
        </p>
      </header>

      {completeness ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border bg-muted px-4 py-3 text-[12.5px]">
          <span className="inline-flex items-center gap-2 font-semibold">
            <span className="text-[16px] tabular-nums text-primary-700">{completeness.percent}%</span>
            完成
          </span>
          <span className="h-1.5 w-28 overflow-hidden rounded-full bg-border">
            <span
              className="block h-full rounded-full bg-primary-500"
              style={{ width: `${completeness.percent}%` }}
            />
          </span>
          <span className="text-foreground/60">
            {completeness.published
              ? '公開中'
              : completeness.canPublish
                ? '公開できます'
                : `公開に必要: ${completeness.missingLabels.join('・')}`}
          </span>
          <Link
            href="/settings"
            className="ml-auto inline-flex items-center gap-1 font-bold text-primary-700 hover:underline hover:underline-offset-4"
          >
            <Globe className="h-3.5 w-3.5" aria-hidden />
            公開ステータス
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      ) : null}

      <ProfileForm
        initial={{
          displayName: user.displayName ?? '',
          bio: user.bio ?? '',
          avatarUrl: user.avatarUrl ?? '',
        }}
      />

      <ResidentProfileForm
        initial={{
          homeRegion: me?.homeRegion ?? '',
          residencyCountry: me?.residencyCountry ?? '',
          residencyCity: me?.residencyCity ?? '',
          arrivalYear: me?.arrivalYear ?? null,
          familyStage: (me?.familyStage as FamilyStage | null) ?? '',
          occupation: me?.occupation ?? '',
          coverImageUrl: me?.coverImageUrl ?? '',
          offerings: (me?.offerings ?? []) as string[],
          specialties: (me?.specialties ?? []) as string[],
          education: me?.education ?? [],
          workHistory: me?.workHistory ?? [],
          languages: (me?.languages ?? []) as Array<{
            code: string;
            level: LanguageLevel;
          }>,
          interests: (me?.interests ?? []) as string[],
          lookingFor: (me?.lookingFor ?? []) as string[],
          openToMeetups: me?.openToMeetups ?? false,
        }}
      />

      <SnsLinksEditor
        initial={snsRows.map((r) => ({
          id: r.id,
          platform: r.platform,
          url: r.url,
        }))}
      />
    </div>
  );
}
