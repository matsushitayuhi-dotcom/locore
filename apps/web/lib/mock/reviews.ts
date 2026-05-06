import type { Review } from './types';

const sampleBodies = [
  '想像していたより遥かに地元の生活に近い記事だった。記事を片手に歩いていると、観光地で味わえなかったパリの空気が確かにある。',
  '紹介されているお店の3軒を回ったけど、どこも観光客がほとんどいなくて静か。価格もまっとうで、書き手の信頼性を感じた。',
  '半日コースとして紹介されている順番がよく考えられていて、移動も無駄がなかった。最後の店での余韻まで含めて完成度が高い。',
  '写真ではなく文章で街の温度を描こうとしているのが伝わる。読み物としても楽しめる。',
  '初めて来た区だったので少し緊張したけど、記事のおかげで「迷っていない感」を出して歩けた。地元の人と少し言葉を交わせた。',
  '値段以上の体験。観光ガイドにあるような名所を1個減らしてでも、こちらに時間を使う価値がある。',
];

const NAMES = ['Tomoko', 'Kenji', 'Aya', 'Shun', 'Mika', 'Hiroshi', 'Yui', 'Nao', 'Riko', 'Daichi'];
const INITIALS = ['T.', 'K.', 'S.', 'M.', 'H.'];
const TAG_A = ['ローカル感', '想像以上', '良い意味で地味'];
const TAG_B = ['書き手の信頼', '案内が丁寧', '価格以上'];

function makeReviews(
  articleId: string,
  count: number,
  baseLocal: number,
  baseSat: number,
): Review[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `rv_${articleId}_${i + 1}`,
    articleId,
    authorName: `${NAMES[i % NAMES.length]!} ${INITIALS[i % INITIALS.length]!}`,
    localScore: Math.max(0, Math.min(100, baseLocal + ((i * 7) % 17) - 8)),
    satisfaction: Math.max(
      3,
      Math.min(5, +(baseSat + ((i % 3) - 1) * 0.2).toFixed(1)),
    ),
    tags: [TAG_A[i % TAG_A.length]!, TAG_B[i % TAG_B.length]!],
    body: sampleBodies[i % sampleBodies.length]!,
    visitedAt: new Date(2026, 3, ((i * 13) % 28) + 1).toISOString(),
  }));
}

export const reviews: Review[] = [
  ...makeReviews('art_001', 8, 78, 4.7),
  ...makeReviews('art_002', 9, 88, 4.8),
  ...makeReviews('art_003', 7, 72, 4.6),
  ...makeReviews('art_004', 6, 81, 4.5),
  ...makeReviews('art_005', 10, 69, 4.9),
  ...makeReviews('art_006', 9, 64, 4.7),
  ...makeReviews('art_007', 5, 76, 4.6),
  ...makeReviews('art_008', 7, 58, 4.5),
  ...makeReviews('art_009', 4, 53, 4.8),
  ...makeReviews('art_010', 6, 84, 4.7),
  ...makeReviews('art_011', 10, 70, 4.9),
  ...makeReviews('art_012', 5, 67, 4.6),
  ...makeReviews('art_013', 4, 86, 4.5),
  ...makeReviews('art_014', 3, 75, 4.4),
  ...makeReviews('art_015', 8, 71, 4.7),
  ...makeReviews('art_016', 9, 60, 4.6),
  ...makeReviews('art_017', 5, 49, 4.5),
  ...makeReviews('art_018', 7, 89, 4.7),
  ...makeReviews('art_019', 6, 68, 4.6),
  ...makeReviews('art_020', 4, 72, 4.5),
  ...makeReviews('art_021', 3, 79, 4.4),
  ...makeReviews('art_022', 6, 56, 4.6),
  ...makeReviews('art_023', 4, 73, 4.5),
  ...makeReviews('art_024', 5, 62, 4.7),
  ...makeReviews('art_025', 8, 51, 4.5),
];

export const reviewsForArticle = (articleId: string): Review[] =>
  reviews.filter((r) => r.articleId === articleId);
