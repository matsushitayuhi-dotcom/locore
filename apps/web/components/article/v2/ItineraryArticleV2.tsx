'use client';

import { useMemo, useRef } from 'react';
import type { Article, Writer, Spot } from '@/lib/mock';
import {
  buildSpotGoogleMapsUrl,
  buildItineraryDirectionsUrl,
  pickDominantTravelMode,
} from '@/lib/maps/googleMapsUrls';
import { renderArticleBodyHtml } from '@/lib/markdown/render';
import { CSS } from './itineraryCss';
import {
  fmtDate,
  HeroNetCanvas,
  PinIcon,
  CostIcon,
  ModeIcon,
  hasCoords,
  routeEmbedUrl,
  useReveal,
  authorMeta,
} from './shared';

/**
 * モデルコース（article_type === 'itinerary'）の新レンダラ。
 * TripArticleMock 相当のレイアウトを、実データ（itinerary_blocks + spots）で駆動する。
 *
 * データマッピング:
 *   - 各 stop = itinerary_blocks[i]（order = 配列 index）
 *   - time = startTime / endTime
 *   - 場所 = spotId → spots を解決（name / photo(googlePhotoUrls) / 座標 / cost(priceEstimate)）
 *   - freeName 時は spot なしの自由名
 *   - notes = stop 本文
 *   - transfer = transportToNext + travelMinutesAfter + transportNote
 *
 * 地図は spots/blocks の座標から自動生成（routeEmbedUrl）。座標欠落はグレースフルに。
 */

const MODE_LABEL: Record<string, string> = {
  walk: '徒歩',
  metro: 'メトロ',
  bus: 'バス',
  taxi: 'タクシー',
  bike: '自転車',
  train: '電車',
  other: '移動',
};

type Stop = {
  idx: number;
  time: string;
  end?: string;
  name: string;
  cat?: string;
  photo?: string;
  bodyHtml: string;
  cost?: string;
  spot?: Spot;
  transfer?: { mode: string; minutes?: number | null; note?: string | null };
};

export function ItineraryArticleV2({
  article,
  writer,
  spots,
  related,
  region,
  country,
}: {
  article: Article;
  writer: Writer | null;
  spots: Spot[];
  related: Article[];
  region: { nameJa: string } | null;
  country: { nameJa: string } | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, '.tj-rev');

  const spotById = useMemo(() => {
    const m = new Map<string, Spot>();
    for (const s of spots) m.set(s.id, s);
    return m;
  }, [spots]);

  const stops: Stop[] = useMemo(() => {
    const blocks = article.itineraryBlocks ?? [];
    return blocks.map((b, i) => {
      const spot = b.spotId ? spotById.get(b.spotId) : undefined;
      const name = spot?.name || b.freeName || `スポット ${i + 1}`;
      const photo = spot?.photoUrls?.[0];
      const cost = spot?.priceEstimate || undefined;
      const hasTransfer =
        b.transportToNext ||
        (b.travelMinutesAfter != null && b.travelMinutesAfter > 0) ||
        b.transportNote;
      return {
        idx: i,
        time: b.startTime,
        end: b.endTime ?? undefined,
        name,
        cat: spot?.category || undefined,
        photo,
        bodyHtml: b.notes ? renderArticleBodyHtml(b.notes) : '',
        cost,
        spot,
        transfer: hasTransfer
          ? {
              mode: b.transportToNext ?? 'other',
              minutes: b.travelMinutesAfter,
              note: b.transportNote,
            }
          : undefined,
      };
    });
  }, [article.itineraryBlocks, spotById]);

  // 地図用の座標つきスポット（順序を保持）
  const coordStops = useMemo(
    () =>
      stops
        .map((s) => s.spot)
        .filter((s): s is Spot => !!s && hasCoords(s.lat, s.lng)),
    [stops],
  );

  const routeSrc = useMemo(
    () => routeEmbedUrl(coordStops.map((s) => ({ lat: s.lat, lng: s.lng }))),
    [coordStops],
  );

  // 「Google マップでルートを開く」（任意・座標2点以上のときだけ）
  const directionsUrl = useMemo(() => {
    const mode = pickDominantTravelMode(
      (article.itineraryBlocks ?? []).map((b) => b.transportToNext),
    );
    return buildItineraryDirectionsUrl(
      coordStops.map((s) => ({
        placeId: s.googlePlaceId ?? null,
        lat: s.lat,
        lng: s.lng,
      })),
      mode,
    );
  }, [coordStops, article.itineraryBlocks]);

  const areaLabel = region?.nameJa ?? article.area ?? '';
  const countryLabel = country?.nameJa ?? '';
  const heroPhoto = article.coverImageUrl;
  const showMap = coordStops.length >= 1;

  return (
    <div className="tj" ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ===== HERO ===== */}
      <header className="tj-hero">
        <div className="tj-hbg" style={{ backgroundImage: `url('${heroPhoto}')` }} />
        <HeroNetCanvas className="tj-hnet" />
        <div className="tj-hshade" />
        <div className="tj-hinner">
          <span className="tj-hkick">
            ITINERARY{countryLabel ? ` · ${countryLabel}` : ''}
            {areaLabel ? ` · ${areaLabel}` : ''}
          </span>
          <h1>{article.title}</h1>
          {writer ? (
            <div className="tj-hauthor">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={writer.avatarUrl} alt="" />
              <div>
                <div className="nm">{writer.name}</div>
                <div className="meta">{authorMeta(writer)}</div>
              </div>
            </div>
          ) : null}
          <div className="tj-hmeta">
            <span className="tj-pill">
              スポット <b>{stops.length}</b>
            </span>
            <span className="tj-pill">
              所要 <b>{article.durationType}</b>
            </span>
            {areaLabel ? (
              <span className="tj-pill">
                エリア <b>{areaLabel}</b>
              </span>
            ) : null}
            {article.tags.slice(0, 2).map((t) => (
              <span key={t} className="tj-pill">
                <b>#{t}</b>
              </span>
            ))}
          </div>
        </div>
        <div className="tj-scroll">
          記事を読む
          <span className="ln" />
        </div>
      </header>

      {/* ===== editorsNote（導入＝無料本文があれば）===== */}
      {article.body?.trim() ? (
        <section className="tj-lead tj-rev">
          <div className="tj-wrap">
            <span className="tj-kicker dk">— Editor&apos;s note</span>
            <div
              className="tj-leadbody"
              dangerouslySetInnerHTML={{
                __html: renderArticleBodyHtml(article.body),
              }}
            />
          </div>
        </section>
      ) : null}

      {/* ===== 集約マップ＋スポット概観 ===== */}
      {showMap ? (
        <section className="tj-mapsec">
          <div className="tj-wide">
            <div className="tj-maphead tj-rev">
              <span className="tj-kicker dk">— Route map &amp; spots</span>
              <h2>1日のルートと、立ち寄り先</h2>
              <p>
                各スポットの場所から自動生成したルート。先に全体像をつかんでから、
                下の旅程を時間順に読んでいきましょう。全{stops.length}スポット。
              </p>
            </div>
            <div className="tj-mapgrid">
              <div className="tj-mapframe tj-rev">
                <span className="tj-mapbadge">Google マップ連携</span>
                <iframe
                  title="旅程ルートマップ"
                  src={routeSrc}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="tj-maplist tj-rev">
                <div className="lab">立ち寄り順</div>
                {stops.map((s) => (
                  <div key={s.idx} className="tj-mlrow">
                    <span className="num">{s.idx + 1}</span>
                    <span className="nm">{s.name}</span>
                    <span className="tm">{s.time}</span>
                    {s.spot && hasCoords(s.spot.lat, s.spot.lng) ? (
                      <a
                        className="pin"
                        href={buildSpotGoogleMapsUrl({
                          placeId: s.spot.googlePlaceId ?? null,
                          lat: s.spot.lat,
                          lng: s.spot.lng,
                          fallbackQuery: `${s.name} ${areaLabel}`,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${s.name} を地図で見る`}
                        title="地図で見る"
                      >
                        <PinIcon />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            {directionsUrl ? (
              <div className="tj-maphead tj-rev" style={{ marginTop: 18 }}>
                <a
                  className="tj-maplink"
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <PinIcon />
                  Google マップでルートを開く
                </a>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ===== 旅程タイムライン ===== */}
      <section className="tj-tl">
        <div className="tj-wrap">
          <div className="tj-tlhead tj-rev">
            <span className="tj-kicker dk">— The itinerary</span>
            <h2>1日のながれ</h2>
            <p>全{stops.length}スポット</p>
          </div>

          <div className="tj-line">
            {stops.map((s) => (
              <div key={s.idx}>
                <div className="tj-stop tj-rev">
                  <div className="tj-node">
                    <span className="n">{String(s.idx + 1).padStart(2, '0')}</span>
                    {s.time ? <span className="t">{s.time}</span> : null}
                  </div>
                  <div className="tj-card">
                    {s.photo ? (
                      <div className="tj-cphoto">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.photo} alt="" loading="lazy" />
                        {s.cat ? <span className="tj-ctag">{s.cat}</span> : null}
                        {s.time ? (
                          <span className="tj-ctime">
                            <span className="dot" />
                            {s.time}
                            {s.end ? ` – ${s.end}` : ''}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="tj-cbody">
                      <div className="tj-chead">
                        <h3>{s.name}</h3>
                        {s.spot && hasCoords(s.spot.lat, s.spot.lng) ? (
                          <a
                            className="tj-maplink"
                            href={buildSpotGoogleMapsUrl({
                              placeId: s.spot.googlePlaceId ?? null,
                              lat: s.spot.lat,
                              lng: s.spot.lng,
                              fallbackQuery: `${s.name} ${areaLabel}`,
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <PinIcon />
                            地図で見る
                          </a>
                        ) : null}
                      </div>
                      {s.spot?.address ? (
                        <div className="tj-cplace">
                          <PinIcon />
                          {s.spot.address}
                        </div>
                      ) : null}
                      {s.bodyHtml ? (
                        <div
                          className="tj-ctxt"
                          dangerouslySetInnerHTML={{ __html: s.bodyHtml }}
                        />
                      ) : null}
                      {s.cost ? (
                        <div className="tj-cextras">
                          <span className="tj-cost">
                            <CostIcon />
                            {s.cost}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                {s.transfer ? (
                  <div className="tj-conn tj-rev">
                    <span className="pill">
                      <span className="lbl">Next</span>
                      <ModeIcon mode={s.transfer.mode} />
                      {MODE_LABEL[s.transfer.mode] ?? '移動'}
                      {s.transfer.minutes ? ` ${s.transfer.minutes}分` : ''}
                      {s.transfer.note ? ` · ${s.transfer.note}` : ''}
                    </span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 著者カード ===== */}
      {writer ? (
        <section className="tj-authsec">
          <div className="tj-wide">
            <div className="tj-authcard tj-rev">
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

      {/* ===== 関連記事 ===== */}
      {related.length > 0 ? (
        <section className="tj-related">
          <div className="tj-wide">
            <div className="head tj-rev">
              <div>
                <span className="tj-kicker dk">— You might also like</span>
                <h2 style={{ marginTop: 10 }}>ほかの記事</h2>
              </div>
            </div>
            <div className="tj-rgrid">
              {related.map((r) => (
                <a key={r.id} className="tj-rcard tj-rev" href={`/mockup/real/${r.id}`}>
                  <div className="tj-rcov">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.coverImageUrl} alt="" loading="lazy" />
                  </div>
                  <div className="tj-rb">
                    <div className="c">{r.area}</div>
                    <h3>{r.title}</h3>
                    <div className="go">
                      記事を読む
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ===== 日付フッター ===== */}
      <section className="tj-dates">
        <div className="tj-wide">
          <div className="tj-dateline tj-rev">
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
