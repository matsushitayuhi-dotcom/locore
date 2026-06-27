/**
 * 旅程記事モックアップ共通の「エディタ・ブロックモデル」とサンプルデータ。
 *
 * 位置づけ: 投稿エディタは以下のブロックから本文を組み立てる前提。
 *   - 共通ブロック: 見出し / 本文 / 画像 / 引用 / 区切り / コールアウト（コツ・注意）
 *   - 旅程専用の構造化「スポット」ブロック:
 *       時刻・場所〔地図〕・写真・本文・費用・コツ をフィールドで持つ
 *
 * この1つのデータ（STOPS / TRIP）から、レイアウト違いの複数案
 * （/mockup/trip-article, -b マップ先行, -c エディトリアル）を出し分ける。
 * `place`（場所＝施設名＋緯度経度）はスポットブロックの1フィールドで、
 * ここから各スポットの「地図で見る」個別リンクと Route Map（全スポットを
 * 順に結ぶ埋め込み地図）を自動生成する。
 *
 * 本番では Google Maps は公式 Embed API（要APIキー: maps/embed/v1/...）に
 * 差し替え予定。モックでは APIキー不要の公開URLを使う。
 */

export type Place = { name: string; lat: number; lng: number };

export type Stop = {
  time: string;
  end?: string;
  name: string;
  cat: string;
  photo: string;
  body: string;
  cost?: string;
  tip?: string;
  place: Place; // 場所（地図フィールド）= 構造化スポットブロックの1フィールド
  next?: { mins: string; mode: 'walk' | 'metro' }; // 次のスポットまでの移動
};

export const HERO_PHOTO =
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1900&q=80';
export const AUTHOR_AVATAR =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80';

export const AUTHOR = {
  name: '中村 さくら',
  city: 'パリ',
  years: 10,
  role: 'フードライター',
  tier: '駐在員 S',
  bio: '2016年からパリ10区在住。地元の市場とビストロを巡るのがライフワーク。日本語メディアへの寄稿多数。「観光客の半歩内側」を案内するのが得意で、Locore では旅程プランと現地グルメの記事を中心に発信中。',
} as const;

export const TRIP = {
  city: 'パリ',
  cityEn: 'PARIS',
  publishedAt: '2026年5月18日',
  updatedAt: '2026年6月10日',
  hours: '13',
  budget: '110',
  walkKm: '6.5',
  spots: '7',
} as const;

export const STOPS: Stop[] = [
  {
    time: '08:00',
    end: '08:45',
    name: 'Du Pain et des Idées',
    cat: 'ブーランジュリー',
    photo:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1100&q=80',
    body: '10区の名店で朝食を。看板はエスカルゴ・ショコラ・ピスターシュ。バターの層が信じられないほど薄く、焼きたての香りだけで一日が始まる。観光客が並ぶ前の8時台が狙い目。テラスは無いので、運河沿いのベンチへ持ち出すのが地元流。',
    cost: '€4.20',
    tip: '日曜・月曜は定休。木曜の朝が一番空いている。',
    place: { name: 'Du Pain et des Idées, Paris', lat: 48.8693, lng: 2.3626 },
    next: { mins: '徒歩 6分', mode: 'walk' },
  },
  {
    time: '09:00',
    end: '10:00',
    name: 'Canal Saint-Martin の朝散歩',
    cat: '街歩き',
    photo:
      'https://images.unsplash.com/photo-1551634979-2b11f8c946fe?auto=format&fit=crop&w=1100&q=80',
    body: '跳ね橋とプラタナス並木の運河沿いを、北へゆっくり歩く。朝の斜光が水面に揺れて、まだ眠そうな街がだんだん動き出す時間帯。アンティーク雑貨の小店が開き始めるのもこの頃。買ったパンはここで。',
    tip: 'République 側より Jaurès 側のほうが人が少なく、写真が撮りやすい。',
    place: { name: 'Canal Saint-Martin, Paris', lat: 48.8709, lng: 2.3674 },
    next: { mins: 'メトロ 11分 (M5)', mode: 'metro' },
  },
  {
    time: '10:30',
    end: '12:30',
    name: "Musée de l'Orangerie",
    cat: '美術館',
    photo:
      'https://images.unsplash.com/photo-1545987796-200677ee1011?auto=format&fit=crop&w=1100&q=80',
    body: 'モネの《睡蓮》の大壁画を、楕円形の部屋で360度に浴びる。ルーヴルより遥かに小さく、人も少なく、1時間半で「絵に包まれる」体験ができる。地下のジュ・ド・ポーム側コレクションも侮れない。',
    cost: '€12.50',
    tip: '事前にオンラインで時間指定予約。木曜は夜21時まで開館。',
    place: { name: "Musée de l'Orangerie, Paris", lat: 48.8638, lng: 2.3226 },
    next: { mins: '徒歩 12分', mode: 'walk' },
  },
  {
    time: '13:00',
    end: '14:30',
    name: 'Bistrot Paul Bert',
    cat: 'ランチ・ビストロ',
    photo:
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1100&q=80',
    body: '黒板メニューのみの正統派ビストロ。名物のステーク・フリットと、世界一と評されるパリ・ブレスト。昼のプリフィクスはディナーの半額近く、これを目当てに通う在住者も多い。予約は必須。',
    cost: '€28（昼コース）',
    tip: '11区は昼でも予約が埋まる。前日までに電話を。',
    place: { name: 'Bistrot Paul Bert, Paris', lat: 48.8516, lng: 2.3853 },
    next: { mins: 'メトロ 16分 (M8→M1)', mode: 'metro' },
  },
  {
    time: '15:00',
    end: '17:00',
    name: 'Le Marais の路地裏さんぽ',
    cat: 'ショッピング・街歩き',
    photo:
      'https://images.unsplash.com/photo-1431274172761-fca41d930114?auto=format&fit=crop&w=1100&q=80',
    body: "石畳の細い通りに、独立系の古着店・香水店・ギャラリーがひしめく。ヴォージュ広場のアーケードで一息ついたら、ファラフェルの名店 L'As du Fallafel の行列を横目に。買い物より「迷う」のが正解の街。",
    tip: '日曜も多くの店が開いているのがマレの強み（パリでは貴重）。',
    place: { name: 'Place des Vosges, Le Marais, Paris', lat: 48.8554, lng: 2.3656 },
    next: { mins: '徒歩 9分 + メトロ 7分', mode: 'walk' },
  },
  {
    time: '17:30',
    end: '18:30',
    name: 'Shakespeare and Company で休憩',
    cat: '書店・カフェ',
    photo:
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1100&q=80',
    body: 'セーヌ左岸、ノートルダムを望む伝説の英語書店。隣のカフェで一杯。ヘミングウェイの時代から続く、旅人と本の交差点。夕方の光が棚に差し込む時間が一番うつくしい。',
    cost: '€5（カフェ）',
    place: { name: 'Shakespeare and Company, Paris', lat: 48.8525, lng: 2.3471 },
    next: { mins: '徒歩 4分', mode: 'walk' },
  },
  {
    time: '19:30',
    end: '21:30',
    name: 'Bateaux & 夜のセーヌ',
    cat: 'クルーズ・夜景',
    photo:
      'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1100&q=80',
    body: '一日の締めは川から。日没とともに橋がライトアップされ、エッフェル塔が毎正時に5分だけきらめく。デッキの一番後ろ、進行方向の右舷が穴場。冷えるので一枚羽織って。',
    cost: '€17',
    tip: '21時発の便なら、塔のシャンパンフラッシュを真正面で見られる。',
    place: { name: 'Bateaux Parisiens, Port de la Bourdonnais, Paris', lat: 48.8601, lng: 2.2936 },
  },
];

export const TIPS: [string, string][] = [
  ['Navigo Easy', 'カルネより使いやすい交通ICカード。1乗車€2.15、回数券扱いで割安。'],
  ['水筒を持参', '街中の「Wallace 噴水」で無料給水。夏は必携。'],
  ['予約は前日まで', '人気ビストロ・美術館は当日では入れないことが多い。'],
  ['16時の閉店', '日曜は商店が早く閉まる。買い物は午前中に。'],
];

export const RELATED = [
  {
    t: 'リヨンで過ごす美食の48時間 ― ブションと絹織物の街',
    cat: 'ITINERARY · LYON',
    img: 'https://images.unsplash.com/photo-1524396309943-e03f5249f002?auto=format&fit=crop&w=800&q=80',
  },
  {
    t: '南仏ニース、海と市場のスローな一日',
    cat: 'ITINERARY · NICE',
    img: 'https://images.unsplash.com/photo-1491166617655-0723a0999cfc?auto=format&fit=crop&w=800&q=80',
  },
  {
    t: 'パリで子連れでも疲れない、半日モデルコース',
    cat: 'ITINERARY · PARIS',
    img: 'https://images.unsplash.com/photo-1438786657495-640937046d18?auto=format&fit=crop&w=800&q=80',
  },
];

/* ===================== Google Maps 連携ヘルパ =====================
 * 本番では公式 Google Maps Embed API（要APIキー: maps/embed/v1/...）に
 * 差し替え予定。モックでは APIキー不要の公開URL/埋め込みを使う。 */

/** スポット個別の「地図で見る」リンク（lat,lng で確実にピン留め）。 */
export function placeMapUrl(p: Place): string {
  const q = `${p.lat},${p.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/**
 * Route Map 用の埋め込み iframe URL（APIキー不要）。
 * 全スポットを順に通る directions を生成する:
 *   始点 = 最初のスポット, 終点 = 最後, 中間は " to:" で経由地として連結。
 * maps.google.com の saddr/daddr + output=embed 形式はキー不要で動作する。
 */
export function routeEmbedUrl(stops: Stop[]): string {
  const pts = stops.map((s) => `${s.place.lat},${s.place.lng}`);
  if (pts.length < 2) {
    const q = pts[0] ?? 'Paris';
    return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=12&output=embed`;
  }
  const saddr = pts[0] ?? '';
  const daddr = pts.slice(1).join(' to: ');
  return `https://maps.google.com/maps?saddr=${encodeURIComponent(
    saddr,
  )}&daddr=${encodeURIComponent(daddr)}&output=embed`;
}
