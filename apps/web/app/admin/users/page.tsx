import Link from 'next/link';
import { and, desc, eq, ilike, isNull, or, sql, count } from 'drizzle-orm';
import { Search, Users2, Mail, Shield } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@locore/ui';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { AdminPageHeader } from '../_components/AdminPageHeader';
import { UserRoleSelect } from './UserRoleSelect';

/**
 * /admin/users — ユーザー一覧。
 *
 * 機能:
 *   - 検索 (q): displayName / email
 *   - フィルタ: role / 削除済み含むか
 *   - 各行で role 変更 (Server Action)
 *
 * Stub 機能 (今は未実装、ボタンは出さない):
 *   - アカウント停止 / 削除
 *   - 詳細ページ
 *   - Founders 付与
 */

export const metadata = { title: 'ユーザー管理 — Admin' };
export const dynamic = 'force-dynamic';

type Search = {
  q?: string;
  role?: string;
  page?: string;
};

const ROLES = ['reader', 'resident_writer', 'editor', 'light_diarist'] as const;
type RoleValue = (typeof ROLES)[number];

const ROLE_LABEL: Record<RoleValue, string> = {
  reader: '読者',
  resident_writer: 'ライター',
  editor: '編集者',
  light_diarist: '日記',
};

const PAGE_SIZE = 50;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Search;
}) {
  const db = getDb();
  const q = (searchParams?.q ?? '').trim();
  const roleFilter = (searchParams?.role ?? '').trim() as RoleValue | '';
  const page = Math.max(1, parseInt(searchParams?.page ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const filters = [isNull(schema.users.deletedAt)];
  if (q) {
    filters.push(
      or(
        ilike(schema.users.displayName, `%${q}%`),
        ilike(schema.users.email, `%${q}%`),
      )!,
    );
  }
  if (roleFilter && (ROLES as readonly string[]).includes(roleFilter)) {
    filters.push(eq(schema.users.role, roleFilter as RoleValue));
  }

  const [rows, totalRows, roleCountRows] = await Promise.all([
    db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        role: schema.users.role,
        createdAt: schema.users.createdAt,
        residencyCountry: schema.users.residencyCountry,
        residencyCity: schema.users.residencyCity,
        isSample: schema.users.isSample,
      })
      .from(schema.users)
      .where(and(...filters))
      .orderBy(desc(schema.users.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ c: count() })
      .from(schema.users)
      .where(and(...filters)),
    db
      .select({ role: schema.users.role, c: count() })
      .from(schema.users)
      .where(isNull(schema.users.deletedAt))
      .groupBy(schema.users.role),
  ]);

  const total = totalRows[0]?.c ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const roleCounts = Object.fromEntries(roleCountRows.map((r) => [r.role, r.c]));

  return (
    <div>
      <AdminPageHeader
        title="ユーザー管理"
        description="登録ユーザーの検索・ロール変更。アカウント停止は Supabase Studio から実施。"
        kicker={
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-300">
            <Users2 className="mr-1 inline h-3 w-3" />
            {total.toLocaleString('ja-JP')} 件
          </p>
        }
      />

      {/* ロール別サマリチップ */}
      <div className="mb-4 flex flex-wrap gap-2">
        <RoleChip
          label="すべて"
          active={!roleFilter}
          count={Object.values(roleCounts).reduce((a, b) => a + b, 0)}
          href={`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`}
        />
        {ROLES.map((r) => (
          <RoleChip
            key={r}
            label={ROLE_LABEL[r]}
            active={roleFilter === r}
            count={roleCounts[r] ?? 0}
            href={`/admin/users?role=${r}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
          />
        ))}
      </div>

      {/* 検索フォーム */}
      <form action="/admin/users" method="GET" className="mb-4">
        {roleFilter ? (
          <input type="hidden" name="role" value={roleFilter} />
        ) : null}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="名前・メールで検索"
            className="h-10 w-full rounded-md border border-border bg-card pl-8 pr-3 text-[13px] focus:border-2 focus:border-primary-500 focus:pl-[31px] focus:outline-none"
          />
        </div>
      </form>

      {/* 一覧 */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-foreground/55">
            該当ユーザーが見つかりません。
          </p>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="border-b border-border bg-background/40 text-[10px] font-bold uppercase tracking-wider text-foreground/55">
              <tr>
                <th className="px-3 py-2 text-left">ユーザー</th>
                <th className="px-3 py-2 text-left">在住</th>
                <th className="px-3 py-2 text-left">登録</th>
                <th className="px-3 py-2 text-left">ロール</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-muted/40">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar size="sm">
                        {u.avatarUrl ? (
                          <AvatarImage src={u.avatarUrl} alt="" />
                        ) : null}
                        <AvatarFallback>
                          {u.displayName[0]?.toUpperCase() ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <Link
                          href={`/residents/${u.id}`}
                          className="block truncate text-[13px] font-semibold hover:text-primary-300"
                        >
                          {u.displayName}
                          {u.isSample ? (
                            <span className="ml-1.5 rounded-sm bg-muted px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/55">
                              sample
                            </span>
                          ) : null}
                        </Link>
                        <p className="truncate text-[11px] text-foreground/55">
                          <Mail className="mr-0.5 inline h-2.5 w-2.5" />
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[12px] text-foreground/70">
                    {u.residencyCity || u.residencyCountry ? (
                      <span>
                        {u.residencyCity ?? ''}
                        {u.residencyCity && u.residencyCountry ? ', ' : ''}
                        {u.residencyCountry ?? ''}
                      </span>
                    ) : (
                      <span className="text-foreground/30">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[11px] tabular text-foreground/65">
                    {u.createdAt.toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-3 py-3">
                    <UserRoleSelect
                      userId={u.id}
                      currentRole={u.role as RoleValue}
                    />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/residents/${u.id}`}
                      className="text-[11px] text-primary-300 hover:underline"
                    >
                      プロフィール →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ページング */}
      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-[11px] text-foreground/55">
          <span>
            {offset + 1} – {Math.min(offset + PAGE_SIZE, total)} / {total} 件
          </span>
          <div className="flex gap-1">
            {page > 1 ? (
              <Link
                href={buildPageHref(searchParams, page - 1)}
                className="rounded-md bg-card px-3 py-1 ring-1 ring-border hover:bg-muted"
              >
                ← 前
              </Link>
            ) : null}
            <span className="rounded-md bg-muted px-3 py-1 tabular">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={buildPageHref(searchParams, page + 1)}
                className="rounded-md bg-card px-3 py-1 ring-1 ring-border hover:bg-muted"
              >
                次 →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* 補足 */}
      <p className="mt-6 inline-flex items-center gap-1.5 text-[10px] text-foreground/45">
        <Shield className="h-3 w-3" />
        ロール変更は即時反映。アカウント停止 / 削除は Supabase Studio から。
      </p>
    </div>
  );
}

function buildPageHref(s: Search | undefined, page: number): string {
  const params = new URLSearchParams();
  if (s?.q) params.set('q', s.q);
  if (s?.role) params.set('role', s.role);
  params.set('page', String(page));
  return `/admin/users?${params.toString()}`;
}

function RoleChip({
  label,
  active,
  count,
  href,
}: {
  label: string;
  active: boolean;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition ' +
        (active
          ? 'bg-foreground text-background'
          : 'bg-card text-foreground/65 ring-1 ring-border hover:bg-muted')
      }
    >
      {label}
      <span className={'tabular ' + (active ? 'opacity-75' : 'opacity-55')}>
        {count.toLocaleString('ja-JP')}
      </span>
    </Link>
  );
}
