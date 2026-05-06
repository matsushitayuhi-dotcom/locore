import type { Collection } from './types';

export const collections: Collection[] = [
  {
    id: 'col_paris_spring_2026',
    title: '春のパリ：花見スポットと、その近くの本物のビストロ20選',
    subtitle: '4月〜5月のパリを、観光地の桜並木以外で楽しむ',
    intro:
      '4月のパリは桜だけではなく、マロニエ、リラ、藤、と花の入れ替わる季節。地元の書き手たちが、観光地のリストにはない「春に通いたい店」と「人がいない花見の場所」を組み合わせて編みました。',
    coverImageUrl: 'https://picsum.photos/seed/locore-collection-spring/1280/720',
    curatorName: 'Locore 編集部',
    curatorRole: '特集編集',
    articleIds: ['art_001', 'art_002', 'art_011', 'art_013', 'art_006', 'art_022'],
    publishedAt: '2026-04-01T10:00:00Z',
  },
  {
    id: 'col_paris_rainy',
    title: '雨のパリで、外せない屋内12箇所',
    subtitle: '雨だからこそ、街の本気が見える',
    intro:
      'パリは年間100日以上雨が降る街。観光客が困っている瞬間こそ、現地民が普段使う場所が輝きます。屋内で半日〜1日過ごせるコースを、書き手3人の視点で編集しました。',
    coverImageUrl: 'https://picsum.photos/seed/locore-collection-rainy/1280/720',
    curatorName: '中野 マリエ',
    curatorRole: 'ゲストキュレーター',
    articleIds: ['art_005', 'art_008', 'art_022', 'art_014', 'art_021'],
    publishedAt: '2026-03-25T10:00:00Z',
  },
  {
    id: 'col_paris_first_time',
    title: 'パリ初めて、でも観光地はもう要らない人へ',
    subtitle: '初訪問だけど「観光客に見えたくない」人のための1冊',
    intro:
      'ルーヴル、エッフェル塔、シャンゼリゼ。それは全部「行くべき」かもしれない。でも、本当に街の輪郭をつかむには、住んでいる人が朝歩く道を、半日でいいから歩いてほしい。',
    coverImageUrl: 'https://picsum.photos/seed/locore-collection-firsttime/1280/720',
    curatorName: '佐々木 純子',
    curatorRole: 'ゲストキュレーター',
    articleIds: ['art_025', 'art_006', 'art_017', 'art_019', 'art_009', 'art_022'],
    publishedAt: '2026-03-18T10:00:00Z',
  },
];

export const getCollection = (id: string): Collection | undefined =>
  collections.find((c) => c.id === id);
