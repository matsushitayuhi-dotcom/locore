'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Heart, Bookmark, BookmarkCheck } from 'lucide-react';
import { LocalTierBadge, SatisfactionStars } from '@locore/ui';
import { ServiceCard } from '../../services/ServiceCard';
import { toggleArticleLike } from '@/lib/articleLikes/actions';
import { addBookmark, removeBookmark } from '@/lib/bookmarks/actions';
import { authorMeta } from './shared';
import type { Article, Writer, Spot, Review } from '@/lib/mock';
import type { FolderSummary } from '@/lib/spotFavorites/actions';
import type { getMyReviewForArticle } from '@/lib/reviews/actions';
import type { FeaturedService } from '@/lib/services/featured';
import type { ArticleVideoRow } from './classify';
import { toVideoEmbedSrc } from './classify';

/** v2 各タイプの scoped class 接頭辞（tj=モデルコース / pg=場所あり / es=場所なし）。 */
export type V2Variant = 'tj' | 'pg' | 'es';

/**
 * エンゲージメント層（共通の機能つき部品）。
 *
 * v2 の各タイプ別レイアウト（モデルコース / 場所あり / 場所なし）が、新スタイル本文の
 * 適切な位置に埋め込んで使う共通部品を提供する。本文描画そのものは各レイアウトが
 * Phase A の新デザインで自前に行い、ここでは横断的な「機能つき部品」だけを担う:
 *   - HeroActions（いいね / 保存。ヒーロー内に差す）
 *   - PreviewBanner（駐在員プレビュー帯）
 *   - AuthorCard（著者カード ＋ 著者サービス）
 *   - ReviewsList（レビュー一覧）
 *   - RelatedArticles（関連記事）
 *   - EssayVideos（essay の article_videos を 16:9 で描画）
 *   - SpotTipBox（スポットの「コツ」ライム破線ボックス・Phase C-2）
 *
 * 課金（Paywall）・スポット保存（SpotFavoriteButton）・地図（ArticleSpotsMap）・
 * レビュー投稿（ReviewFormToggle）は、各レイアウト側が新スタイルのゲート分岐の中で
 * 直接 import して配置する（unlocked で paid を漏らさないゲート意味論を維持するため）。
 */

export type MyReview = Awaited<ReturnType<typeof getMyReviewForArticle>>;

export type EngagementProps = {
  article: Article;
  writer: Writer | null;
  spots: Spot[];
  reviews: Review[];
  related: Article[];
  unlocked: boolean;
  purchasedOrOwner: boolean;
  isOwner: boolean;
  viewerLoggedIn: boolean;
  alreadySavedByMe: boolean;
  bookmarkCount: number;
  likeCount: number;
  initialLiked: boolean;
  folders: FolderSummary[];
  bookmarkedSpotIds: Set<string>;
  myReview: MyReview;
  previewMode: boolean;
  authorServices: FeaturedService[];
  videos: ArticleVideoRow[];
};

/* ===================== ヒーロー内アクション ===================== */

/**
 * 記事レベルの「いいね / 保存（お気に入り）」ボタン。v2 ヒーロー内に差す。
 *
 * モック準拠のブランド配色トグル: 既定は白、active（いいね済み / 保存済み）で
 * ライムグリーン（`.{v}-hact.on`）。共有の LikeButton / AddToTripButton（Tailwind
 * トークン配色）は他画面でも使うため触らず、ヒーロー専用に同じ server action を
 * 直接叩く軽量ボタンとして実装する。previewMode では出さない（旧仕様踏襲）。
 */
export function HeroActions({
  article,
  viewerLoggedIn,
  alreadySavedByMe,
  bookmarkCount,
  likeCount,
  initialLiked,
  previewMode,
  variant = 'tj',
}: EngagementProps & { variant?: V2Variant }) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(likeCount);
  const [saved, setSaved] = useState(alreadySavedByMe);
  const [saves, setSaves] = useState(bookmarkCount);
  const [likePending, startLike] = useTransition();
  const [savePending, startSave] = useTransition();

  if (previewMode) return null;

  const cls = (on: boolean) => `${variant}-hact${on ? ' on' : ''}`;

  const onLike = () => {
    if (!viewerLoggedIn) {
      router.push(
        `/auth/login?redirectTo=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }
    const was = liked;
    setLiked(!was);
    setLikes((c) => c + (was ? -1 : 1));
    startLike(async () => {
      const res = await toggleArticleLike({ articleId: article.id });
      if (!res.ok) {
        setLiked(was);
        setLikes((c) => c + (was ? 1 : -1));
        toast.error(res.error);
      } else if (res.data && res.data.liked !== !was) {
        setLiked(res.data.liked);
      }
    });
  };

  const onSave = () => {
    const was = saved;
    setSaved(!was);
    setSaves((c) => Math.max(0, c + (was ? -1 : 1)));
    startSave(async () => {
      try {
        const res = was
          ? await removeBookmark({ articleId: article.id })
          : await addBookmark({ articleId: article.id });
        if (res.ok) {
          if (was) {
            toast('保存ライブラリから外しました');
          } else {
            toast.success('記事を保存しました', {
              description: '「保存ライブラリ」から見返せます',
              action: {
                label: 'ライブラリを開く',
                onClick: () => router.push('/library'),
              },
            });
          }
          return;
        }
        setSaved(was);
        setSaves((c) => Math.max(0, c + (was ? 1 : -1)));
        if (res.reason === 'unauthenticated') {
          toast('ログインすると保存できます', {
            action: {
              label: 'ログインする',
              onClick: () => router.push('/auth/login?redirect_to=/library'),
            },
          });
        } else {
          toast.error('保存に失敗しました', {
            description: res.message ?? '時間をおいて再度お試しください',
          });
        }
      } catch (err) {
        setSaved(was);
        setSaves((c) => Math.max(0, c + (was ? 1 : -1)));
        toast.error('保存に失敗しました', {
          description: err instanceof Error ? err.message : '不明なエラー',
        });
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={onLike}
        disabled={likePending}
        aria-pressed={liked}
        aria-label={liked ? `いいね済み（${likes}）` : `いいね（${likes}）`}
        className={cls(liked)}
      >
        <Heart fill={liked ? 'currentColor' : 'none'} strokeWidth={2} />
        <span className="ct">{likes.toLocaleString('ja-JP')}</span>
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={savePending}
        aria-pressed={saved}
        aria-label={saved ? '保存済み（クリックで外す）' : 'お気に入りに保存'}
        className={cls(saved)}
      >
        {saved ? <BookmarkCheck strokeWidth={2} /> : <Bookmark strokeWidth={2} />}
        <span className="ct">{saves.toLocaleString('ja-JP')}</span>
      </button>
    </>
  );
}

/* ===================== プレビュー帯 ===================== */

export function PreviewBanner({
  article,
  previewMode,
}: {
  article: Article;
  previewMode: boolean;
}) {
  if (!previewMode) return null;
  return (
    <div className="mx-auto max-w-screen-lg px-4 pt-4 sm:px-6">
      <div className="rounded-md border border-warning-500 bg-warning-50 px-4 py-3 text-warning-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] font-bold">
            <span className="mr-2 rounded-full bg-warning-500/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.16em]">
              プレビュー
            </span>
            この画面は駐在員専用の公開前プレビューです
          </p>
          <Link
            href={`/writer/articles/${article.id}/edit`}
            className="text-[12px] text-warning-700 underline-offset-4 hover:underline"
          >
            編集に戻る →
          </Link>
        </div>
        <p className="mt-1 text-[12px]">
          有料パートとロック解除後のレイアウトもまとめて表示しています。
          読者のいいね・購入導線はこのプレビューでは無効化されています。
        </p>
      </div>
    </div>
  );
}

/* ===================== スポットの「コツ」ボックス（Phase C-2）===================== */

/**
 * スポットの「コツ」を、本文中の callout (tip) と揃えたライムの破線ボックスで表示する。
 * 仕様 §3「tip = place 内のミニ callout」/ §2「コツ・注意ボックス（ライム破線）」に準拠。
 * 各タイプの新スタイル本文（場所カード / 旅程 stop）から共通で使う。
 */
export function SpotTipBox({ tip }: { tip: string }) {
  return (
    <div
      className="rounded-md border border-dashed px-3 py-2"
      style={{ borderColor: '#A8E01C', background: '#F3FBE0' }}
    >
      <p className="mb-0.5 flex items-center gap-1 text-[11px] font-bold tracking-wide text-[#5E8B0E]">
        <span aria-hidden>✨</span>
        コツ
      </p>
      <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#2a2a28]">
        {tip}
      </p>
    </div>
  );
}

/* ===================== 著者カード（モック準拠）===================== */

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/**
 * 「この記事を書いた人」カード。モック（TripArticleMock 末尾の .tj-authcard /
 * PlaceGuideMock の .pg-authcard / EssayMock の .es-byline）の見た目に合わせて作り直す。
 * 著者情報（アバター / 名前 / 在住メタ / bio / プロフィールリンク / 他の記事 ・ サービス）は
 * 保ちつつ、scoped class（variant）で各タイプのきれいなレイアウトに描画する。
 */
export function AuthorCard({
  writer,
  authorServices,
  variant = 'tj',
}: {
  writer: Writer | null;
  authorServices: FeaturedService[];
  variant?: V2Variant;
}) {
  if (!writer) return null;

  const meta = (
    <>
      {authorMeta(writer)}
      {writer.followerCount
        ? ` · ${writer.followerCount.toLocaleString('ja-JP')} followers`
        : ''}
    </>
  );

  const body = (
    <div className="body">
      <div className="k">この記事を書いた人</div>
      <h3>{writer.name}</h3>
      <div className="role">{meta}</div>
      {writer.bio ? <p className="bio">{writer.bio}</p> : null}
      <Link className={`${variant}-authcta`} href={`/users/${writer.id}`}>
        プロフィールを見る
        <ArrowIcon />
      </Link>
      <div className={`${variant}-authlinks`}>
        <Link className={`${variant}-authlink`} href={`/users/${writer.id}?tab=articles`}>
          この駐在員の他の記事
          <ArrowIcon />
        </Link>
      </div>
      {authorServices.length > 0 ? (
        <div className={`${variant}-authsvc`}>
          <div className="lab">
            <span className="k">この駐在員の他のサービス</span>
            <Link href={`/users/${writer.id}?tab=services`}>すべて見る →</Link>
          </div>
          <div className={`${variant}-authsvc-grid`}>
            {authorServices.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  // essay は byline スタイル（中央寄せ・上下ボーダー）。tj / pg は authcard。
  const cardClass = variant === 'es' ? 'es-byline' : `${variant}-authcard`;
  return (
    <div className={`${cardClass} ${variant}-rev`}>
      <Link href={`/users/${writer.id}`} aria-label={`${writer.name} のプロフィールへ`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={writer.avatarUrl} alt={writer.name} />
      </Link>
      {body}
    </div>
  );
}

/* ===================== レビュー一覧 ===================== */

export function ReviewsList({ reviews }: { reviews: Review[] }) {
  return (
    <section>
      <h3 className="mb-4 text-[18px] font-semibold tracking-tight">
        レビュー
        <span className="ml-2 text-[12px] font-normal text-foreground/50 tabular">
          {reviews.length}
        </span>
      </h3>
      <div className="space-y-4">
        {reviews.slice(0, 6).map((r) => (
          <article
            key={r.id}
            className="rounded-md border border-border bg-card p-4 text-[14px]"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{r.authorName}</p>
              <p className="text-[11px] text-foreground/40 tabular">
                訪問 {new Date(r.visitedAt).toLocaleDateString('ja-JP')}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <LocalTierBadge score={r.localScore} size="sm" />
              <SatisfactionStars rating={r.satisfaction} size="sm" showStars />
            </div>
            <p className="mt-3 leading-relaxed text-foreground/80">{r.body}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {r.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground/60"
                >
                  {t}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ===================== 関連記事（モック準拠）===================== */

const RELATED_HEADING: Record<V2Variant, string> = {
  tj: 'ほかのモデルコース',
  pg: 'ほかの場所ガイド',
  es: 'ほかの読み物',
};

/**
 * 関連記事。モック（.tj-related / .pg-related / .es-related のカードグリッド）の体裁に
 * 寄せる。各カードは実記事へリンク（/articles/[id]）。
 */
export function RelatedArticles({
  related,
  variant = 'tj',
}: {
  related: Article[];
  variant?: V2Variant;
}) {
  if (related.length === 0) return null;
  return (
    <section className={`${variant}-related`}>
      <div className={`${variant}-wide`}>
        <div className={`head ${variant}-rev`}>
          <div>
            <span className={`${variant}-kicker dk`}>— You might also like</span>
            <h2 style={{ marginTop: 10 }}>{RELATED_HEADING[variant]}</h2>
          </div>
        </div>
        <div className={`${variant}-rgrid`}>
          {related.map((a) => (
            <Link key={a.id} className={`${variant}-rcard ${variant}-rev`} href={`/articles/${a.id}`}>
              <div className={`${variant}-rcov`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.coverImageUrl} alt="" loading="lazy" />
              </div>
              <div className={`${variant}-rb`}>
                <div className="c">{a.area}</div>
                <h3>{a.title}</h3>
                {variant === 'tj' ? (
                  <div className="go">
                    記事を読む
                    <ArrowIcon />
                  </div>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * essay 用：article_videos を 16:9 で描画（埋め込み不可は外部リンク）。
 * 解放状態に関わらず動画自体は表示（旧 essay モック踏襲）。
 */
export function EssayVideos({ videos }: { videos: ArticleVideoRow[] }) {
  if (videos.length === 0) return null;
  return (
    <>
      {videos.map((v) => {
        const src = toVideoEmbedSrc(v.embedUrl);
        if (src) {
          return (
            <div key={v.id} className="es-video es-rev">
              <div className="es-vframe">
                <span className="es-vbadge">VIDEO</span>
                <iframe
                  title="動画"
                  src={src}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </div>
          );
        }
        return (
          <div key={v.id} className="es-vlink es-rev">
            <a href={v.embedUrl} target="_blank" rel="noopener noreferrer">
              ▶ 動画を開く（{v.platform}）
            </a>
          </div>
        );
      })}
    </>
  );
}
