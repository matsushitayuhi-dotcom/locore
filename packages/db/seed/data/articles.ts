import type { NewArticle, NewSpot } from '../../src/schema';
import { SEED_USER_IDS } from './users';

/**
 * シード用記事 5本（パリ、Phase 1 のコア）。
 * 残り 20本は Phase 1B で apps/web の mock からインポート予定。
 */

export const SEED_ARTICLE_IDS = {
  marais_morning: '01000000-0000-0000-0000-000000000001',
  belleville_market: '01000000-0000-0000-0000-000000000002',
  quartier_bakeries: '01000000-0000-0000-0000-000000000003',
  montmartre_night: '01000000-0000-0000-0000-000000000004',
  hidden_museums: '01000000-0000-0000-0000-000000000005',
} as const;

/** city_id は seed 実行時に解決して差し替える。ここではプレースホルダ。 */
export const buildSeedArticles = (parisCityId: string): NewArticle[] => [
  {
    id: SEED_ARTICLE_IDS.marais_morning,
    writerId: SEED_USER_IDS.writerS,
    cityId: parisCityId,
    title: 'マレ地区で観光客が来ない、地元のおじさんが集う朝のビストロ3軒',
    body:
      'マレ地区の3区目から少し奥に入ったところに、地元のおじさんたちが朝7時から並ぶ古いビストロがあります。' +
      '観光客向けの「Le Marais」のメインストリートからわずか150mほど離れただけなのに、空気がまったく違う。\n\n' +
      'この記事では、私が10年以上通っている朝のビストロ3軒を、訪れる時間帯と頼むべきメニュー、' +
      'そして「ここでだけは英語を喋らないほうがいい」みたいな実用的な振る舞いまでお伝えします。',
    coverImageUrl: 'https://picsum.photos/seed/locore-art_001/960/640',
    priceJpy: 800,
    status: 'published',
    tags: ['朝食', 'ビストロ', '路地裏', '常連系'],
    durationType: 'half_day',
    articleType: 'spot_guide',
    publishedAt: new Date('2026-04-15T08:00:00Z'),
  },
  {
    id: SEED_ARTICLE_IDS.belleville_market,
    writerId: SEED_USER_IDS.writerA,
    cityId: parisCityId,
    title: '20区バルベス〜ベルヴィルの市場、日曜の朝の歩き方',
    body:
      '20区はパリの中でも観光地化されていない、移民文化が層になって積み上がった街。' +
      'バルベスからベルヴィルにかけての日曜朝は、北アフリカ、中国、ベトナム、ユダヤの食材が一気に集まる、' +
      'パリで一番おもしろい市場ゾーン。',
    coverImageUrl: 'https://picsum.photos/seed/locore-art_002/960/640',
    priceJpy: 1200,
    status: 'published',
    tags: ['市場', '朝食', '食べ歩き', 'ローカル'],
    durationType: 'half_day',
    articleType: 'itinerary',
    publishedAt: new Date('2026-04-10T09:00:00Z'),
  },
  {
    id: SEED_ARTICLE_IDS.quartier_bakeries,
    writerId: SEED_USER_IDS.writerB,
    cityId: parisCityId,
    title: '5区、地元の人が並ぶ古ブーランジェリー4軒',
    body:
      '5区のカルチエ・ラタンは観光客で混むけれど、住宅街に一歩入れば、地元のお年寄りが朝から並ぶ' +
      '古いブーランジェリーが何軒もあります。',
    coverImageUrl: 'https://picsum.photos/seed/locore-art_003/960/640',
    priceJpy: 600,
    status: 'published',
    tags: ['朝食', 'パン', '老舗'],
    durationType: 'few_hours',
    articleType: 'spot_guide',
    publishedAt: new Date('2026-03-30T07:00:00Z'),
  },
  {
    id: SEED_ARTICLE_IDS.montmartre_night,
    writerId: SEED_USER_IDS.writerS,
    cityId: parisCityId,
    title: 'モンマルトル、観光客が消えた21時以降の路地3本',
    body:
      '観光客がサクレ・クール広場から下山したあとのモンマルトルは、別の街になります。' +
      '地元のシャンソニエ、深夜の本屋、酔っぱらいの猫まで含めた夜散歩のコース。',
    coverImageUrl: 'https://picsum.photos/seed/locore-art_004/960/640',
    priceJpy: 900,
    status: 'published',
    tags: ['夜遊び', '路地裏', '雰囲気'],
    durationType: 'half_day',
    articleType: 'itinerary',
    publishedAt: new Date('2026-04-03T20:00:00Z'),
  },
  {
    id: SEED_ARTICLE_IDS.hidden_museums,
    writerId: SEED_USER_IDS.writerA,
    cityId: parisCityId,
    title: '無料で入れるパリの隠れ美術館5選（観光客がほとんど来ない）',
    body:
      'ルーブルやオルセーが混むときに行くべき、地元の人だけが知っている無料の市立美術館。' +
      'どれも丸一日いられる規模感で、パリ市民の文化への態度がよくわかります。',
    coverImageUrl: 'https://picsum.photos/seed/locore-art_005/960/640',
    priceJpy: 700,
    status: 'published',
    tags: ['美術館', '無料', 'カルチャー'],
    durationType: 'full_day',
    articleType: 'spot_guide',
    publishedAt: new Date('2026-03-25T10:00:00Z'),
  },
];

/**
 * スポット（各記事 3-5 個）。
 */
export const buildSeedSpots = (): NewSpot[] => {
  const spots: NewSpot[] = [];

  // art_001 マレ朝
  spots.push(
    {
      articleId: SEED_ARTICLE_IDS.marais_morning,
      name: 'Café des Anciens',
      address: 'Rue Vieille du Temple, 75003 Paris',
      location: { lat: 48.8593, lng: 2.3617 },
      category: 'food',
      priceEstimate: '€3〜€8',
      openingHours: { mon: ['07:00-14:00'], note: '日曜休' },
      tags: ['朝食', '常連系'],
      position: 0,
    },
    {
      articleId: SEED_ARTICLE_IDS.marais_morning,
      name: 'Le Comptoir de Marie',
      address: 'Rue de Bretagne, 75003 Paris',
      location: { lat: 48.8625, lng: 2.3635 },
      category: 'food',
      priceEstimate: '€8〜€15',
      tags: ['朝食', 'ガレット'],
      position: 1,
    },
    {
      articleId: SEED_ARTICLE_IDS.marais_morning,
      name: 'Bar du Coin',
      address: 'Rue des Archives, 75003 Paris',
      location: { lat: 48.8608, lng: 2.359 },
      category: 'food',
      priceEstimate: '€3〜€10',
      tags: ['朝食', '常連系'],
      position: 2,
    },
  );

  // art_002 20区市場
  spots.push(
    {
      articleId: SEED_ARTICLE_IDS.belleville_market,
      name: 'Marché Barbès',
      address: 'Boulevard de la Chapelle, 75018 Paris',
      location: { lat: 48.8848, lng: 2.3493 },
      category: 'shopping',
      priceEstimate: '€5〜',
      tags: ['市場', '北アフリカ'],
      position: 0,
    },
    {
      articleId: SEED_ARTICLE_IDS.belleville_market,
      name: 'Marché de Belleville',
      address: 'Boulevard de Belleville, 75011 Paris',
      location: { lat: 48.8709, lng: 2.3771 },
      category: 'shopping',
      tags: ['市場', '生鮮'],
      position: 1,
    },
    {
      articleId: SEED_ARTICLE_IDS.belleville_market,
      name: 'Le Pho 14',
      address: 'Rue de Belleville, 75020 Paris',
      location: { lat: 48.872, lng: 2.3849 },
      category: 'food',
      priceEstimate: '€8〜€14',
      tags: ['アジアン'],
      position: 2,
    },
    {
      articleId: SEED_ARTICLE_IDS.belleville_market,
      name: 'Place des Fêtes Café',
      address: 'Place des Fêtes, 75019 Paris',
      location: { lat: 48.8769, lng: 2.3899 },
      category: 'food',
      priceEstimate: '€3〜€6',
      tags: ['カフェ'],
      position: 3,
    },
  );

  // art_003 5区パン
  spots.push(
    {
      articleId: SEED_ARTICLE_IDS.quartier_bakeries,
      name: 'Boulangerie Mauvieux',
      address: 'Rue Mouffetard, 75005 Paris',
      location: { lat: 48.8424, lng: 2.3503 },
      category: 'food',
      priceEstimate: '€1〜€5',
      tags: ['パン', '老舗'],
      position: 0,
    },
    {
      articleId: SEED_ARTICLE_IDS.quartier_bakeries,
      name: 'Aux Pains de Mathilde',
      address: 'Rue Monge, 75005 Paris',
      location: { lat: 48.846, lng: 2.353 },
      category: 'food',
      tags: ['パン'],
      position: 1,
    },
    {
      articleId: SEED_ARTICLE_IDS.quartier_bakeries,
      name: 'Le Fournil de Jean',
      address: 'Rue Saint-Jacques, 75005 Paris',
      location: { lat: 48.848, lng: 2.3458 },
      category: 'food',
      tags: ['パン', '老舗'],
      position: 2,
    },
    {
      articleId: SEED_ARTICLE_IDS.quartier_bakeries,
      name: 'La Petite Boulangerie',
      address: 'Rue de la Montagne Sainte-Geneviève, 75005 Paris',
      location: { lat: 48.847, lng: 2.348 },
      category: 'food',
      tags: ['パン'],
      position: 3,
    },
  );

  // art_004 モンマルトル夜
  spots.push(
    {
      articleId: SEED_ARTICLE_IDS.montmartre_night,
      name: 'Au Lapin Agile',
      address: 'Rue des Saules, 75018 Paris',
      location: { lat: 48.8884, lng: 2.3401 },
      category: 'sight',
      priceEstimate: '€20〜',
      tags: ['夜', '音楽'],
      position: 0,
    },
    {
      articleId: SEED_ARTICLE_IDS.montmartre_night,
      name: 'Librairie de Nuit',
      address: 'Rue des Abbesses, 75018 Paris',
      location: { lat: 48.8842, lng: 2.3373 },
      category: 'shopping',
      tags: ['本', '夜'],
      position: 1,
    },
    {
      articleId: SEED_ARTICLE_IDS.montmartre_night,
      name: 'Le Tire-Bouchon',
      address: 'Rue Norvins, 75018 Paris',
      location: { lat: 48.8865, lng: 2.3402 },
      category: 'food',
      priceEstimate: '€8〜€20',
      tags: ['夜', 'ワイン'],
      position: 2,
    },
  );

  // art_005 隠れ美術館
  spots.push(
    {
      articleId: SEED_ARTICLE_IDS.hidden_museums,
      name: 'Musée Cognacq-Jay',
      address: '8 Rue Elzévir, 75003 Paris',
      location: { lat: 48.8587, lng: 2.3624 },
      category: 'sight',
      priceEstimate: '無料',
      tags: ['アート', '無料'],
      position: 0,
    },
    {
      articleId: SEED_ARTICLE_IDS.hidden_museums,
      name: 'Musée Nissim de Camondo',
      address: '63 Rue de Monceau, 75008 Paris',
      location: { lat: 48.8783, lng: 2.3094 },
      category: 'sight',
      priceEstimate: '€12',
      tags: ['アート'],
      position: 1,
    },
    {
      articleId: SEED_ARTICLE_IDS.hidden_museums,
      name: 'Maison de Balzac',
      address: '47 Rue Raynouard, 75016 Paris',
      location: { lat: 48.8557, lng: 2.2772 },
      category: 'sight',
      priceEstimate: '無料',
      tags: ['文学', '無料'],
      position: 2,
    },
    {
      articleId: SEED_ARTICLE_IDS.hidden_museums,
      name: 'Musée Bourdelle',
      address: '18 Rue Antoine Bourdelle, 75015 Paris',
      location: { lat: 48.843, lng: 2.3179 },
      category: 'sight',
      priceEstimate: '無料',
      tags: ['アート', '彫刻'],
      position: 3,
    },
    {
      articleId: SEED_ARTICLE_IDS.hidden_museums,
      name: 'Musée Zadkine',
      address: '100 bis Rue d\'Assas, 75006 Paris',
      location: { lat: 48.8433, lng: 2.3338 },
      category: 'sight',
      priceEstimate: '無料',
      tags: ['アート'],
      position: 4,
    },
  );

  return spots;
};
