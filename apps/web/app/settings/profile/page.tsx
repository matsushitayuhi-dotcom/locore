import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { ProfileForm } from '@/components/settings/ProfileForm';
import { SnsLinksEditor } from '@/components/settings/SnsLinksEditor';

export const metadata = {
  title: 'プロフィール編集',
};

export const dynamic = 'force-dynamic';

export default async function ProfileSettingsPage() {
  const user = await requireUser('/settings/profile');
  const db = getDb();

  const snsRows = await db
    .select({
      id: schema.snsLinks.id,
      platform: schema.snsLinks.platform,
      url: schema.snsLinks.url,
    })
    .from(schema.snsLinks)
    .where(eq(schema.snsLinks.userId, user.id));

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
