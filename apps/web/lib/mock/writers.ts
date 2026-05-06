import type { Writer } from './types';

const dicebear = (seed: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=eae5dd,f4f1eb,fbf1ec,eef2ea&fontFamily=serif`;

export const writers: Writer[] = [
  {
    id: 'wr_junko',
    name: '佐々木 純子',
    city: 'パリ',
    cityId: 'paris',
    tier: 'S',
    residencyYears: 12,
    bio:
      'パリ12年目。マレ地区の小さなアパルトマンに暮らしながら、街の路地裏を歩き続けています。地元のおじさんおばさんが通う店ばかり書きます。',
    avatarUrl: dicebear('Junko Sasaki'),
    isFounding: true,
    isVerifiedCreator: true,
    social: {
      instagram: 'https://instagram.com/locore_junko',
      tiktok: 'https://tiktok.com/@locore_junko',
      x: 'https://x.com/locore_junko',
    },
    followerCount: 12480,
  },
  {
    id: 'wr_yuto',
    name: '高橋 悠斗',
    city: 'パリ',
    cityId: 'paris',
    tier: 'S',
    residencyYears: 9,
    bio:
      '料理人として渡仏、現在はパリ20区在住。ビストロやワインバー、ナチュラルワインを軸に書いています。',
    avatarUrl: dicebear('Yuto Takahashi'),
    isFounding: true,
    isVerifiedCreator: true,
    social: {
      instagram: 'https://instagram.com/locore_yuto',
      youtube: 'https://youtube.com/@locore_yuto',
    },
    followerCount: 8930,
  },
  {
    id: 'wr_marie',
    name: '中野 マリエ',
    city: 'パリ',
    cityId: 'paris',
    tier: 'A',
    residencyYears: 6,
    bio:
      'モンマルトル在住、画廊勤務。アートとカフェ、本屋について書いています。雨の日のパリが一番好きです。',
    avatarUrl: dicebear('Marie Nakano'),
    isFounding: false,
    isVerifiedCreator: true,
    social: {
      instagram: 'https://instagram.com/locore_marie',
    },
    followerCount: 5210,
  },
  {
    id: 'wr_haruka',
    name: '森 はるか',
    city: 'パリ',
    cityId: 'paris',
    tier: 'A',
    residencyYears: 5,
    bio:
      'パリ5区、植物と古道具が好きな会社員。週末の市場めぐり、雑貨屋通いが趣味。',
    avatarUrl: dicebear('Haruka Mori'),
    isFounding: false,
    isVerifiedCreator: false,
    social: {
      instagram: 'https://instagram.com/locore_haruka',
    },
    followerCount: 2840,
  },
  {
    id: 'wr_ken',
    name: '岡田 健',
    city: 'パリ',
    cityId: 'paris',
    tier: 'B',
    residencyYears: 2,
    bio:
      'エンジニアとしてパリ駐在中。ナイトライフ、夜遊び、深夜営業のビストロを開拓しています。',
    avatarUrl: dicebear('Ken Okada'),
    isFounding: false,
    isVerifiedCreator: false,
    social: {
      x: 'https://x.com/locore_ken',
    },
    followerCount: 980,
  },
  {
    id: 'wr_ayako',
    name: '清水 綾子',
    city: 'パリ',
    cityId: 'paris',
    tier: 'S',
    residencyYears: 15,
    bio:
      '15年目のパリ。3区に小さな菓子工房。古いブーランジェリー、菓子屋の話を中心に、家族で行ける店を紹介します。',
    avatarUrl: dicebear('Ayako Shimizu'),
    isFounding: true,
    isVerifiedCreator: true,
    social: {
      instagram: 'https://instagram.com/locore_ayako',
      youtube: 'https://youtube.com/@locore_ayako',
    },
    followerCount: 18760,
  },
  {
    id: 'wr_takeshi',
    name: '伊藤 武史',
    city: 'パリ',
    cityId: 'paris',
    tier: 'B',
    residencyYears: 1,
    bio:
      'パリ移住1年目、6区在住。新参者ならではの目線で、観光客と現地の境目を歩いています。',
    avatarUrl: dicebear('Takeshi Ito'),
    isFounding: false,
    isVerifiedCreator: false,
    social: {},
    followerCount: 320,
  },
  {
    id: 'wr_emi',
    name: '横山 恵美',
    city: 'パリ',
    cityId: 'paris',
    tier: 'A',
    residencyYears: 7,
    bio:
      'パリ11区、子育てしながらの暮らし。子連れで行ける場所、朝の散歩、ファミリービストロを書いています。',
    avatarUrl: dicebear('Emi Yokoyama'),
    isFounding: false,
    isVerifiedCreator: true,
    social: {
      instagram: 'https://instagram.com/locore_emi',
      tiktok: 'https://tiktok.com/@locore_emi',
    },
    followerCount: 6420,
  },
];

export const getWriter = (id: string): Writer | undefined =>
  writers.find((w) => w.id === id);
