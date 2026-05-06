import { eq } from 'drizzle-orm';
import { schema, DEFAULT_NOTIFICATION_PREFERENCES } from '@locore/db';
import type { NotificationPreferences } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { requireUser } from '@/lib/auth/require-user';
import { NotificationPrefsForm } from '@/components/settings/NotificationPrefsForm';

export const metadata = {
  title: '通知設定',
};

export const dynamic = 'force-dynamic';

export default async function NotificationsSettingsPage() {
  const user = await requireUser('/settings/notifications');
  const db = getDb();

  const rows = await db
    .select({ prefs: schema.users.notificationPreferences })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1);

  const prefs: NotificationPreferences =
    (rows[0]?.prefs as NotificationPreferences | undefined) ??
    DEFAULT_NOTIFICATION_PREFERENCES;

  return (
    <div className="space-y-8">
      <header>
        <h2
          className="text-[20px] font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-serif-jp), var(--font-serif), serif' }}
        >
          通知
        </h2>
        <p className="mt-1 text-[12px] text-foreground/60">
          各通知タイプごとに、Web Push とメールの ON/OFF を切り替えられます。
        </p>
      </header>

      <NotificationPrefsForm initial={prefs} />
    </div>
  );
}
