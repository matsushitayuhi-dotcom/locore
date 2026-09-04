/**
 * v2 エキスパート相談（/experts）用のサンプルデータを投入するシード（is_sample=true）。
 *
 * 使い方:
 *   DATABASE_URL=postgres://... pnpm --filter @locore/db db:seed-experts
 *
 * 投入内容:
 *   - cities: london / nyc を active 化 + berlin / bangkok / melbourne / vancouver を追加
 *   - users: エキスパート 8 名（residency_city / arrival_year / occupation / offerings / languages 入り）
 *   - residency_verifications: 各エキスパートに approved 1 行（居住認証済みバッジ用）
 *   - user_services: 各エキスパートに 30分 / 60分 の相談メニュー 2 行
 *     （tags = ['consultation', テーマ1, テーマ2] — 'consultation' 予約タグで相談メニュー判定）
 *
 * 冪等性:
 *   seed-mock.ts と同じく決定論的 UUID + ON CONFLICT DO UPDATE。再実行で内容を同期する。
 *
 * クリーンアップ:
 *   `DELETE FROM users WHERE is_sample = true;`（user_services / residency_verifications は
 *   FK cascade で連鎖削除）。
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { createDbClient } from '../src/client';
import {
  cities,
  users,
  writerProfiles,
  articles,
  residencyVerifications,
  userServices,
  expertAvailability,
  consultationBookings,
  type NewCity,
  type NewUser,
  type NewWriterProfile,
  type NewArticle,
  type NewResidencyVerification,
  type NewUserService,
  type NewExpertAvailability,
  type NewConsultationBooking,
} from '../src/schema';

// =============================================================================
// 決定論的 UUID（seed-mock.ts と同じネームスペース）
// =============================================================================

function stableUuid(seed: string): string {
  const hash = createHash('sha1').update(`locore-mock:${seed}`).digest('hex');
  const v = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)
  }${hash.slice(18, 20)}-${hash.slice(20, 32)}`;
  return v;
}

// =============================================================================
// タイムゾーン変換（apps/web/lib/bookings/time.ts の localToUtc と同じ Intl 方式。
// seed は @locore/db 単体で動かすため依存させずに最小限を複製）
// =============================================================================

function tzOffsetMs(tz: string, utc: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(utc);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return (
    Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour') % 24,
      get('minute'),
      get('second'),
    ) - utc.getTime()
  );
}

/** tz の現地時刻 (y,mo,d,hh,mm) に対応する UTC Date（DST 跨ぎは 2 回反復で収束） */
function localToUtc(
  tz: string,
  y: number,
  mo: number,
  d: number,
  hh: number,
  mm: number,
): Date {
  const wall = Date.UTC(y, mo - 1, d, hh, mm);
  let ts = wall;
  for (let i = 0; i < 2; i++) {
    ts = wall - tzOffsetMs(tz, new Date(ts));
  }
  return new Date(ts);
}

// =============================================================================
// 都市（v2 で active 化 / 追加する分だけ）
// =============================================================================

const expertCities: NewCity[] = [
  // 既存 coming soon → active 化
  {
    slug: 'london',
    nameJa: 'ロンドン',
    country: 'GB',
    lat: 51.5074,
    lng: -0.1278,
    timezone: 'Europe/London',
    isActive: true,
  },
  {
    slug: 'nyc',
    nameJa: 'ニューヨーク',
    country: 'US',
    lat: 40.7128,
    lng: -74.006,
    timezone: 'America/New_York',
    isActive: true,
  },
  // v2 追加都市
  {
    slug: 'berlin',
    nameJa: 'ベルリン',
    country: 'DE',
    lat: 52.52,
    lng: 13.405,
    timezone: 'Europe/Berlin',
    isActive: true,
  },
  {
    slug: 'bangkok',
    nameJa: 'バンコク',
    country: 'TH',
    lat: 13.7563,
    lng: 100.5018,
    timezone: 'Asia/Bangkok',
    isActive: true,
  },
  {
    slug: 'melbourne',
    nameJa: 'メルボルン',
    country: 'AU',
    lat: -37.8136,
    lng: 144.9631,
    timezone: 'Australia/Melbourne',
    isActive: true,
  },
  {
    slug: 'vancouver',
    nameJa: 'バンクーバー',
    country: 'CA',
    lat: 49.2827,
    lng: -123.1207,
    timezone: 'America/Vancouver',
    isActive: true,
  },
];

/** citySlug → IANA タイムゾーン（users.timezone と空き枠生成に使う） */
const CITY_TZ: Record<string, string> = {
  paris: 'Europe/Paris',
  london: 'Europe/London',
  nyc: 'America/New_York',
  berlin: 'Europe/Berlin',
  bangkok: 'Asia/Bangkok',
  melbourne: 'Australia/Melbourne',
  vancouver: 'America/Vancouver',
};

// =============================================================================
// エキスパート定義（mockups/v2 のカードコピーに準拠）
// =============================================================================

type ExpertSeed = {
  key: string;
  displayName: string;
  citySlug: string;
  cityJa: string;
  country: string; // ISO alpha-2 大文字（users.residency_country）
  arrivalYear: number;
  occupation: string;
  bio: string;
  offerings: string[];
  languages: Array<{ code: string; level: string }>;
  /** メニュー言語表示用（user_services.languages） */
  languageLabels: string[];
  topics: [string, string];
  /** メニュー名（内容が伝わる名前 + 末尾に所要時間）。30分/60分で重複させない */
  title30: string;
  title60: string;
  price30: number;
  price60: number;
  desc30: string;
  desc60: string;
};

const EXPERTS: ExpertSeed[] = [
  {
    key: 'aya',
    displayName: '佐々木 彩',
    citySlug: 'paris',
    cityJa: 'パリ',
    country: 'FR',
    arrivalYear: 2018,
    occupation: '輸入雑貨会社 経営（元日系商社 パリ駐在）',
    bio: '元日系商社の駐在から現地で起業。ビザ・会社設立・アパート探しまで、渡仏まわりは一通り経験しています。駐在員として「会社に守られた海外生活」と、起業してからの「すべて自分で手続きする生活」の両方を知っているのが強みです。',
    offerings: [
      '渡仏前に決めるべきこと・日本でしかできない手続きの整理',
      'パリのエリア選び — 治安・家賃相場・日本人コミュニティとの距離感',
      'アパート探しと契約の注意点（保証人問題、ドシエの作り方）',
      'フランスでの起業・フリーランス登録の実際',
      '銀行口座・保険・携帯など、最初の1か月の段取り',
    ],
    languages: [
      { code: 'ja', level: 'native' },
      { code: 'fr', level: 'business' },
      { code: 'en', level: 'business' },
    ],
    languageLabels: ['日本語', 'フランス語', '英語'],
    topics: ['immigration', 'work'],
    title30: 'パリ移住のビザ・エリア選び相談（30分）',
    title60: '渡仏プランをまるごと設計（60分）',
    price30: 4000,
    price60: 7000,
    desc30:
      'ピンポイントの疑問に。ビザ・エリア選び・手続きなど、テーマを1〜2個に絞ってじっくりお答えします。',
    desc60:
      '移住・駐在の全体設計に。現状を伺ってから、渡仏までのやることを時系列で一緒に整理します。相談後に要点メモをお送りします。',
  },
  {
    key: 'kentaro',
    displayName: '高橋 健太郎',
    citySlug: 'london',
    cityJa: 'ロンドン',
    country: 'GB',
    arrivalYear: 2021,
    occupation: '金融系 現地採用（元駐在）',
    bio: '金融系の駐在で渡英し、現地採用に切替。子供2人が現地の小学校に通っており、学校選びと教育事情が得意です。帯同家族の生活立ち上げも自分ごととして経験してきました。',
    offerings: [
      'ロンドンの学校選び（州立・私立・日本人学校の実際）',
      '駐在帯同家族の生活立ち上げの段取り',
      'エリア別の治安・家賃感覚と通学圏の考え方',
      'NHS・保険など医療まわりの基本',
    ],
    languages: [
      { code: 'ja', level: 'native' },
      { code: 'en', level: 'business' },
    ],
    languageLabels: ['日本語', '英語'],
    topics: ['expat_prep', 'childcare'],
    title30: 'ロンドンの学校選び・教育相談（30分）',
    title60: '駐在帯同の準備をまるごと整理（60分）',
    price30: 3500,
    price60: 6500,
    desc30:
      '学校選び・エリア選びなど、テーマを絞ったピンポイント相談に。まず気になっていることからどうぞ。',
    desc60:
      '駐在帯同の全体準備に。ご家族の状況を伺って、渡英までのやることリストを一緒に作ります。',
  },
  {
    key: 'misaki',
    displayName: '山本 実咲',
    citySlug: 'berlin',
    cityJa: 'ベルリン',
    country: 'DE',
    arrivalYear: 2020,
    occupation: 'フリーランスデザイナー',
    bio: 'フリーランスビザで働くデザイナー。ドイツの役所手続き・保険・住民登録のつまずきポイントを先回りできます。「調べても人によって言うことが違う」ドイツの手続きを、実体験ベースで整理します。',
    offerings: [
      'フリーランスビザの申請準備と必要書類',
      'Anmeldung（住民登録）・税番号などの役所手続き',
      '公的保険・民間保険の選び方',
      'ベルリンの部屋探しとWG事情',
    ],
    languages: [
      { code: 'ja', level: 'native' },
      { code: 'de', level: 'business' },
      { code: 'en', level: 'business' },
    ],
    languageLabels: ['日本語', 'ドイツ語', '英語'],
    topics: ['immigration', 'procedures'],
    title30: 'ドイツのビザ・役所手続き相談（30分）',
    title60: 'ベルリン移住の段取りを一緒に設計（60分）',
    price30: 3000,
    price60: 6000,
    desc30:
      'ビザ・役所手続き・保険など、いま詰まっているポイントをピンポイントで解消します。',
    desc60:
      'ドイツ移住の全体像を整理したい方に。渡独前後のやることを時系列で一緒に組み立てます。',
  },
  {
    key: 'daisuke',
    displayName: '中村 大輔',
    citySlug: 'bangkok',
    cityJa: 'バンコク',
    country: 'TH',
    arrivalYear: 2016,
    occupation: '現地法人 経営',
    bio: '現地法人を経営して10年。駐在の立ち上げ、コンドミニアム選び、タイ移住の生活コスト感覚まで具体的に話せます。数字ベースで「実際いくらかかるか」をお伝えするのが得意です。',
    offerings: [
      'バンコクのコンドミニアム選びと賃貸契約の注意点',
      '駐在立ち上げ・現地法人設立の実務',
      'タイ移住の生活コストシミュレーション',
      'ビザ・ワークパーミットの基本',
    ],
    languages: [
      { code: 'ja', level: 'native' },
      { code: 'en', level: 'business' },
    ],
    languageLabels: ['日本語', 'タイ語', '英語'],
    topics: ['immigration', 'housing'],
    title30: 'バンコクの住まい・生活コスト相談（30分）',
    title60: 'タイ移住・駐在立ち上げの全体設計（60分）',
    price30: 3000,
    price60: 6000,
    desc30:
      '住まい選び・生活コストなど、気になるテーマを1つ選んでご相談ください。',
    desc60:
      '移住・駐在立ち上げの全体設計に。ご予算とご家族構成を伺って具体的なプランに落とします。',
  },
  {
    key: 'eri',
    displayName: '藤田 絵里',
    citySlug: 'nyc',
    cityJa: 'ニューヨーク',
    country: 'US',
    arrivalYear: 2019,
    occupation: '現地企業デザイナー（美大留学出身）',
    bio: '美大留学からそのまま現地企業のデザイナーに。ポートフォリオ・学校選び・OPT後の就職のリアルを話せます。留学を「就職につなげる」視点でアドバイスできるのが強みです。',
    offerings: [
      'アメリカ美大・アート系留学の学校選び',
      'ポートフォリオの作り方と出願準備',
      'OPT・就労ビザまわりの実体験ベースの流れ',
      'ニューヨークの家探しとルームシェア事情',
    ],
    languages: [
      { code: 'ja', level: 'native' },
      { code: 'en', level: 'business' },
    ],
    languageLabels: ['日本語', '英語'],
    topics: ['study_abroad', 'work'],
    title30: 'アメリカ美大留学・ポートフォリオ相談（30分）',
    title60: '留学から現地就職までのプラン設計（60分）',
    price30: 5000,
    price60: 9000,
    desc30:
      '留学準備・ポートフォリオ・就職など、いま一番聞きたいことをピンポイントで。',
    desc60:
      '留学から就職までの全体設計に。ご希望の分野を伺って、学校リストと準備スケジュールを一緒に考えます。',
  },
  {
    key: 'haruka',
    displayName: '小川 遥',
    citySlug: 'melbourne',
    cityJa: 'メルボルン',
    country: 'AU',
    arrivalYear: 2022,
    occupation: 'カフェマネージャー（ワーホリ→現地就職）',
    bio: 'ワーキングホリデーから現地就職（カフェマネージャー）。語学学校選び、仕事探し、シェアハウスの探し方が得意です。ワーホリの「最初の3か月」をどう設計するかで、その後が大きく変わります。',
    offerings: [
      'ワーホリ渡航前の準備と最初の3か月の設計',
      '語学学校の選び方（値段と質の見極め）',
      'ローカルジョブの探し方・応募のコツ',
      'シェアハウスの探し方と契約トラブル回避',
    ],
    languages: [
      { code: 'ja', level: 'native' },
      { code: 'en', level: 'business' },
    ],
    languageLabels: ['日本語', '英語'],
    topics: ['study_abroad', 'travel'],
    title30: 'ワーホリの学校・仕事・家さがし相談（30分）',
    title60: 'ワーホリ1年のロードマップ作り（60分）',
    price30: 3000,
    price60: 5500,
    desc30:
      'ワーホリ・留学準備のピンポイント相談に。学校・仕事・家、どれからでもどうぞ。',
    desc60:
      'ワーホリ1年の全体プランを一緒に。ご予算と目的を伺って、渡航後のロードマップを作ります。',
  },
  {
    key: 'chinatsu',
    displayName: '森本 千夏',
    citySlug: 'vancouver',
    cityJa: 'バンクーバー',
    country: 'CA',
    arrivalYear: 2020,
    occupation: '現地企業勤務（元留学エージェント）',
    bio: '元留学エージェント勤務で、現地カレッジ卒。学校の「パンフレットに載らない評判」とホームステイ事情に詳しいです。エージェント側と留学生側の両方を知っているので、営業トーク抜きでお話しできます。',
    offerings: [
      'カレッジ・語学学校の「実際の評判」ベースの選び方',
      'ホームステイ・シェアハウスの探し方と注意点',
      'Co-op留学の実際（働きながら学ぶリアル）',
      '留学エージェントとの付き合い方・見積もりの見方',
    ],
    languages: [
      { code: 'ja', level: 'native' },
      { code: 'en', level: 'business' },
    ],
    languageLabels: ['日本語', '英語'],
    topics: ['study_abroad', 'procedures'],
    title30: 'カナダ留学の学校選び相談（30分）',
    title60: 'カナダ留学の全体設計と出願段取り（60分）',
    price30: 3500,
    price60: 6500,
    desc30:
      '学校選び・滞在先など、留学準備のピンポイント相談に。候補があればお持ちください。',
    desc60:
      '留学の全体設計に。目的とご予算から、学校の候補出しと出願までの段取りを一緒に整理します。',
  },
  {
    key: 'mayu',
    displayName: '岡田 真由',
    citySlug: 'paris',
    cityJa: 'パリ',
    country: 'FR',
    arrivalYear: 2015,
    occupation: '日仏家庭の子育て中（元語学学校スタッフ）',
    bio: 'パリで2人の子供を育てる日仏家庭。保育園（クレッシュ）から現地小学校まで、フランスの子育て・教育制度を実体験で語れます。子連れ旅行のリアルな段取りもお任せください。',
    offerings: [
      'クレッシュ・保育ママなどフランスの保育制度の実際',
      '現地校・バイリンガル教育のリアル',
      '子連れパリ旅行の段取り（ベビーカー事情・小児科など）',
      '出産・子育てまわりの行政手続き',
    ],
    languages: [
      { code: 'ja', level: 'native' },
      { code: 'fr', level: 'business' },
    ],
    languageLabels: ['日本語', 'フランス語'],
    topics: ['childcare', 'travel'],
    title30: 'パリの保育園・子育て相談（30分）',
    title60: '子連れ移住・帯同準備をまるごと相談（60分）',
    price30: 3500,
    price60: 6000,
    desc30:
      '保育園・学校・子連れ旅行など、子育てまわりの疑問をピンポイントで。',
    desc60:
      '子連れ移住・帯同の全体準備に。お子さんの年齢に合わせて、渡仏後の選択肢を一緒に整理します。',
  },
];

// =============================================================================
// メイン
// =============================================================================

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for seed-experts');
  }
  const db = createDbClient(databaseUrl);

  // ---- cities -------------------------------------------------------------
  console.log('[seed-experts] cities ...');
  await db
    .insert(cities)
    .values(expertCities)
    .onConflictDoUpdate({
      target: cities.slug,
      set: {
        nameJa: sql`excluded.name_ja`,
        country: sql`excluded.country`,
        lat: sql`excluded.lat`,
        lng: sql`excluded.lng`,
        timezone: sql`excluded.timezone`,
        isActive: sql`excluded.is_active`,
      },
    });

  // country_id が未設定の都市を countries にひも付け（国ファーストフィルタ用。
  // cities.country は alpha-2 だが大文字混在の旧データがあるため lower で照合）
  await db.execute(sql`
    UPDATE cities SET country_id = countries.id
      FROM countries
     WHERE cities.country_id IS NULL
       AND lower(cities.country) = countries.code
  `);

  // 使う都市の slug → UUID
  const usedSlugs = Array.from(new Set(EXPERTS.map((e) => e.citySlug)));
  const cityRows = await db.select({ id: cities.id, slug: cities.slug }).from(cities);
  const cityIdBySlug: Record<string, string> = {};
  for (const c of cityRows) cityIdBySlug[c.slug] = c.id;
  for (const slug of usedSlugs) {
    if (!cityIdBySlug[slug]) throw new Error(`city not seeded: ${slug}`);
  }

  // ---- users --------------------------------------------------------------
  console.log(`[seed-experts] users (${EXPERTS.length}) ...`);
  const expertUuid = (key: string) => stableUuid(`expert:${key}`);

  const userRows: NewUser[] = EXPERTS.map((e) => ({
    id: expertUuid(e.key),
    email: `expert-${e.key}@sample.locore.test`,
    displayName: e.displayName,
    avatarUrl: null,
    bio: e.bio,
    role: 'resident_writer',
    residencyCountry: e.country,
    residencyCity: e.cityJa,
    arrivalYear: e.arrivalYear,
    occupation: e.occupation,
    offerings: e.offerings,
    languages: e.languages,
    timezone: CITY_TZ[e.citySlug] ?? null,
    isSample: true,
  }));

  await db
    .insert(users)
    .values(userRows)
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: sql`excluded.email`,
        displayName: sql`excluded.display_name`,
        avatarUrl: sql`excluded.avatar_url`,
        bio: sql`excluded.bio`,
        role: sql`excluded.role`,
        residencyCountry: sql`excluded.residency_country`,
        residencyCity: sql`excluded.residency_city`,
        arrivalYear: sql`excluded.arrival_year`,
        occupation: sql`excluded.occupation`,
        offerings: sql`excluded.offerings`,
        languages: sql`excluded.languages`,
        timezone: sql`excluded.timezone`,
        isSample: sql`excluded.is_sample`,
      },
    });

  // ---- writer_profiles（記事の著者情報。residency_years 表示用） -----------
  console.log('[seed-experts] writer_profiles ...');
  const wpRows: NewWriterProfile[] = EXPERTS.map((e) => ({
    userId: expertUuid(e.key),
    tier: 'B' as const,
    residencyCountry: e.country,
    residencyYears: 2026 - e.arrivalYear,
    bio: e.bio,
    isSample: true,
  }));
  await db
    .insert(writerProfiles)
    .values(wpRows)
    .onConflictDoUpdate({
      target: writerProfiles.userId,
      set: {
        residencyCountry: sql`excluded.residency_country`,
        residencyYears: sql`excluded.residency_years`,
        bio: sql`excluded.bio`,
        isSample: sql`excluded.is_sample`,
      },
    });

  // ---- articles（ブログ再位置付け: エキスパートのブランディング記事） ------
  console.log('[seed-experts] articles (blog repositioning samples) ...');
  const articleRows: NewArticle[] = [
    {
      id: stableUuid('expert-art:aya-guarantor'),
      writerId: expertUuid('aya'),
      cityId: cityIdBySlug['paris']!,
      title: 'パリのアパート探し、保証人がいない人のための現実的な選択肢3つ',
      body:
        '渡仏してすぐの部屋探しで一番の壁になるのが保証人（garant）です。フランスの賃貸は日本以上に保証人を重視していて、収入があっても「フランス国内の保証人」がいないと門前払いされることが珍しくありません。\n\nこの記事では、私自身と、これまで相談に乗ってきた方々の経験から、保証人がいない人が実際に部屋を借りられた3つのルートを紹介します。\n\n1つ目は Visale（ヴィザル）。国が保証人代わりになってくれる制度で、30歳以下または転職直後の人なら使えます。オーナーによっては嫌がる人もいますが、対応物件は年々増えています。\n\n2つ目は保証会社（GarantMe など）。年間家賃の3〜4%程度の費用はかかりますが、書類が揃えば早いです。\n\n3つ目は銀行保証（caution bancaire）。家賃1年分程度を凍結口座に預ける方法で、資金に余裕がある駐在準備の方に向いています。\n\nどれを選ぶべきかはビザの種類と収入証明の形で変わります。個別の事情は相談で一緒に整理しましょう。',
      coverImageUrl: null,
      priceJpy: 0,
      status: 'published' as const,
      tags: ['住まい', 'パリ', '手続き'],
      durationType: 'other' as const,
      articleType: 'expat_info' as const,
      publishedAt: new Date('2026-07-14T09:00:00Z'),
      isSample: true,
    },
    {
      id: stableUuid('expert-art:aya-first-month'),
      writerId: expertUuid('aya'),
      cityId: cityIdBySlug['paris']!,
      title: '渡仏1か月目にやること — 銀行口座・保険・携帯の順番を間違えると詰む話',
      body:
        'フランスの生活立ち上げは「順番」がすべてです。銀行口座を開くには住所証明が要り、住所証明には携帯番号が要り、携帯契約には銀行口座が要る——という循環参照に、渡仏したばかりの人は必ずぶつかります。\n\n私が8年前につまずき、その後たくさんの相談者と一緒に検証してきた「詰まない順番」はこうです。\n\nまず日本にいるうちに、国際対応のオンライン銀行（Wise など）とプリペイドSIMを用意しておく。到着後は仮住まいの宿泊証明で携帯（Free など書類が緩い会社）を契約し、その番号でフランスの銀行の口座開設予約を取る。住居が決まったら電気（EDF）の契約書を住所証明として各所に提出——。\n\nこの順番なら、最初の1か月で生活インフラが一通り揃います。逆にどこか1つでも順番を飛ばすと、2〜3か月は平気で溶けます。\n\nあなたのビザと滞在形態によって細部は変わるので、渡仏日が決まっている方は一度相談で段取りを確認するのがおすすめです。',
      coverImageUrl: null,
      priceJpy: 0,
      status: 'published' as const,
      tags: ['生活手続き', 'パリ', '移住'],
      durationType: 'other' as const,
      articleType: 'expat_info' as const,
      publishedAt: new Date('2026-03-21T09:00:00Z'),
      isSample: true,
    },
  ];
  await db
    .insert(articles)
    .values(articleRows)
    .onConflictDoUpdate({
      target: articles.id,
      set: {
        title: sql`excluded.title`,
        body: sql`excluded.body`,
        priceJpy: sql`excluded.price_jpy`,
        status: sql`excluded.status`,
        tags: sql`excluded.tags`,
        articleType: sql`excluded.article_type`,
        publishedAt: sql`excluded.published_at`,
        isSample: sql`excluded.is_sample`,
      },
    });

  // ---- residency_verifications（approved 1 行 / 人） -----------------------
  console.log('[seed-experts] residency_verifications ...');
  const rvRows: NewResidencyVerification[] = EXPERTS.map((e) => ({
    id: stableUuid(`expert-rv:${e.key}`),
    userId: expertUuid(e.key),
    documentType: 'residence_card' as const,
    documentPaths: [],
    country: e.country,
    city: e.cityJa,
    status: 'approved' as const,
    submittedAt: new Date('2026-08-01T00:00:00Z'),
    reviewedAt: new Date('2026-08-03T00:00:00Z'),
  }));

  await db
    .insert(residencyVerifications)
    .values(rvRows)
    .onConflictDoUpdate({
      target: residencyVerifications.id,
      set: {
        status: sql`excluded.status`,
        country: sql`excluded.country`,
        city: sql`excluded.city`,
        submittedAt: sql`excluded.submitted_at`,
        reviewedAt: sql`excluded.reviewed_at`,
      },
    });

  // ---- user_services（30分 / 60分 の相談メニュー） -------------------------
  console.log('[seed-experts] user_services (consultation menus) ...');
  const svcRows: NewUserService[] = EXPERTS.flatMap((e): NewUserService[] => [
    {
      id: stableUuid(`expert-svc30:${e.key}`),
      userId: expertUuid(e.key),
      title: e.title30,
      description: e.desc30,
      category: 'consulting',
      priceJpy: e.price30,
      priceUnit: '30分・税込',
      contactMethod: 'chat',
      cityId: cityIdBySlug[e.citySlug]!,
      audience: 'both',
      tags: ['consultation', e.topics[0], e.topics[1]],
      durationLabel: '30分',
      languages: e.languageLabels,
      isActive: true,
      position: 0,
    },
    {
      id: stableUuid(`expert-svc60:${e.key}`),
      userId: expertUuid(e.key),
      title: e.title60,
      description: e.desc60,
      category: 'consulting',
      priceJpy: e.price60,
      priceUnit: '60分・税込',
      contactMethod: 'chat',
      cityId: cityIdBySlug[e.citySlug]!,
      audience: 'both',
      tags: ['consultation', e.topics[0], e.topics[1]],
      durationLabel: '60分',
      languages: e.languageLabels,
      isActive: true,
      position: 1,
    },
  ]);

  await db
    .insert(userServices)
    .values(svcRows)
    .onConflictDoUpdate({
      target: userServices.id,
      set: {
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        category: sql`excluded.category`,
        priceJpy: sql`excluded.price_jpy`,
        priceUnit: sql`excluded.price_unit`,
        contactMethod: sql`excluded.contact_method`,
        cityId: sql`excluded.city_id`,
        audience: sql`excluded.audience`,
        tags: sql`excluded.tags`,
        durationLabel: sql`excluded.duration_label`,
        languages: sql`excluded.languages`,
        isActive: sql`excluded.is_active`,
        position: sql`excluded.position`,
      },
    });

  // ---- expert_availability（今後3週間・週3区間・現地夕方〜夜中心） ----------
  // 決定論的 ID + ON CONFLICT DO UPDATE で、再実行のたびに未来の枠へ同期される。
  console.log('[seed-experts] expert_availability ...');
  type Window = { dow: number; startH: number; endH: number }; // dow: 0=日
  const WINDOWS: Window[] = [
    { dow: 3, startH: 18, endH: 20 }, // 水 18-20（現地）
    { dow: 5, startH: 19, endH: 21 }, // 金 19-21（現地）
    { dow: 6, startH: 9, endH: 12 }, // 土 午前（現地）
  ];
  /** 今日より後で最初に weekday=dow になる日付（UTC 基準の日付でよい） */
  const nextDow = (dow: number): Date => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    while (d.getUTCDay() !== dow) d.setUTCDate(d.getUTCDate() + 1);
    return d;
  };
  const availRows: NewExpertAvailability[] = EXPERTS.flatMap((e) => {
    const tz = CITY_TZ[e.citySlug] ?? 'UTC';
    return WINDOWS.flatMap((w, wi) => {
      const base = nextDow(w.dow);
      return [0, 1, 2].map((week): NewExpertAvailability => {
        const d = new Date(base);
        d.setUTCDate(d.getUTCDate() + week * 7);
        const y = d.getUTCFullYear();
        const mo = d.getUTCMonth() + 1;
        const day = d.getUTCDate();
        return {
          id: stableUuid(`expert-avail:${e.key}:${wi}:${week}`),
          userId: expertUuid(e.key),
          startAt: localToUtc(tz, y, mo, day, w.startH, 0),
          endAt: localToUtc(tz, y, mo, day, w.endH, 0),
        };
      });
    });
  });
  await db
    .insert(expertAvailability)
    .values(availRows)
    .onConflictDoUpdate({
      target: expertAvailability.id,
      set: {
        userId: sql`excluded.user_id`,
        startAt: sql`excluded.start_at`,
        endAt: sql`excluded.end_at`,
      },
    });

  // ---- consultation_bookings（requested 状態のサンプル 1 件） --------------
  // is_sample ユーザー間: 高橋（ロンドン）→ 佐々木 彩（パリ）の 30 分相談。
  // 佐々木の最初の空き枠冒頭 30 分をリクエスト中にして、受信箱 UI を確認できるようにする。
  console.log('[seed-experts] consultation_bookings (sample requested) ...');
  const ayaFirstSlot = availRows.find(
    (r) => r.userId === expertUuid('aya'),
  )!;
  const aya = EXPERTS.find((e) => e.key === 'aya')!;
  const bookingStart = ayaFirstSlot.startAt as Date;
  const bookingEnd = new Date(bookingStart.getTime() + 30 * 60_000);
  const sampleBooking: NewConsultationBooking = {
    id: stableUuid('expert-booking:sample-requested'),
    serviceId: stableUuid('expert-svc30:aya'),
    expertId: expertUuid('aya'),
    requesterId: expertUuid('kentaro'),
    status: 'requested',
    startAt: bookingStart,
    endAt: bookingEnd,
    durationMinutes: 30,
    serviceTitle: aya.title30,
    priceJpy: aya.price30,
    commissionRate: '0.20',
    platformFeeJpy: Math.round(aya.price30 * 0.2),
    requestMessage:
      '来年4月にパリ移住予定です。ビザ申請の書類と、11区・20区あたりのエリア選びについて相談したいです。',
  };
  await db
    .insert(consultationBookings)
    .values([sampleBooking])
    .onConflictDoUpdate({
      target: consultationBookings.id,
      set: {
        status: sql`excluded.status`,
        startAt: sql`excluded.start_at`,
        endAt: sql`excluded.end_at`,
        priceJpy: sql`excluded.price_jpy`,
        platformFeeJpy: sql`excluded.platform_fee_jpy`,
        serviceTitle: sql`excluded.service_title`,
        requestMessage: sql`excluded.request_message`,
        respondedAt: sql`null`,
        cancelledAt: sql`null`,
      },
    });

  console.log('[seed-experts] done.');
  console.log(`  - experts: ${EXPERTS.length} / menus: ${svcRows.length}`);
  console.log('  - クリーンアップは `DELETE FROM users WHERE is_sample = true;`');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
