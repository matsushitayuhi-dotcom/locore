import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { ProfileForm } from '@/components/settings/ProfileForm';
import { ResidentProfileForm } from '@/components/settings/ResidentProfileForm';
import { SnsLinksEditor } from '@/components/settings/SnsLinksEditor';
import type { FamilyStage, LanguageLevel } from '@/lib/resident/constants';

export const metadata = {
  title: 'プロフィール編集',
};

export const dynamic = 'force-dynamic';

export default async function ProfileSettingsPage() {
  const user = await requireUser('/settings/profile');
  const db = getDb();

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

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-[20px] font-semibold tracking-tight">プロフィール</h2>
        <p className="mt-1 text-[12px] text-foreground/60">
          表示名・自己紹介・プロフィール画像・SNS リンクを編集できます。
        </p>
      </header>

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
