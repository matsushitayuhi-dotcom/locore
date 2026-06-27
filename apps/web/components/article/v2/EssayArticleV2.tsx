'use client';

import { useMemo, useRef, type ReactNode } from 'react';
import { renderArticleBodyHtml } from '@/lib/markdown/render';
import { Paywall } from '../../Paywall';
import { ReviewFormToggle } from '../ReviewFormToggle';
import { CSS } from './essayCss';
import { fmtDate, HeroNetCanvas, useReveal, authorMeta } from './shared';
import {
  AuthorCard,
  RelatedArticles,
  ReviewsList,
  type EngagementProps,
} from './engagement';

/**
 * ブログ・場所なし（essay）の v2 レイアウト。
 *
 * Phase A の新デザイン本文（本文＋写真＋動画）を現行の実データで描画しつつ、Phase B の
 * 課金（Paywall）とインタラクション（いいね/保存・レビュー・著者・関連）を新スタイルに
 * 織り込む。地図・スポットは持たない。
 *
 * ゲート意味論（収益直結）:
 *   - 無料部分（ヒーロー＋body＋photo_entries＋動画）は常時表示。
 *   - body_paid は unlocked 時のみ表示。未解放時は <Paywall>（essay は spots 無し）。
 */
export type EssayArticleV2Props = EngagementProps & {
  /** article_videos を 16:9 で描く要素（engagement.EssayVideos）。本文末に流す。 */
  videosSlot?: ReactNode;
  heroActions?: ReactNode;
};

export function EssayArticleV2(props: EssayArticleV2Props) {
  const {
    article,
    writer,
    reviews,
    related,
    unlocked,
    purchasedOrOwner,
    isOwner,
    viewerLoggedIn,
    folders,
    bookmarkedSpotIds,
    myReview,
    previewMode,
    authorServices,
    videosSlot,
    heroActions,
  } = props;

  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, '.es-rev');

  const bodyHtml = useMemo(
    () => (article.body?.trim() ? renderArticleBodyHtml(article.body) : ''),
    [article.body],
  );
  const paidHtml = useMemo(
    () =>
      article.bodyPaid?.trim() ? renderArticleBodyHtml(article.bodyPaid) : '',
    [article.bodyPaid],
  );

  const photoEntries = (article.photoEntries ?? [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return (
    <div className="es" ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ===== HERO ===== */}
      <header className="es-hero">
        <div className="es-hbg" style={{ backgroundImage: `url('${article.coverImageUrl}')` }} />
        <HeroNetCanvas className="es-hnet" />
        <div className="es-hshade" />
        <div className="es-hinner">
          <span className="es-hkick">
            ESSAY{article.area ? ` · ${article.area}` : ''}
          </span>
          <h1>{article.title}</h1>
          {writer ? (
            <div className="es-hauthor">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={writer.avatarUrl} alt="" />
              <div>
                <div className="nm">{writer.name}</div>
                <div className="meta">{authorMeta(writer)}</div>
              </div>
            </div>
          ) : null}
          {heroActions ? <div className="es-heroact">{heroActions}</div> : null}
        </div>
        <div className="es-scroll">
          読む
          <span className="ln" />
        </div>
      </header>

      {/* ===== 本文（無料 body）＋写真＋動画 ===== */}
      <article className="es-article">
        <div className="es-read">
          <span className="es-kicker es-rev">— Essay</span>
        </div>

        {bodyHtml ? (
          <div
            className="es-body es-rev"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : null}

        {/* photo_entries（あれば写真として流す）*/}
        {photoEntries.map((p, i) => (
          <figure key={`pe-${i}`} className="es-figure es-rev">
            <div className="ph">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl} alt={p.caption ?? ''} loading="lazy" />
            </div>
            {p.caption || p.locationName ? (
              <figcaption className="es-figcap">
                {p.caption}
                {p.locationName ? ` · ${p.locationName}` : ''}
              </figcaption>
            ) : null}
          </figure>
        ))}

        {/* article_videos（16:9 中央）*/}
        {videosSlot}
      </article>

      {/* ===== 有料パート（body_paid）／ Paywall ===== */}
      <section className="es-body-extras">
        <div className="es-read">
          {unlocked ? (
            paidHtml ? (
              <>
                <div
                  aria-hidden
                  className="es-rev"
                  style={{
                    textAlign: 'center',
                    letterSpacing: '.6em',
                    color: '#cdd2c2',
                    margin: '8px 0 26px',
                  }}
                >
                  ◆ ◆ ◆
                </div>
                {previewMode ? (
                  <div
                    className="es-rev"
                    style={{ textAlign: 'center', marginBottom: 18 }}
                  >
                    <span className="es-kicker">有料パート（プレビュー解除中）</span>
                  </div>
                ) : null}
                <div
                  className="es-body es-rev"
                  dangerouslySetInnerHTML={{ __html: paidHtml }}
                />
              </>
            ) : null
          ) : (
            <Paywall
              article={article}
              bodyAfter={paidHtml ? article.bodyPaid! : ''}
              spots={[]}
              folders={folders}
              bookmarkedSpotIds={bookmarkedSpotIds}
              viewerLoggedIn={viewerLoggedIn}
              alreadyPurchased={purchasedOrOwner}
            />
          )}

          {/* レビュー投稿（購入読者のみ。preview / owner では出さない）*/}
          {!previewMode && unlocked && !isOwner ? (
            <div style={{ marginTop: 28 }}>
              <ReviewFormToggle articleId={article.id} initial={myReview} />
            </div>
          ) : null}
        </div>
      </section>

      {/* ===== 著者カード ＋ サービス（モック .es-byline 準拠）===== */}
      <section className="es-foot">
        <div className="es-read">
          <AuthorCard
            writer={writer}
            authorServices={authorServices}
            variant="es"
          />
        </div>
      </section>

      {/* ===== レビュー一覧 ===== */}
      <section className="es-foot" style={{ paddingTop: 0 }}>
        <div className="es-read">
          <ReviewsList reviews={reviews} />
        </div>
      </section>

      {/* ===== 関連記事 ===== */}
      <RelatedArticles related={related} variant="es" />

      {/* ===== 日付フッター ===== */}
      <section className="es-dates">
        <div className="es-wide">
          <div className="es-dateline es-rev">
            <span>
              公開 <b>{fmtDate(article.publishedAt)}</b>
            </span>
            <i />
            <span>
              最終更新 <b>{fmtDate(article.publishedAt)}</b>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
