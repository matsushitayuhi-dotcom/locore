/**
 * モック AI モデレーション。
 *
 * Phase 1A 後半で Anthropic API ベースの本実装に差し替える前提で、
 * 投稿フローで warned/held を UI 確認できるようにする簡易ヒューリスティック。
 *
 * - 「映え」「絶景」などのバズワードと観光名所固有名詞をカウント
 * - tags に「映え」「インスタ」を含むと加点
 * - 最終スコア >= 85: held（編集者ホールド）
 *                  70: warned（警告のみ、公開は通る）
 *                  それ未満: pass
 */

export type ModerationAction = 'pass' | 'warned' | 'held';

export type MockModerationResult = {
  touristScore: number;
  visualScore: number;
  textScore: number;
  finalScore: number;
  action: ModerationAction;
  breakdown: {
    buzzCount: number;
    landmarkCount: number;
    photogenicTags: number;
  };
};

const BUZZWORDS = ['最高', '絶景', '映え', '死ぬ前', '神', 'ヤバ', 'バズ'];
const LANDMARKS = [
  'エッフェル塔',
  'ルーブル',
  '凱旋門',
  'モンマルトルの丘',
  'シャンゼリゼ',
  'ノートルダム',
  'オペラ座',
  'サクレクール',
];
const PHOTOGENIC_TAGS = ['映え', 'インスタ', 'インスタ映え', 'photogenic'];

function countOccurrences(text: string, needle: string): number {
  if (!needle) return 0;
  return text.split(needle).length - 1;
}

export function runMockModeration(article: {
  title: string;
  body: string;
  tags: string[];
}): MockModerationResult {
  const text = `${article.title}\n${article.body}`;
  const tagsLower = article.tags.map((t) => t.toLowerCase());

  const buzzCount = BUZZWORDS.reduce((acc, w) => acc + countOccurrences(text, w), 0);
  const landmarkCount = LANDMARKS.reduce(
    (acc, w) => acc + countOccurrences(text, w),
    0,
  );
  const photogenicTags = PHOTOGENIC_TAGS.reduce(
    (acc, w) => acc + (tagsLower.includes(w.toLowerCase()) ? 1 : 0),
    0,
  );

  const textScore = Math.min(100, buzzCount * 8 + photogenicTags * 20);
  const touristScore = Math.min(100, landmarkCount * 18);
  const visualScore = 30; // 画像未統合のためベースライン固定

  const finalScore = Math.round(
    0.4 * touristScore + 0.35 * visualScore + 0.25 * textScore,
  );

  const action: ModerationAction =
    finalScore >= 85 ? 'held' : finalScore >= 70 ? 'warned' : 'pass';

  return {
    touristScore,
    visualScore,
    textScore,
    finalScore,
    action,
    breakdown: { buzzCount, landmarkCount, photogenicTags },
  };
}
