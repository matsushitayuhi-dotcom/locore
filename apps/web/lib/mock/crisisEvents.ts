import type { CrisisEvent } from './types';

export const crisisEvents: CrisisEvent[] = [
  {
    id: 'cri_grve_metro_2026_05_06',
    cityId: 'paris',
    severity: 3,
    title: 'パリメトロ、5月6日（火）大規模ストライキ告知',
    summary:
      'メトロ1号線・4号線・14号線で本数を通常の30%程度まで削減する見込みです。観光地アクセスは大きく遅延する可能性があります。郊外からのRER B/Dも影響を受けます。13時以降に空港から市内に入る予定の方は、特に余裕を持った行動を推奨します。',
    affectedRoutes: ['Métro 1', 'Métro 4', 'Métro 14', 'RER B', 'RER D'],
    startsAt: '2026-05-06T05:00:00Z',
    endsAt: '2026-05-06T22:00:00Z',
  },
  {
    id: 'cri_demo_republique_2026_05_10',
    cityId: 'paris',
    severity: 2,
    title: '5月10日（土）共和国広場〜バスチーユ間でデモ予定',
    summary:
      '労働組合主催のデモが土曜午後に予定されています。10:00〜18:00、共和国広場〜バスチーユのルート。マレ地区の一部で交通規制が想定されます。歩いて移動する場合も、デモの進行ルートからは少し迂回したほうが快適です。',
    affectedRoutes: ['République–Bastille 周辺道路'],
    startsAt: '2026-05-10T08:00:00Z',
    endsAt: '2026-05-10T19:00:00Z',
  },
];
