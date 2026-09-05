/**
 * v2 エキスパート相談（/experts）用のサンプルデータを投入するシード（is_sample=true）。
 * 2026-09 留学特化リポジショニング: 8 名を海外大学の在学生・アルムナイに全面差し替え
 * （大学院/MBA 4・学部 2・語学交換 1・博士 1）。大学名は実名のサンプル
 * （is_sample・本番前に実エキスパートへ差し替え前提）。
 *
 * 使い方:
 *   DATABASE_URL=postgres://... pnpm --filter @locore/db db:seed-experts
 *
 * 投入内容:
 *   - cities: london / nyc を active 化 + berlin / bangkok / melbourne / vancouver / boston を追加
 *   - users: エキスパート 8 名（residency_city / arrival_year / occupation / offerings /
 *     languages / education(current 付き) / work_history / avatar 入り）
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
import { inArray, sql } from 'drizzle-orm';
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
  type EducationEntry,
  type WorkEntry,
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
  // 留学特化で追加（MBA / 米大学院の定番）
  {
    slug: 'boston',
    nameJa: 'ボストン',
    country: 'US',
    lat: 42.3601,
    lng: -71.0589,
    timezone: 'America/New_York',
    isActive: true,
  },
];

/** citySlug → IANA タイムゾーン（users.timezone と空き枠生成に使う） */
const CITY_TZ: Record<string, string> = {
  paris: 'Europe/Paris',
  london: 'Europe/London',
  nyc: 'America/New_York',
  boston: 'America/New_York',
  berlin: 'Europe/Berlin',
  bangkok: 'Asia/Bangkok',
  melbourne: 'Australia/Melbourne',
  vancouver: 'America/Vancouver',
};

// =============================================================================
// エキスパート定義（留学特化: 在学生・アルムナイ 8 名）
// key は写真ファイル名（/experts/<key>.jpg）と決定論的 UUID に対応 — 変更しない
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
  /** 先頭は必ずトラック（grad_school/mba/undergrad/language_exchange）。
   *  各メニューは最低 1 つトラックタグを持つ約束（/experts フィルタと連動）。 */
  topics: string[];
  /** メニュー名（内容が伝わる名前 + 末尾に所要時間）。30分/60分で重複させない */
  title30: string;
  title60: string;
  /** 経歴（0062）。current=true は在学中（在学生/アルムナイ判定に使用） */
  education: EducationEntry[];
  workHistory: WorkEntry[];
  /** 固定の相談室 URL（0082・任意）。承諾時に参加リンクへ自動コピーされるデモ用 */
  meetingRoom?: string;
  /** 実写アバター（/experts/<key>.jpg・デモ用プレースホルダ） */
  avatar: string;
  price30: number;
  price60: number;
  desc30: string;
  desc60: string;
};

const EXPERTS: ExpertSeed[] = [
  // ---- 大学院 / MBA（4名） ----
  {
    key: 'aya',
    displayName: '高村 里奈',
    citySlug: 'boston',
    cityJa: 'ボストン',
    country: 'US',
    arrivalYear: 2025,
    occupation: 'MBA留学中（ハーバード・ビジネス・スクール）',
    bio: '2024年秋に出願し、HBS と Wharton に合格。2025年からハーバード・ビジネス・スクール（HBS）に在学中です。元総合商社で、社費ではなく私費×奨学金での挑戦でした。エッセイ・推薦状・面接まで、つい先日くぐり抜けたばかりの出願のリアルを話せます。',
    offerings: [
      'MBA出願全体のスケジュール設計（GMAT/GRE・レジュメ・エッセイ）',
      'エッセイの構成と「自分の物語」の掘り起こし',
      '推薦者の選び方と依頼の段取り',
      '私費・奨学金の現実的な資金戦略',
      'ボストンでの生活立ち上げ・家探し',
    ],
    languages: [
      { code: 'ja', level: 'native' },
      { code: 'en', level: 'business' },
    ],
    languageLabels: ['日本語', '英語'],
    topics: ['mba', 'application_docs'],
    title30: 'MBA出願の作戦会議（30分）',
    title60: 'MBAエッセイ骨子レビュー（60分）',
    education: [
      { school: 'ハーバード・ビジネス・スクール', degree: 'MBA', field: '経営学', startYear: 2025, current: true },
      { school: '慶應義塾大学', degree: '学士', field: '商学', startYear: 2013, endYear: 2017 },
    ],
    workHistory: [
      { company: '総合商社（東京）', title: '海外営業', startYear: 2017, endYear: 2024 },
    ],
    avatar: '/experts/aya.jpg',
    meetingRoom: 'https://meet.google.com/aya-hbs-room',
    price30: 6000,
    price60: 12000,
    desc30:
      '出願校選び・スケジュール・スコアメイクなど、いま詰まっているポイントを30分で整理します。',
    desc60:
      'エッセイのドラフトか骨子を事前に共有いただき、構成と「刺さる軸」を一緒に作り直します。',
  },
  {
    key: 'kentaro',
    displayName: '伊藤 蓮',
    citySlug: 'nyc',
    cityJa: 'ニューヨーク',
    country: 'US',
    arrivalYear: 2024,
    occupation: '大学院留学中（コロンビア大学 コンピュータサイエンス修士）',
    bio: '2023年出願でコロンビア大学と Georgia Tech に合格し、2024年からコロンビア大学の CS 修士に在学中。日本の事業会社エンジニアからの私費留学です。SoP・推薦状・職務経歴の見せ方など、社会人からの米大学院出願を実体験で話せます。',
    offerings: [
      '米大学院（CS系）の出願校リストづくり',
      'SoP（志望理由書）の構成と差別化',
      '社会人経験の見せ方・推薦状の依頼',
      'TOEFL / GRE のスコア戦略',
      'ニューヨークの家探しと生活費のリアル',
    ],
    languages: [
      { code: 'ja', level: 'native' },
      { code: 'en', level: 'business' },
    ],
    languageLabels: ['日本語', '英語'],
    topics: ['grad_school', 'majors_labs'],
    title30: '米大学院出願の作戦会議（30分）',
    title60: 'SoP・研究計画の壁打ち（60分）',
    education: [
      { school: 'コロンビア大学', degree: '修士', field: 'コンピュータサイエンス', startYear: 2024, current: true },
      { school: '東京工業大学', degree: '学士', field: '情報工学', startYear: 2015, endYear: 2019 },
    ],
    workHistory: [
      { company: '事業会社（東京）', title: 'ソフトウェアエンジニア', startYear: 2019, endYear: 2024 },
    ],
    avatar: '/experts/kentaro.jpg',
    meetingRoom: 'https://meet.google.com/ren-cu-room',
    price30: 5000,
    price60: 9000,
    desc30:
      '出願校の選び方・スコア計画・スケジュールなど、社会人からの米大学院出願の疑問を30分で。',
    desc60:
      'SoP や研究計画のドラフトを事前共有いただき、審査側に伝わる構成へ一緒に組み直します。',
  },
  {
    key: 'misaki',
    displayName: '千葉 美月',
    citySlug: 'london',
    cityJa: 'ロンドン',
    country: 'GB',
    arrivalYear: 2024,
    occupation: '大学院留学中（LSE 公共政策修士）',
    bio: '2023年出願で LSE と UCL に合格し、2024年から LSE の公共政策修士（MPP）に在学中。官庁勤務からの私費+奨学金留学です。英国式の出願プロセスと、奨学金エッセイ・パーソナルステートメントの両立に詳しいです。',
    offerings: [
      '英大学院の出願プロセスと出願校リストづくり',
      'チーヴニング等・奨学金エッセイの書き方',
      'パーソナルステートメントの構成レビュー',
      'IELTS のスコア計画',
      'ロンドンでの生活立ち上げ・学生寮事情',
    ],
    languages: [
      { code: 'ja', level: 'native' },
      { code: 'en', level: 'business' },
    ],
    languageLabels: ['日本語', '英語'],
    topics: ['grad_school', 'funding'],
    title30: '英大学院出願の作戦会議（30分）',
    title60: '出願書類と奨学金の段取り整理（60分）',
    education: [
      { school: 'LSE（ロンドン・スクール・オブ・エコノミクス）', degree: '修士', field: '公共政策', startYear: 2024, current: true },
      { school: '東京大学', degree: '学士', field: '法学', startYear: 2012, endYear: 2016 },
    ],
    workHistory: [
      { company: '中央官庁（東京）', title: '総合職', startYear: 2016, endYear: 2024 },
    ],
    avatar: '/experts/misaki.jpg',
    meetingRoom: 'https://meet.google.com/mizuki-lse-room',
    price30: 4500,
    price60: 8500,
    desc30:
      '英国大学院の出願・奨学金など、いま気になっているポイントを30分で整理します。',
    desc60:
      '出願書類と奨学金エッセイの段取りを時系列で一緒に設計。ドラフトがあればレビューします。',
  },
  {
    key: 'chinatsu',
    displayName: '三宅 楓',
    citySlug: 'paris',
    cityJa: 'パリ',
    country: 'FR',
    arrivalYear: 2019,
    occupation: '大学院アルムナイ（シアンスポ修了）・現地企業勤務',
    bio: '2019年に渡仏し、2021年にシアンスポ（パリ政治学院）の国際関係修士を修了。現在はパリの国際機関系企業で働いています。英語プログラムでの出願、面接、フランス特有の書類まわりのコツを、アルムナイの立場から話せます。',
    offerings: [
      '仏大学院（英語プログラム）の出願プロセス',
      'CV・motivation letter の書き方',
      '面接対策（英語・想定問答づくり）',
      '修了後の現地就職のリアル',
      'パリでの学生生活・住まい事情',
    ],
    languages: [
      { code: 'ja', level: 'native' },
      { code: 'fr', level: 'business' },
      { code: 'en', level: 'business' },
    ],
    languageLabels: ['日本語', 'フランス語', '英語'],
    topics: ['grad_school', 'interview'],
    title30: '仏大学院（英語プログラム）出願相談（30分）',
    title60: '面接対策の模擬セッション（60分）',
    education: [
      { school: 'シアンスポ（パリ政治学院）', degree: '修士', field: '国際関係', startYear: 2019, endYear: 2021 },
      { school: '上智大学', degree: '学士', field: '外国語学部', startYear: 2013, endYear: 2017 },
    ],
    workHistory: [
      { company: 'パリの国際機関系企業', title: 'プログラムオフィサー', startYear: 2021, current: true },
    ],
    avatar: '/experts/chinatsu.jpg',
    price30: 4000,
    price60: 8000,
    desc30:
      '英語プログラムでの仏大学院出願について、出願校選びから書類まで30分で相談できます。',
    desc60:
      '本番形式の模擬面接+フィードバック。想定問答を事前に共有いただくとさらに濃くなります。',
  },
  // ---- 博士（1名） ----
  {
    key: 'daisuke',
    displayName: '森 悠斗',
    citySlug: 'berlin',
    cityJa: 'ベルリン',
    country: 'DE',
    arrivalYear: 2022,
    occupation: '博士課程在学中（ベルリン工科大学 機械学習）',
    bio: '2021年に出願し、2022年からベルリン工科大学の博士課程（機械学習）に在学中。日本で修士まで出てからの欧州 PhD です。研究室とのコンタクトの取り方、研究計画書、給与付きポジションの探し方まで、欧州博士留学の実務を話せます。',
    offerings: [
      '研究室選びと教授への最初のコンタクトの取り方',
      '研究計画書（Research Proposal）の構成レビュー',
      '欧州の給与付き PhD ポジションの探し方',
      '奨学金（DAAD 等）と資金計画',
      'ベルリンでの研究生活・住まい事情',
    ],
    languages: [
      { code: 'ja', level: 'native' },
      { code: 'en', level: 'business' },
      { code: 'de', level: 'conversation' },
    ],
    languageLabels: ['日本語', '英語', 'ドイツ語'],
    topics: ['grad_school', 'majors_labs', 'funding'],
    title30: '博士留学・研究室選び相談（30分）',
    title60: '研究計画書の壁打ち（60分）',
    education: [
      { school: 'ベルリン工科大学', degree: '博士課程', field: '機械学習', startYear: 2022, current: true },
      { school: '東北大学', degree: '修士', field: '情報科学', startYear: 2019, endYear: 2021 },
      { school: '東北大学', degree: '学士', field: '工学', startYear: 2015, endYear: 2019 },
    ],
    workHistory: [
      { company: '研究所（東京）', title: 'リサーチアシスタント', startYear: 2021, endYear: 2022 },
    ],
    avatar: '/experts/daisuke.jpg',
    price30: 4500,
    price60: 8500,
    desc30:
      '研究室の探し方・教授コンタクト・ポジションの種類など、博士留学の入口の疑問を30分で。',
    desc60:
      '研究計画書のドラフトを事前共有いただき、審査に耐える構成へ一緒にブラッシュアップします。',
  },
  // ---- 学部（2名） ----
  {
    key: 'eri',
    displayName: '岡部 咲',
    citySlug: 'vancouver',
    cityJa: 'バンクーバー',
    country: 'CA',
    arrivalYear: 2023,
    occupation: '学部留学中（ブリティッシュコロンビア大学）',
    bio: '2022年出願で UBC とトロント大学に合格し、2023年からブリティッシュコロンビア大学（UBC）の学部に在学中。日本の高校からの直接出願です。英語スコアと課外活動の見せ方、寮とホームステイのリアルを、いままさに現地から話せます。',
    offerings: [
      'カナダ学部出願のスケジュールと必要書類',
      '英語スコア（IELTS/TOEFL）の計画づくり',
      '課外活動・自己アピールの見せ方',
      '寮・ホームステイの選び方と実際',
      'キャンパス生活と1年目の授業のリアル',
    ],
    languages: [
      { code: 'ja', level: 'native' },
      { code: 'en', level: 'business' },
    ],
    languageLabels: ['日本語', '英語'],
    topics: ['undergrad', 'campus_life'],
    title30: 'カナダ学部出願の作戦会議（30分）',
    title60: '出願からキャンパス生活まで相談（60分）',
    education: [
      { school: 'ブリティッシュコロンビア大学', degree: '学士課程', field: '経済学', startYear: 2023, current: true },
    ],
    workHistory: [],
    avatar: '/experts/eri.jpg',
    price30: 3500,
    price60: 6500,
    desc30:
      '高校からの直接出願・英語スコア・出願書類など、カナダ学部留学の疑問を30分で。',
    desc60:
      '出願準備から渡航後の生活まで、時系列のやることリストを一緒に作ります。',
  },
  {
    key: 'mayu',
    displayName: '児玉 真央',
    citySlug: 'nyc',
    cityJa: 'ニューヨーク',
    country: 'US',
    arrivalYear: 2019,
    occupation: '学部アルムナイ（ニューヨーク大学卒）・現地企業勤務',
    bio: '2019年にニューヨーク大学（NYU）へ学部進学し、2023年に卒業。現在は NY のマーケティング企業で働いています。Common App のエッセイ、Financial Aid の申請、日本の高校からの直接出願を、経験者として一通り話せます。',
    offerings: [
      '米学部出願（Common App）の全体像と段取り',
      '出願エッセイのテーマ選びと構成レビュー',
      'Financial Aid・奨学金の申請の実際',
      'OPT・卒業後の現地就職のリアル',
      'ニューヨークの学生生活・家探し',
    ],
    languages: [
      { code: 'ja', level: 'native' },
      { code: 'en', level: 'business' },
    ],
    languageLabels: ['日本語', '英語'],
    topics: ['undergrad', 'application_docs'],
    title30: '米学部出願エッセイ相談（30分）',
    title60: '学部出願の全体設計（60分）',
    education: [
      { school: 'ニューヨーク大学', degree: '学士', field: 'マーケティング', startYear: 2019, endYear: 2023 },
    ],
    workHistory: [
      { company: 'NYのマーケティング企業', title: 'アナリスト', startYear: 2023, current: true },
    ],
    avatar: '/experts/mayu.jpg',
    price30: 3500,
    price60: 6500,
    desc30:
      'Common App エッセイのテーマ選び・書き出しの悩みを30分で壁打ちします。',
    desc60:
      '出願校リスト・エッセイ・Financial Aid まで、米学部出願の全体を時系列で設計します。',
  },
  // ---- 語学・交換留学（1名） ----
  {
    key: 'haruka',
    displayName: '南 陽菜',
    citySlug: 'melbourne',
    cityJa: 'メルボルン',
    country: 'AU',
    arrivalYear: 2023,
    occupation: '交換留学アルムナイ（メルボルン大学）・現地企業勤務',
    bio: '2023年にメルボルン大学へ交換留学し、そのまま現地企業に就職して滞在中。交換留学の学内選考、語学学校の選び方、費用計画、シェアハウス探しなど、「はじめての留学」の段取りに伴走します。',
    offerings: [
      '交換留学の学内選考・応募書類の準備',
      '語学学校の選び方（値段と質の見極め）',
      '留学費用の現実的な計画づくり',
      'シェアハウスの探し方と契約トラブル回避',
      'メルボルンの学生生活・アルバイト事情',
    ],
    languages: [
      { code: 'ja', level: 'native' },
      { code: 'en', level: 'business' },
    ],
    languageLabels: ['日本語', '英語'],
    topics: ['language_exchange', 'campus_life'],
    title30: '語学・交換留学のはじめ方相談（30分）',
    title60: '交換留学1年のプラン設計（60分）',
    education: [
      { school: 'メルボルン大学（交換留学）', degree: null, field: '国際関係', startYear: 2023, endYear: 2023 },
      { school: '明治大学', degree: '学士', field: '国際日本学', startYear: 2020, endYear: 2024 },
    ],
    workHistory: [
      { company: 'メルボルンの人材系企業', title: 'コーディネーター', startYear: 2024, current: true },
    ],
    avatar: '/experts/haruka.jpg',
    price30: 3000,
    price60: 5500,
    desc30:
      '語学留学・交換留学の準備で気になっていることを、経験者に30分で聞けます。',
    desc60:
      '学内選考から渡航後の生活まで、交換留学1年のロードマップを一緒に作ります。',
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
    // 実写アバター（デモ用プレースホルダ。public/experts/ 配置済み）
    avatarUrl: e.avatar,
    // 固定の相談室 URL（0082。承諾時に自動共有されるデモを見せる）
    meetingRoomUrl: e.meetingRoom ?? null,
    bio: e.bio,
    role: 'resident_writer',
    residencyCountry: e.country,
    residencyCity: e.cityJa,
    arrivalYear: e.arrivalYear,
    occupation: e.occupation,
    offerings: e.offerings,
    languages: e.languages,
    education: e.education,
    workHistory: e.workHistory,
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
        education: sql`excluded.education`,
        workHistory: sql`excluded.work_history`,
        timezone: sql`excluded.timezone`,
        meetingRoomUrl: sql`excluded.meeting_room_url`,
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
  // id は旧シードの stable id を継承して上書き（記事の中身は留学テーマに刷新）
  console.log('[seed-experts] articles (blog repositioning samples) ...');
  const articleRows: NewArticle[] = [
    {
      id: stableUuid('expert-art:aya-guarantor'),
      writerId: expertUuid('aya'),
      cityId: cityIdBySlug['boston']!,
      title: 'MBAエッセイ、日本人がいちばん最初につまずく3つの罠',
      body:
        'MBA出願のエッセイで、日本人受験者が最初につまずくポイントはだいたい共通しています。私自身が2024年の出願でハマりかけ、合格者仲間と答え合わせをして見えてきた「3つの罠」を書きます。\n\n1つ目は「実績の列挙」。日本の職務経歴書の感覚でプロジェクトを並べると、審査側には何も残りません。エッセイで見られているのは実績の大きさではなく、意思決定の理由と、そこからの変化です。\n\n2つ目は「謙遜」。文化的にどうしても「チームのおかげ」と書きたくなりますが、adcom が知りたいのはあなた個人が何を判断し、何を動かしたか。主語を I に戻す作業が最初のドラフトの半分を占めました。\n\n3つ目は「Why this school の浅さ」。ランキングやブランドではなく、その学校の具体的な授業・クラブ・プログラムと自分のゴールを接続できているか。ここは在校生に聞くのが一番早いです。\n\n自分の職歴でどう書くべきかは人によって全く違います。ドラフト前の構成段階で一度壁打ちするのがおすすめです。',
      coverImageUrl: null,
      priceJpy: 0,
      status: 'published' as const,
      tags: ['MBA', 'エッセイ', '出願'],
      durationType: 'other' as const,
      articleType: 'expat_info' as const,
      publishedAt: new Date('2026-07-14T09:00:00Z'),
      isSample: true,
    },
    {
      id: stableUuid('expert-art:aya-first-month'),
      writerId: expertUuid('kentaro'),
      cityId: cityIdBySlug['nyc']!,
      title: '米大学院のSoP、「研究がしたい」だけでは落ちる — 社会人出願の書き方',
      body:
        '社会人から米大学院（CS系）に出願するとき、SoP（Statement of Purpose）で一番やりがちな失敗は「学び直したい気持ち」を書いてしまうことです。私も最初のドラフトはそうでした。\n\nSoPは志望動機の作文ではなく、「この人は入学後に成果を出せるか」を判断させる証拠書類です。審査側が知りたいのは、(1) どの分野の何に取り組みたいか、(2) そのための準備（職務経験・スキル・成果物）がどこまであるか、(3) なぜこのプログラムでなければならないか、の3点だけ。\n\n社会人の強みは (2) を実務で語れることです。私の場合、業務で作った推薦システムの改善プロジェクトを「研究的な問い」に翻訳し直すことで、職務経歴がそのまま研究準備の証拠になりました。\n\n逆に、仕事の実績をそのまま並べるだけだと「で、研究では何を？」で終わります。実務→研究の翻訳が、社会人SoPの核心です。\n\nあなたの職務経歴をどう翻訳できるかは、30分話せばだいたい方向が出ます。ドラフトを書き始める前にどうぞ。',
      coverImageUrl: null,
      priceJpy: 0,
      status: 'published' as const,
      tags: ['大学院', 'SoP', '出願'],
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
        writerId: sql`excluded.writer_id`,
        cityId: sql`excluded.city_id`,
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
      tags: ['consultation', ...e.topics],
      durationLabel: '30分',
      durationMinutes: 30,
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
      tags: ['consultation', ...e.topics],
      durationLabel: '60分',
      durationMinutes: 60,
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
        durationMinutes: sql`excluded.duration_minutes`,
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
  // 再実行では日付が前進するため、id は同じでも start_at が入れ替わり、
  // 多行 upsert の途中で UNIQUE(user_id, start_at) と衝突しうる
  // （旧 wi0week1 の枠に新 wi0week0 が重なる等）。サンプルの空き枠は
  // 予約から FK 参照されないので、いったん消してから入れ直すのが安全。
  await db.delete(expertAvailability).where(
    inArray(
      expertAvailability.userId,
      EXPERTS.map((e) => expertUuid(e.key)),
    ),
  );
  await db
    .insert(expertAvailability)
    .values(availRows)
    .onConflictDoNothing();

  // ---- consultation_bookings（requested 状態のサンプル 1 件） --------------
  // is_sample ユーザー間: 伊藤（NYC）→ 高村（ボストン・MBA）の 30 分相談。
  // 高村の最初の空き枠冒頭 30 分をリクエスト中にして、受信箱 UI を確認できるようにする。
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
      '来年秋入学でMBA出願を予定しています。出願校の絞り込みとエッセイの方向性を30分で壁打ちさせてください。',
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
