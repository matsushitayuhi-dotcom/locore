import type { LightDiary } from './types';

const dicebear = (seed: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=eef1f8,fbf1ec,eef2ea,faf1dd&fontFamily=serif`;

export const lightDiaries: LightDiary[] = [
  {
    id: 'ld_001',
    authorName: 'misa',
    avatarUrl: dicebear('misa'),
    title: 'パリ3日目、迷子になって辿り着いた本屋がよかった',
    body:
      '地図を信用しすぎて逆に迷い、運河沿いに出てしまった。そこで見つけた小さな本屋。フランス語は読めないけど、装丁を見ているだけで楽しかった。',
    cityId: 'paris',
    visitedAt: '2026-04-12',
    likes: 38,
  },
  {
    id: 'ld_002',
    authorName: 'tomohiro',
    avatarUrl: dicebear('tomohiro'),
    title: '20区のマルシェ、想像していた10倍カオスだった',
    body:
      '日曜の朝のベルヴィルへ。中華系・北アフリカ系の人達のリアルな台所。観光地のマルシェとは別の生き物。',
    cityId: 'paris',
    visitedAt: '2026-04-08',
    likes: 24,
  },
  {
    id: 'ld_003',
    authorName: 'ayaka',
    avatarUrl: dicebear('ayaka'),
    title: 'モンマルトルの坂の上、夕方のチーズ屋さんで',
    body:
      'チーズ屋のおじさんが「これ食べてみな」と切ってくれて、味の説明を身振りでしてくれた。フランス語のリスニングは半分も分からなかったけど、伝わるものはあった。',
    cityId: 'paris',
    visitedAt: '2026-04-05',
    likes: 56,
  },
  {
    id: 'ld_004',
    authorName: 'yusuke',
    avatarUrl: dicebear('yusuke'),
    title: '雨のパリ、結局カフェで4時間過ごしただけ',
    body:
      '何もしなかったけど、それでも良かった。本を読んで、コーヒーを4杯飲んで、雨の音を聴いて、ノートに何か書いて。',
    cityId: 'paris',
    visitedAt: '2026-04-02',
    likes: 71,
  },
  {
    id: 'ld_005',
    authorName: 'rina',
    avatarUrl: dicebear('rina'),
    title: 'パリ最終日、地元の人に教えてもらったブーランジェリー',
    body:
      'ホテルの朝食を抜け出して、近所のおばあさんが教えてくれたブーランジェリーへ。クロワッサンが本当に違った。家族のお土産用に12個買って帰った。',
    cityId: 'paris',
    visitedAt: '2026-03-30',
    likes: 42,
  },
];
