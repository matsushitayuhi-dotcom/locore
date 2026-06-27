'use client';

import { useMemo, useRef } from 'react';
import type { Article, Writer } from '@/lib/mock';
import { renderArticleBodyHtml } from '@/lib/markdown/render';
import { CSS } from './essayCss';
import { fmtDate, HeroNetCanvas, useReveal, authorMeta } from './shared';
import { toVideoEmbedSrc, type ArticleVideoRow } from './classify';

/**
 * ブログ・場所なし（essay）の新レンダラ。EssayMock 相当。
 *
 * データマッピング:
 *   - Hero → 本文（renderArticleBodyHtml(body) を描画 ＋ article_videos を 16:9 埋め込み
 *     ＋ photo_entries があれば写真として流す）→ 著者 → 関連 → 日付。
 *   - 地図・スポットなし。
 *   - 動画は essay モック同様 16:9 中央（二重センタリング禁止）。埋め込み不可の
 *     プラットフォーム（TikTok/IG/X 等）は「元動画を開く」リンクにフォールバック。
 */

export function EssayArticleV2({
  article,
  writer,
  related,
  videos,
}: {
  article: Article;
  writer: Writer | null;
  related: Article[];
  videos: ArticleVideoRow[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, '.es-rev');

  const bodyHtml = useMemo(
    () => (article.body?.trim() ? renderArticleBodyHtml(article.body) : ''),
    [article.body],
  );
  // body_paid もプレビューでは全文表示（本番差し替え時に課金分岐を戻す）
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
        </div>
        <div className="es-scroll">
          読む
          <span className="ln" />
        </div>
      </header>

      {/* ===== 本文 ===== */}
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

        {paidHtml ? (
          <div
            className="es-body es-rev"
            style={{ marginTop: 26 }}
            dangerouslySetInnerHTML={{ __html: paidHtml }}
          />
        ) : null}

        {/* photo_entries（あれば写真として流す）*/}
        {photoEntries.map((p, i) => (
          <figure key={`pe-${i}`} className="es-figure es-rev">
            <div className="ph">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl} alt={p.caption ?? ''} loading="lazy" />
            </div>
            {(p.caption || p.locationName) ? (
              <figcaption className="es-figcap">
                {p.caption}
                {p.locationName ? ` · ${p.locationName}` : ''}
              </figcaption>
            ) : null}
          </figure>
        ))}

        {/* article_videos（16:9 中央）*/}
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
          // 埋め込み不可（TikTok/IG/X 等）は元動画リンクにフォールバック
          return (
            <div key={v.id} className="es-vlink es-rev">
              <a href={v.embedUrl} target="_blank" rel="noopener noreferrer">
                ▶ 動画を開く（{v.platform}）
              </a>
            </div>
          );
        })}
      </article>

      {/* ===== 著者カード ===== */}
      {writer ? (
        <section className="es-foot">
          <div className="es-read">
            <div className="es-byline es-rev">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={writer.avatarUrl} alt="" />
              <div>
                <div className="k">この記事を書いた人</div>
                <h3>{writer.name}</h3>
                <div className="role">{authorMeta(writer)}</div>
                {writer.bio ? <p className="bio">{writer.bio}</p> : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ===== 関連 ===== */}
      {related.length > 0 ? (
        <section className="es-related">
          <div className="es-wide">
            <div className="head es-rev">
              <span className="es-kicker">— You might also like</span>
              <h2 style={{ marginTop: 10 }}>ほかの読み物</h2>
            </div>
            <div className="es-rgrid">
              {related.map((r) => (
                <a key={r.id} className="es-rcard es-rev" href={`/mockup/real/${r.id}`}>
                  <div className="es-rcov">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.coverImageUrl} alt="" loading="lazy" />
                  </div>
                  <div className="es-rb">
                    <div className="c">{r.area}</div>
                    <h3>{r.title}</h3>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}

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
