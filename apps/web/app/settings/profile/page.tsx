import { eq } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/current-user';
import { ProfileForm } from '@/components/settings/ProfileForm';
import { SnsLinksEditor } from '@/components/settings/SnsLinksEditor';

export const metadata = {
  title: 'プロフィール編集',
};

// 認証ユーザー依存・DB アクセスがあるため常に動的レンダリング
export const dynamic = 'force-dynamic';

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser();
  const db = getDb();

  const isWriter = user.role === 'resident_writer' || user.role === 'editor';

  const [writerProfileRows, snsRows] = await Promise.all([
    isWriter
      ? db
          .select({ bio: schema.writerProfiles.bio })
          .from(schema.writerProfiles)
          .where(eq(schema.writerProfiles.userId, user.id))
          .limit(1)
      : Promise.resolve([] as { bio: string | null }[]),
    db
      .select({
        platform: schema.snsLinks.platform,
        url: schema.snsLinks.url,
      })
      .from(schema.snsLinks)
      .where(eq(schema.snsLinks.userId, user.id)),
  ]);

  const writerBio = writerProfileRows[0]?.bio ?? null;

  return (
    <div className="space-y-10">
      <header>
        <h2
          className="text-[20px] font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          プロフィール
        </h2>
        <p className="mt-1 text-[12px] text-foreground/60">
          表示名・自己紹介・アバター画像を編集できます。
        </p>
      </header>

      <ProfileForm
        initial={{
          displayName: user.displayName ?? '',
          bio: user.bio ?? '',
          avatarUrl: user.avatarUrl ?? '',
          writerBio: writerBio ?? '',
        }}
        isWriter={isWriter}
      />

      <SnsLinksEditor
        initial={snsRows.map((r) => ({ platform: r.platform, url: r.url }))}
      />
    </div>
  );
}
