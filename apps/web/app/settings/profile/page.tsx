import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { ProfileForm } from '@/components/settings/ProfileForm';
import { ResidentProfileForm } from '@/components/settings/ResidentProfileForm';
import { SnsLinksEditor } from '@/components/settings/SnsLinksEditor';
import { getProfileCompleteness } from '@/lib/experts/completeness';
import { SectionProgress } from '@/components/settings/SectionProgress';
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
  // ここではこのページのセクション（sections.profile）の進捗だけを出してハブへ送る。
  const completeness = isWriter ? await getProfileCompleteness(user.id) : null;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-[20px] font-semibold tracking-tight">プロフィール</h2>
        <p className="mt-1 text-[12px] text-foreground/60">
          基本情報（写真・表示名・自己紹介）と、相談者に見せるエキスパート情報を編集します。
        </p>
      </header>

      {/* このページ分（学歴 / 得意分野 / 自己紹介 / 写真）の進捗だけ。全体は /settings ハブに一本化 */}
      {completeness ? (
        <SectionProgress title="プロフィールの進捗" section={completeness.sections.profile} />
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
