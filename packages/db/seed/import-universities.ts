/**
 * 海外大学マスタの取り込み（Wikidata SPARQL → universities テーブル）。
 *
 * 使い方:
 *   DATABASE_URL=postgres://... pnpm --filter @locore/db db:import-universities
 *   （事前に manual/0081_universities.sql の適用が必要）
 *
 * 方針:
 *   - 主要留学先 16 か国について、国ごとに Wikidata SPARQL へ GET。
 *     User-Agent 必須（無いと 403）。国の間に sleep を入れて礼儀正しく叩く。
 *   - タイムアウト回避のため P279*（下位クラス推移）は使わず主要クラスを列挙。
 *     取りこぼしより安定性優先（Wikidata は品質にムラがあり完璧は狙わない）。
 *   - 国単位のクエリが落ちたらクラス単位に分割してリトライ。
 *   - wikidata_id（QID）を一意キーに ON CONFLICT DO UPDATE で冪等 upsert。
 *     再実行でソースの内容に同期される。
 *
 * フィルタ（明らかなゴミ落とし）:
 *   - 英語ラベルが無い（ラベルサービスが QID 文字列を返す）ものは捨てる
 *   - 廃止済み（P576 dissolved あり）は SPARQL 側で除外
 */
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { createDbClient } from '../src/client';
import { universities, type NewUniversity } from '../src/schema';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT =
  'locore-university-import/1.0 (contact: yuhi.japan.5931@gmail.com)';

/** 対象国（ユーザー決定の主要留学先 16 か国）。 */
const COUNTRIES: Array<{ iso2: string; qid: string; nameJa: string }> = [
  { iso2: 'US', qid: 'Q30', nameJa: 'アメリカ' },
  { iso2: 'GB', qid: 'Q145', nameJa: 'イギリス' },
  { iso2: 'CA', qid: 'Q16', nameJa: 'カナダ' },
  { iso2: 'AU', qid: 'Q408', nameJa: 'オーストラリア' },
  { iso2: 'NZ', qid: 'Q664', nameJa: 'ニュージーランド' },
  { iso2: 'IE', qid: 'Q27', nameJa: 'アイルランド' },
  { iso2: 'DE', qid: 'Q183', nameJa: 'ドイツ' },
  { iso2: 'FR', qid: 'Q142', nameJa: 'フランス' },
  { iso2: 'NL', qid: 'Q55', nameJa: 'オランダ' },
  { iso2: 'CH', qid: 'Q39', nameJa: 'スイス' },
  { iso2: 'SE', qid: 'Q34', nameJa: 'スウェーデン' },
  { iso2: 'ES', qid: 'Q29', nameJa: 'スペイン' },
  { iso2: 'IT', qid: 'Q38', nameJa: 'イタリア' },
  { iso2: 'SG', qid: 'Q334', nameJa: 'シンガポール' },
  { iso2: 'KR', qid: 'Q884', nameJa: '韓国' },
  { iso2: 'TW', qid: 'Q865', nameJa: '台湾' },
];

/**
 * 拾う機関クラス（P31 直付け）。P279*（下位クラス推移）はタイムアウトするため
 * 使わず、主要大学の実データで確認したクラスを列挙する。
 * （例: UBC/LSE/TU Berlin = public research university、SNU/NTU = national +
 *  research university、Sciences Po = grande école + public university）
 */
const TYPE_QIDS = [
  'Q3918', // university
  'Q875538', // public university
  'Q902104', // private university
  'Q62078547', // public research university
  'Q15936437', // research university
  'Q265662', // national university
  'Q1767829', // comprehensive university
  'Q1371037', // institute of technology
  'Q189004', // college
  'Q3551775', // university of applied sciences
  'Q38723', // higher education institution（LSE 等は P31 直付け）
  'Q847027', // grande école（仏）
  'Q1542938', // grand établissement（仏）
];

type SparqlBinding = {
  u?: { value: string };
  uLabel?: { value: string };
  jaLabel?: { value: string };
  cityEn?: { value: string };
  cityJa?: { value: string };
  website?: { value: string };
};

function buildQuery(countryQid: string, typeQids: string[]): string {
  const types = typeQids.map((q) => `wd:${q}`).join(' ');
  return `
SELECT ?u ?uLabel ?jaLabel ?cityEn ?cityJa ?website WHERE {
  VALUES ?type { ${types} }
  ?u wdt:P31 ?type ; wdt:P17 wd:${countryQid} .
  FILTER NOT EXISTS { ?u wdt:P576 ?dissolved. }
  OPTIONAL { ?u wdt:P856 ?website. }
  OPTIONAL { ?u rdfs:label ?jaLabel. FILTER(LANG(?jaLabel) = 'ja') }
  OPTIONAL {
    ?u wdt:P131 ?city.
    OPTIONAL { ?city rdfs:label ?cityJa. FILTER(LANG(?cityJa) = 'ja') }
    OPTIONAL { ?city rdfs:label ?cityEn. FILTER(LANG(?cityEn) = 'en') }
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. ?u rdfs:label ?uLabel. }
}`;
}

async function sparql(query: string): Promise<SparqlBinding[]> {
  const url = `${ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`SPARQL HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      results?: { bindings?: SparqlBinding[] };
    };
    return json.results?.bindings ?? [];
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** ?u の URI（http://www.wikidata.org/entity/Q49088）から QID を抽出。 */
function qidOf(uri: string | undefined): string | null {
  const m = uri?.match(/\/(Q\d+)$/);
  return m ? m[1]! : null;
}

type Row = {
  wikidataId: string;
  nameEn: string;
  nameJa: string | null;
  city: string | null;
  website: string | null;
};

/**
 * バインディング（同一大学が type/都市/ラベルの組合せで複数行になる）を
 * QID で束ねる。ja ラベル・都市・website は「最初に見つかった非 null」を採用。
 */
function collectRows(bindings: SparqlBinding[], into: Map<string, Row>): void {
  for (const b of bindings) {
    const qid = qidOf(b.u?.value);
    if (!qid) continue;
    const nameEn = b.uLabel?.value?.trim() ?? '';
    // ラベルサービスは英語ラベルが無いと QID 文字列を返す → ゴミとして捨てる
    if (!nameEn || /^Q\d+$/.test(nameEn)) continue;
    const prev = into.get(qid);
    const city = b.cityJa?.value ?? b.cityEn?.value ?? null;
    if (!prev) {
      into.set(qid, {
        wikidataId: qid,
        nameEn,
        nameJa: b.jaLabel?.value ?? null,
        city,
        website: b.website?.value ?? null,
      });
    } else {
      prev.nameJa = prev.nameJa ?? b.jaLabel?.value ?? null;
      // 都市は日本語ラベルを優先して昇格させる
      if (b.cityJa?.value) prev.city = b.cityJa.value;
      else prev.city = prev.city ?? city;
      prev.website = prev.website ?? b.website?.value ?? null;
    }
  }
}

async function fetchCountry(country: {
  iso2: string;
  qid: string;
  nameJa: string;
}): Promise<Map<string, Row>> {
  const rows = new Map<string, Row>();
  try {
    collectRows(await sparql(buildQuery(country.qid, TYPE_QIDS)), rows);
    return rows;
  } catch (err) {
    console.warn(
      `[import-universities] ${country.iso2}: 一括クエリ失敗（${
        err instanceof Error ? err.message : err
      }）。クラス別に分割してリトライします。`,
    );
  }
  // フォールバック: クラス単位の小さいクエリに分割
  for (const type of TYPE_QIDS) {
    try {
      collectRows(await sparql(buildQuery(country.qid, [type])), rows);
    } catch (err) {
      console.warn(
        `[import-universities] ${country.iso2} / ${type} 失敗: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
    await sleep(1_000);
  }
  return rows;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL が未設定です。');
    process.exit(1);
  }
  const db = createDbClient(databaseUrl);

  const perCountry: Array<{ iso2: string; count: number; ja: number }> = [];
  let total = 0;
  let totalJa = 0;

  for (const country of COUNTRIES) {
    const rows = await fetchCountry(country);
    const values: NewUniversity[] = Array.from(rows.values()).map((r) => ({
      wikidataId: r.wikidataId,
      nameEn: r.nameEn,
      nameJa: r.nameJa,
      countryCode: country.iso2,
      country: country.nameJa,
      city: r.city,
      website: r.website,
      source: 'wikidata',
    }));

    // 500 件ずつ冪等 upsert（QID 一意・再実行でソースに同期）
    for (let i = 0; i < values.length; i += 500) {
      const batch = values.slice(i, i + 500);
      await db
        .insert(universities)
        .values(batch)
        .onConflictDoUpdate({
          target: universities.wikidataId,
          set: {
            nameEn: sql`excluded.name_en`,
            nameJa: sql`excluded.name_ja`,
            countryCode: sql`excluded.country_code`,
            country: sql`excluded.country`,
            city: sql`excluded.city`,
            website: sql`excluded.website`,
            source: sql`excluded.source`,
            updatedAt: sql`now()`,
          },
        });
    }

    const ja = values.filter((v) => v.nameJa).length;
    perCountry.push({ iso2: country.iso2, count: values.length, ja });
    total += values.length;
    totalJa += ja;
    console.log(
      `[import-universities] ${country.iso2}: ${values.length} 件（日本語名あり ${ja}）`,
    );
    await sleep(1_500);
  }

  console.log('\n===== 取り込み結果 =====');
  for (const c of perCountry) {
    const pct = c.count ? Math.round((c.ja / c.count) * 100) : 0;
    console.log(`  ${c.iso2}: ${c.count} 件（ja ${c.ja} / ${pct}%）`);
  }
  console.log(
    `  合計: ${total} 件（日本語名あり ${totalJa} / ${
      total ? Math.round((totalJa / total) * 100) : 0
    }%）`,
  );

  process.exit(0);
}

main().catch((err) => {
  console.error('[import-universities] failed:', err);
  process.exit(1);
});
