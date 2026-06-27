import { CommunityCountryPicker } from '@/components/community/CommunityCountryPicker';

export const revalidate = 3600;

export const metadata = {
  title: 'コミュニティ — Locore',
  description:
    '訪れる国を選んで、現地に暮らす日本人のコミュニティに飛び込もう。求人・住居・売買・集まり・習い事・助け合い。',
};

/**
 * /community — 「訪れる国を選ぶ」入口。
 * 国を選ぶと、その国のコミュニティ（当面は /france）へ遷移する。
 * カテゴリ掲示板（求人・住居 …）は各国ページ／グローバル一覧側に集約。
 */
export default function CommunityPage() {
  return <CommunityCountryPicker />;
}
