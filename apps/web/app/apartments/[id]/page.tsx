import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Bed,
  Maximize,
  MapPin,
  Calendar,
  Sofa,
  PawPrint,
  Cigarette,
  Zap,
  Wallet,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { getCommunityPost, incrementViewCount } from '@/lib/community/db';
import {
  APARTMENT_LISTING_TYPE_LABEL,
  type ApartmentListingType,
  type ApartmentMetadata,
} from '@/lib/community/constants';
import { getCurrentUser } from '@/lib/auth/current-user';
import { markdownToHtml } from '@/lib/markdown/toHtml';
import { ApplyButton } from '@/components/community/ApplyButton';
import { AudienceBadge } from '@/components/community/AudienceBadge';
import { OwnerViewCount } from '@/components/community/OwnerViewCount';
import { PhotoGallery } from './PhotoGallery';
import { OwnerControls } from './OwnerControls';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props) {
  const post = await getCommunityPost(params.id);
  if (!post || post.kind !== 'apartment') return { title: 'アパート — Locore' };
  return {
    title: `${post.title} — アパート`,
    description: post.body.length > 140 ? post.body.slice(0, 137) + '…' : post.body,
  };
}

export default async function ApartmentDetailPage({ params }: Props) {
  const post = await getCommunityPost(params.id);
  if (!post) notFound();
  if (post.kind !== 'apartment') notFound();

  // 閲覧カウンタ +1（失敗無視）
  await incrementViewCount(post.id);

  const me = await getCurrentUser();
  const isOwner = !!me && me.id === post.authorId;
  const closed = post.status !== 'active';

  const meta = (post.metadata as ApartmentMetadata) ?? {};
  const lt = meta.listing_type as ApartmentListingType | undefined;
  const rent = meta.rent_monthly ?? post.priceAmount ?? null;
  const charges = meta.charges_monthly ?? null;
  const total = rent != null && charges != null ? rent + charges : null;
  const bodyHtml = markdownToHtml(post.body);

  return (
    <main className="mx-auto max-w-screen-lg px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/apartments"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-300 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        アパート一覧に戻る
      </Link>

      {/* 写真ギャラリー */}
      <div className="mt-4">
        <PhotoGallery photos={post.photos ?? []} title={post.title} />
      </div>

      {/* 締切バナー */}
      {closed ? (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-foreground/15 bg-foreground/5 p-4">
          <Lock className="h-5 w-5 text-foreground/55" />
          <div>
            <p className="text-[14px] font-bold text-foreground/75">
              {post.status === 'closed' ? '成約済み' : '掲載終了'}
            </p>
            <p className="text-[12px] text-foreground/55">
              この物件は現在募集していません。
            </p>
          </div>
        </div>
      ) : null}

      {/* オーナー操作 */}
      {isOwner ? (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-primary-500/30 bg-primary-500/5 p-3">
          <p className="text-[12px] text-foreground/75">
            あなたの投稿です。ステータスを変更できます。
          </p>
          <OwnerControls postId={post.id} status={post.status} />
        </div>
      ) : null}

      {/* 2 カラム本文 */}
      <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {/* 左カラム ----------------------------------------------------- */}
        <article className="sm:col-span-2">
          {/* タイトル + 形態 */}
          <div className="flex flex-wrap items-center gap-2">
            {lt ? (
              <span className="rounded-sm bg-primary-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-300">
                {APARTMENT_LISTING_TYPE_LABEL[lt]}
              </span>
            ) : null}
            <AudienceBadge audience={meta.audience} size="md" />
            <OwnerViewCount
              viewer={me}
              ownerId={post.authorId}
              count={post.viewCount}
            />
          </div>

          <h1
            className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-foreground sm:text-[30px]"
          >
            {post.title}
          </h1>

          {/* 主要スペック */}
          <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-foreground/80">
            {rent != null ? (
              <li className="inline-flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-primary-300" />
                <span className="font-bold tabular">€{rent.toLocaleString()}</span>
                <span className="text-foreground/55">/ 月</span>
              </li>
            ) : null}
            {typeof meta.bedrooms === 'number' ? (
              <li className="inline-flex items-center gap-1.5">
                <Bed className="h-4 w-4 text-primary-300" />
                {meta.bedrooms === 0 ? 'スタジオ' : `${meta.bedrooms} 寝室`}
              </li>
            ) : null}
            {typeof meta.size_sqm === 'number' ? (
              <li className="inline-flex items-center gap-1.5">
                <Maximize className="h-4 w-4 text-primary-300" />
                {meta.size_sqm} m²
              </li>
            ) : null}
          </ul>

          {/* 詳細スペック表 */}
          <dl className="mt-6 grid grid-cols-2 gap-y-3 rounded-xl bg-card p-4 text-[12px] ring-1 ring-border sm:grid-cols-3">
            <SpecRow label="家賃 (HC)" value={rent != null ? `€${rent.toLocaleString()}` : '応相談'} />
            <SpecRow
              label="管理費"
              value={charges != null ? `€${charges.toLocaleString()} / 月` : '—'}
            />
            <SpecRow
              label="敷金"
              value={meta.deposit != null ? `€${meta.deposit.toLocaleString()}` : '—'}
            />
            <SpecRow
              label="入居可能日"
              value={meta.available_from ? formatDate(meta.available_from) : '応相談'}
              icon={<Calendar className="h-3 w-3" />}
            />
            {meta.available_until ? (
              <SpecRow
                label="期限"
                value={formatDate(meta.available_until)}
                icon={<Calendar className="h-3 w-3" />}
              />
            ) : null}
            <SpecRow
              label="区"
              value={meta.arrondissement ?? '—'}
              icon={<MapPin className="h-3 w-3" />}
            />
            <SpecRow
              label="最寄駅"
              value={meta.nearest_station ?? post.locationText ?? '—'}
            />
            <SpecRow
              label="家具"
              value={meta.furnished ? '付き' : '無し'}
              icon={<Sofa className="h-3 w-3" />}
            />
            <SpecRow
              label="光熱費"
              value={meta.utilities_included ? '込み' : '別'}
              icon={<Zap className="h-3 w-3" />}
            />
            <SpecRow
              label="ペット"
              value={meta.pets_ok ? '可' : '不可'}
              icon={<PawPrint className="h-3 w-3" />}
            />
            <SpecRow
              label="喫煙"
              value={meta.smoking_ok ? '可' : '不可'}
              icon={<Cigarette className="h-3 w-3" />}
            />
          </dl>

          {meta.notes ? (
            <p className="mt-4 rounded-md bg-primary-500/5 px-3 py-2 text-[12px] text-foreground/70">
              <span className="font-bold text-primary-300">物件メモ：</span>
              {meta.notes}
            </p>
          ) : null}

          {/* 本文 */}
          <section className="mt-8">
            <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em] text-foreground/55">
              物件紹介
            </h2>
            <div
              className="prose-locore"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </section>

          {/* 投稿者 */}
          {post.authorId ? (
            <Link
              href={`/users/${post.authorId}`}
              className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:bg-muted hover:ring-1 hover:ring-primary-300"
            >
              {post.authorAvatarUrl ? (
                <Image
                  src={post.authorAvatarUrl}
                  alt={post.authorName ?? 'avatar'}
                  width={44}
                  height={44}
                  className="rounded-full bg-muted object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-500/10 text-[14px] font-bold text-primary-300">
                  {(post.authorName ?? 'L').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/55">
                  掲載者
                </p>
                <p className="text-[14px] font-bold text-foreground">
                  {post.authorName ?? '匿名ユーザー'}
                </p>
              </div>
              <span className="text-[11px] text-foreground/40">プロフィール →</span>
            </Link>
          ) : (
            <section className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              {post.authorAvatarUrl ? (
                <Image
                  src={post.authorAvatarUrl}
                  alt={post.authorName ?? 'avatar'}
                  width={44}
                  height={44}
                  className="rounded-full bg-muted object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-500/10 text-[14px] font-bold text-primary-300">
                  {(post.authorName ?? 'L').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/55">
                  掲載者
                </p>
                <p className="text-[14px] font-bold text-foreground">
                  {post.authorName ?? '匿名ユーザー'}
                </p>
              </div>
            </section>
          )}
        </article>

        {/* 右カラム（sticky CTA）-------------------------------------- */}
        <aside className="sm:col-span-1">
          <div className="sm:sticky sm:top-6">
            <div className="rounded-xl bg-card p-5 ring-1 ring-border">
              {/* 価格サマリ */}
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/55">
                月額
              </p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[28px] font-bold tracking-tight tabular text-foreground">
                  €{(total ?? rent ?? 0).toLocaleString()}
                </span>
                <span className="text-[12px] text-foreground/55">/ 月</span>
              </p>
              {charges != null && rent != null ? (
                <p className="mt-0.5 text-[11px] text-foreground/55 tabular">
                  内訳: 家賃 €{rent.toLocaleString()} + 管理費 €
                  {charges.toLocaleString()}
                </p>
              ) : (
                <p className="mt-0.5 text-[11px] text-foreground/55">
                  ※ 管理費・税金は別途確認してください
                </p>
              )}

              <div className="mt-4">
                <ApplyButton
                  postId={post.id}
                  postTitle={post.title}
                  applyLabel="問い合わせる"
                  viewerLoggedIn={!!me}
                  isOwnPost={isOwner}
                  closed={closed}
                  contactEmail={post.contactEmail}
                />
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-foreground/55">
                やり取りは Locore メッセージで。最初のメッセージに個人連絡先（電話 /
                LINE 等）を書くのは避けてください。
              </p>

              <hr className="my-4 border-border" />

              <dl className="space-y-1 text-[11px] text-foreground/55 tabular">
                <div className="flex justify-between">
                  <dt>投稿日</dt>
                  <dd>{formatDate(post.createdAt)}</dd>
                </div>
                {post.expiresAt ? (
                  <div className="flex justify-between">
                    <dt>掲載期限</dt>
                    <dd>{formatDate(post.expiresAt)}</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            {/* 注意（小さく） */}
            <p className="mt-3 text-[10px] leading-relaxed text-foreground/45">
              Locore は掲載の場を提供しているだけで、賃貸借契約には関与しません。
              当事者間で書面を交わしてください。
            </p>
          </div>
        </aside>
      </div>

      {/* フッター: 詐欺警告 ---------------------------------------- */}
      <footer className="mt-12 rounded-xl border border-amber-500/40 bg-amber-50/60 p-5 text-[12px] leading-relaxed text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="font-bold">問い合わせの前に — 詐欺の典型例</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>
                <span className="font-semibold">内見せず契約：</span>
                必ず実際に部屋を見てから契約してください。海外在住を理由に内見を
                拒む相手は要警戒。
              </li>
              <li>
                <span className="font-semibold">契約前送金 / 保証金前払い：</span>
                正規の賃貸借契約書（contrat de bail）と引き換えに、対面 / 銀行振込で
                支払うのが原則です。
              </li>
              <li>
                <span className="font-semibold">相場より極端に安い物件：</span>
                同じ区・広さの相場（leboncoin / PAP 等）と照らし、不自然に安い物件は
                釣り広告の可能性があります。
              </li>
            </ul>
            <p className="mt-2">
              不審な点があれば
              <Link href="/contact" className="underline">
                運営に通報
              </Link>
              してください。
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

// =============================================================================
// 小物
// =============================================================================

function SpecRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/50">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-[13px] font-medium text-foreground/85">{value}</dd>
    </div>
  );
}

function formatDate(d: string): string {
  const date = new Date(d.length === 10 ? d + 'T00:00:00Z' : d);
  if (isNaN(date.getTime())) return d;
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
