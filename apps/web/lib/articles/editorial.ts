import 'server-only';
import { and, desc, eq, inArray, isNull, ne } from 'drizzle-orm';
import { schema } from '@locore/db';
import { getDb } from '@/lib/db/client';
import { deriveEnrollment } from '@/lib/experts/enrollment';
import { formatSchoolName } from '@/lib/experts/education';
import { specialtyLabel, normalizeSpecialties } from '@/lib/experts/specialties';
import { isUserVerified } from '@/lib/residents/verification';
import { CONSULTATION_TAG } from '@/lib/experts/constants';
import { fetchLinkPreview } from '@/lib/media/linkPreview';
import type { ArticleBlock, LinkPreviewLite } from '@/lib/articles/blocks';
import type { EducationEntry } from '@locore/db';

/**
 * ブログ記事ページ（エディトリアル版）のデータ取得。
 * 著者カード（学校・在籍確認・得意分野・最安メニュー）、関連記事、リンクカードの解決。
 */

export type EditorialAuthor = {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  schoolLabel: string | null;
  enrollmentLabel: string | null;
  countryNameJa: string | null;
  cityNameJa: string | null;
  verified: boolean;
  specialties: string[];
  minPriceJpy: number | null;
  isExpert: boolean;
};

export async function getEditorialAuthor(writerId: string): Promise<EditorialAuthor | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.displayName,
      avatarUrl: schema.users.avatarUrl,
      bio: schema.users.bio,
      education: schema.users.education,
      specialties: schema.users.specialties,
      residencyCity: schema.users.residencyCity,
      residencyCountry: schema.users.residencyCountry,
    })
    .from(schema.users)
    .where(eq(schema.users.id, writerId))
    .limit(1);
  const u = rows[0];
  if (!u) return null;
  const education = (Array.isArray(u.education) ? u.education : []) as EducationEntry[];
  const enrollment = deriveEnrollment(education);
  const entry = enrollment ? education.find((e) => e.school === enrollment.school) ?? null : null;
  const [verified, menus, country] = await Promise.all([
    isUserVerified(writerId).catch(() => false),
    db
      .select({ priceJpy: schema.userServices.priceJpy, tags: schema.userServices.tags })
      .from(schema.userServices)
      .where(and(eq(schema.userServices.userId, writerId), eq(schema.userServices.isActive, true)))
      .catch(() => [] as Array<{ priceJpy: number | null; tags: string[] }>),
    u.residencyCountry
      ? db.select({ nameJa: schema.countries.nameJa }).from(schema.countries).where(eq(schema.countries.code, u.residencyCountry.toLowerCase())).limit(1).then((r) => r[0]?.nameJa ?? null).catch(() => null)
      : Promise.resolve(null),
  ]);
  const consult = menus.filter((m) => (m.tags ?? []).includes(CONSULTATION_TAG) && m.priceJpy != null);
  const minPriceJpy = consult.length ? Math.min(...consult.map((m) => m.priceJpy!)) : null;
  return {
    id: u.id,
    name: u.name,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    schoolLabel: entry ? formatSchoolName(entry) : enrollment?.school ?? null,
    enrollmentLabel: enrollment ? (enrollment.status === 'current' ? '在学中' : `アルムナイ${enrollment.year != null ? `（${enrollment.year}年卒）` : ''}`) : null,
    countryNameJa: country,
    cityNameJa: u.residencyCity,
    verified,
    specialties: normalizeSpecialties((u.specialties ?? []) as string[]).slice(0, 4).map(specialtyLabel),
    minPriceJpy,
    isExpert: consult.length > 0,
  };
}

export type RelatedArticle = { id: string; title: string; topic: string | null; publishedAt: string | null; minutes: number; writerName: string | null; writerId: string };

export async function getRelatedEditorial(articleId: string, writerId: string, topic: string | null): Promise<{ byAuthor: RelatedArticle[]; byTopic: RelatedArticle[] }> {
  const db = getDb();
  const pick = async (where: ReturnType<typeof and>) =>
    db
      .select({
        id: schema.articles.id,
        title: schema.articles.title,
        topic: schema.articles.topic,
        publishedAt: schema.articles.publishedAt,
        body: schema.articles.body,
        writerName: schema.users.displayName,
        writerId: schema.articles.writerId,
      })
      .from(schema.articles)
      .leftJoin(schema.users, eq(schema.users.id, schema.articles.writerId))
      .where(where)
      .orderBy(desc(schema.articles.publishedAt))
      .limit(3)
      .then((rows) =>
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          topic: r.topic,
          publishedAt: r.publishedAt?.toISOString() ?? null,
          minutes: Math.max(1, Math.round((r.body ?? '').replace(/\s/g, '').length / 500)),
          writerName: r.writerName,
          writerId: r.writerId,
        })),
      )
      .catch(() => [] as RelatedArticle[]);
  const base = [eq(schema.articles.status, 'published'), isNull(schema.articles.deletedAt), ne(schema.articles.id, articleId)];
  const [byAuthor, byTopic] = await Promise.all([
    pick(and(...base, eq(schema.articles.writerId, writerId))),
    topic ? pick(and(...base, eq(schema.articles.topic, topic), ne(schema.articles.writerId, writerId))) : Promise.resolve([]),
  ]);
  return { byAuthor, byTopic };
}

/** link_card ブロックの表示データ（記事 / エキスパートは最新値を引く。外部は保存済み preview を使う） */
export type LinkCardData =
  | { kind: 'article'; id: string; title: string; subtitle: string | null; writerName: string | null; topic: string | null; minutes: number; coverImageUrl: string | null }
  | { kind: 'expert'; id: string; name: string; avatarUrl: string | null; schoolLabel: string | null; enrollmentLabel: string | null; verified: boolean; specialties: string[]; minPriceJpy: number | null }
  | { kind: 'external'; url: string; host: string; preview: LinkPreviewLite | null };

export async function resolveLinkCards(blocks: ArticleBlock[]): Promise<Map<string, LinkCardData>> {
  const out = new Map<string, LinkCardData>();
  const cards = blocks.filter((b): b is Extract<ArticleBlock, { type: 'link_card' }> => b.type === 'link_card');
  if (cards.length === 0) return out;
  const db = getDb();
  const articleIds = cards.filter((c) => c.kind === 'article' && c.targetId).map((c) => c.targetId!);
  const expertIds = cards.filter((c) => c.kind === 'expert' && c.targetId).map((c) => c.targetId!);
  const [articles, experts] = await Promise.all([
    articleIds.length
      ? db
          .select({ id: schema.articles.id, title: schema.articles.title, subtitle: schema.articles.subtitle, topic: schema.articles.topic, body: schema.articles.body, coverImageUrl: schema.articles.coverImageUrl, writerName: schema.users.displayName, status: schema.articles.status })
          .from(schema.articles)
          .leftJoin(schema.users, eq(schema.users.id, schema.articles.writerId))
          .where(inArray(schema.articles.id, articleIds))
          .catch(() => [])
      : Promise.resolve([]),
    expertIds.length ? Promise.all(expertIds.map((id) => getEditorialAuthor(id).catch(() => null))) : Promise.resolve([]),
  ]);
  for (const c of cards) {
    if (c.kind === 'article') {
      const a = articles.find((x) => x.id === c.targetId);
      if (a && a.status === 'published') {
        out.set(c.id, { kind: 'article', id: a.id, title: a.title, subtitle: a.subtitle, writerName: a.writerName, topic: a.topic, minutes: Math.max(1, Math.round((a.body ?? '').replace(/\s/g, '').length / 500)), coverImageUrl: a.coverImageUrl });
        continue;
      }
    } else if (c.kind === 'expert') {
      const e = experts.find((x) => x?.id === c.targetId);
      if (e) {
        out.set(c.id, { kind: 'expert', id: e.id, name: e.name, avatarUrl: e.avatarUrl, schoolLabel: e.schoolLabel, enrollmentLabel: e.enrollmentLabel, verified: e.verified, specialties: e.specialties.slice(0, 3), minPriceJpy: e.minPriceJpy });
        continue;
      }
    }
    let host = '';
    try {
      host = new URL(c.url).hostname.replace(/^www\./, '');
    } catch {
      /* noop */
    }
    out.set(c.id, { kind: 'external', url: c.url, host, preview: c.preview ?? null });
  }
  return out;
}

/** 執筆時: URL のプレビューをサーバー側で 1 回取得（外部リンクカード・SNS 埋め込み用） */
export async function fetchPreviewLite(url: string): Promise<LinkPreviewLite | null> {
  try {
    const p = await fetchLinkPreview('website', url);
    if (p.status !== 'ok') return null;
    return { title: p.title, description: p.description, imageUrl: p.imageUrl, siteName: p.siteName };
  } catch {
    return null;
  }
}

/** 記事ページの分岐用: エディトリアル版（bodyStyle='blocks'）の行を軽く引く。未適用環境は null */
export async function getEditorialArticleRow(id: string): Promise<{
  id: string;
  title: string;
  subtitle: string | null;
  lead: string | null;
  topic: string | null;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  status: string;
  writerId: string;
  bodyStyle: string;
  blocks: unknown;
  body: string;
  countryNameJa: string | null;
} | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.articles.id,
        title: schema.articles.title,
        subtitle: schema.articles.subtitle,
        lead: schema.articles.lead,
        topic: schema.articles.topic,
        coverImageUrl: schema.articles.coverImageUrl,
        publishedAt: schema.articles.publishedAt,
        status: schema.articles.status,
        writerId: schema.articles.writerId,
        bodyStyle: schema.articles.bodyStyle,
        blocks: schema.articles.blocks,
        body: schema.articles.body,
        deletedAt: schema.articles.deletedAt,
        countryNameJa: schema.countries.nameJa,
      })
      .from(schema.articles)
      .leftJoin(schema.cities, eq(schema.cities.id, schema.articles.cityId))
      .leftJoin(schema.countries, eq(schema.countries.id, schema.cities.countryId))
      .where(eq(schema.articles.id, id))
      .limit(1);
    const r = rows[0];
    if (!r || r.deletedAt) return null;
    return { ...r, status: r.status as string, countryNameJa: r.countryNameJa ?? null };
  } catch {
    return null;
  }
}
