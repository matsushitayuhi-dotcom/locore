'use client';

import { useMemo, useRef, type ReactNode } from 'react';
import type { Article, Writer, Spot } from '@/lib/mock';
import { renderArticleBodyHtml } from '@/lib/markdown/render';
import { CSS } from './placeGuideCss';
import { fmtDate, HeroNetCanvas, useReveal, authorMeta } from './shared';

/**
 * ブログ・場所あり（place-guide）の v2 レイアウト。
 *
 * Phase B では「ブランドヒーロー＋導入(無料 body)」を v2 デザインで描き、その下に
 * engagement 層（SpotsCardList / Paywall / ピン地図 / レビュー / 著者 / 関連）を
 * children として差し込む。スポット紹介・課金は既存コンポーネント再利用。
 */
export function PlaceGuideArticleV2({
  article,
  writer,
  spots,
  region,
  country,
  heroActions,
  children,
}: {
  article: Article;
  writer: Writer | null;
  spots: Spot[];
  region: { nameJa: string } | null;
  country: { nameJa: string } | null;
  heroActions?: ReactNode;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, '.pg-rev');

  const areaLabel = region?.nameJa ?? article.area ?? '';
  const countryLabel = country?.nameJa ?? '';
  const introHtml = useMemo(
    () => (article.body?.trim() ? renderArticleBodyHtml(article.body) : ''),
    [article.body],
  );

  return (
    <div className="pg" ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ===== HERO ===== */}
      <header className="pg-hero">
        <div className="pg-hbg" style={{ backgroundImage: `url('${article.coverImageUrl}')` }} />
        <HeroNetCanvas className="pg-hnet" />
        <div className="pg-hshade" />
        <div className="pg-hinner">
          <span className="pg-hkick">
            PLACE GUIDE{countryLabel ? ` · ${countryLabel}` : ''}
            {areaLabel ? ` · ${areaLabel}` : ''}
          </span>
          <h1>{article.title}</h1>
          {writer ? (
            <div className="pg-hauthor">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={writer.avatarUrl} alt="" />
              <div>
                <div className="nm">{writer.name}</div>
                <div className="meta">{authorMeta(writer)}</div>
              </div>
            </div>
          ) : null}
          <div className="pg-hmeta">
            <span className="pg-pill">
              紹介 <b>{spots.length}か所</b>
            </span>
            {areaLabel ? (
              <span className="pg-pill">
                エリア <b>{areaLabel}</b>
              </span>
            ) : null}
            <span className="pg-pill">
              順番 <b>なし（順不同）</b>
            </span>
          </div>
          {heroActions ? <div className="pg-heroact">{heroActions}</div> : null}
        </div>
        <div className="pg-scroll">
          読む
          <span className="ln" />
        </div>
      </header>

      {/* ===== 導入（無料 body）===== */}
      {introHtml ? (
        <section className="pg-intro pg-rev">
          <div className="pg-wrap">
            <span className="pg-kicker">— Intro</span>
            <div
              className="pg-intro-body"
              dangerouslySetInnerHTML={{ __html: introHtml }}
            />
          </div>
        </section>
      ) : null}

      {/* ===== engagement 本体（スポット / 課金 / 地図 / レビュー / 著者 / 関連）===== */}
      <section className="pg-body">
        <div className="pg-bodywrap">{children}</div>
      </section>

      {/* ===== 日付フッター ===== */}
      <section className="pg-dates">
        <div className="pg-wide">
          <div className="pg-dateline pg-rev">
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
