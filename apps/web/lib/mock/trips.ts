import type { Trip } from './types';

export const trips: Trip[] = [
  {
    id: 'trip_paris_2026_may',
    name: 'Paris 2026 May — 路地裏編',
    startDate: '2026-05-12',
    endDate: '2026-05-15',
    travelers: 2,
    cityId: 'paris',
    days: [
      {
        id: 'd1',
        date: '2026-05-12',
        label: 'Day 1',
        items: [
          { id: 'i1', startTime: '09:00', endTime: '10:30', spotId: 'sp_001', notes: 'カウンターで軽めに', budgetJpy: 600, travelMinutesAfter: 10 },
          { id: 'i2', startTime: '10:40', endTime: '12:00', spotId: 'sp_073', notes: 'カードがあれば見る', budgetJpy: 1500, travelMinutesAfter: 5 },
          { id: 'i3', startTime: '12:30', endTime: '14:00', spotId: 'sp_002', notes: 'ガレットのComplèteで', budgetJpy: 1300, travelMinutesAfter: 15 },
          { id: 'i4', startTime: '14:30', endTime: '16:30', spotId: 'sp_070', notes: '常設+企画展', budgetJpy: 2000, travelMinutesAfter: 12 },
          { id: 'i5', startTime: '17:00', endTime: '19:00', spotId: 'sp_071', notes: 'お土産下見', budgetJpy: 0 },
        ],
      },
      {
        id: 'd2',
        date: '2026-05-13',
        label: 'Day 2',
        items: [
          { id: 'i6', startTime: '08:30', endTime: '10:30', spotId: 'sp_010', notes: 'バルベスから歩く', budgetJpy: 800, travelMinutesAfter: 15 },
          { id: 'i7', startTime: '10:50', endTime: '12:30', spotId: 'sp_011', notes: '生鮮を見る', budgetJpy: 1500, travelMinutesAfter: 8 },
          { id: 'i8', startTime: '12:50', endTime: '14:00', spotId: 'sp_012', notes: 'フォーで小休憩', budgetJpy: 1200, travelMinutesAfter: 10 },
          { id: 'i9', startTime: '14:20', endTime: '15:30', spotId: 'sp_013', notes: 'カフェで休憩', budgetJpy: 600 },
        ],
      },
      {
        id: 'd3',
        date: '2026-05-14',
        label: 'Day 3',
        items: [
          { id: 'i10', startTime: '10:00', endTime: '12:00', spotId: 'sp_040', notes: '無料、混まないうちに', budgetJpy: 0, travelMinutesAfter: 20 },
          { id: 'i11', startTime: '12:30', endTime: '13:30', spotId: 'sp_054', notes: 'コーヒーと軽食', budgetJpy: 1200, travelMinutesAfter: 12 },
          { id: 'i12', startTime: '14:00', endTime: '16:00', spotId: 'sp_192', notes: '雑貨を物色', budgetJpy: 3000 },
        ],
      },
    ],
  },
  {
    id: 'trip_paris_solo_3day',
    name: 'パリ一人旅、ゆっくり3日間',
    startDate: '2026-06-10',
    endDate: '2026-06-12',
    travelers: 1,
    cityId: 'paris',
    days: [
      {
        id: 'd1',
        date: '2026-06-10',
        label: 'Day 1',
        items: [
          { id: 'i1', startTime: '09:00', endTime: '10:00', spotId: 'sp_053', notes: 'パン2種', budgetJpy: 800, travelMinutesAfter: 10 },
          { id: 'i2', startTime: '10:15', endTime: '12:00', spotId: 'sp_180', notes: '朝のコーヒー', budgetJpy: 700, travelMinutesAfter: 15 },
          { id: 'i3', startTime: '13:00', endTime: '15:00', spotId: 'sp_210', notes: 'パッサージュ巡り開始', budgetJpy: 0, travelMinutesAfter: 5 },
          { id: 'i4', startTime: '15:05', endTime: '16:00', spotId: 'sp_211', budgetJpy: 0 },
        ],
      },
      {
        id: 'd2',
        date: '2026-06-11',
        label: 'Day 2',
        items: [
          { id: 'i5', startTime: '08:00', endTime: '10:00', spotId: 'sp_120', notes: '朝の散歩', budgetJpy: 0, travelMinutesAfter: 10 },
          { id: 'i6', startTime: '10:15', endTime: '11:30', spotId: 'sp_122', notes: 'パンとコーヒー', budgetJpy: 800, travelMinutesAfter: 30 },
          { id: 'i7', startTime: '12:30', endTime: '14:30', spotId: 'sp_170', notes: 'フォーでお昼', budgetJpy: 1200 },
        ],
      },
    ],
  },
  {
    id: 'trip_paris_family',
    name: 'パリ家族旅、子連れ4日',
    startDate: '2026-07-20',
    endDate: '2026-07-23',
    travelers: 4,
    cityId: 'paris',
    days: [
      {
        id: 'd1',
        date: '2026-07-20',
        label: 'Day 1',
        items: [
          { id: 'i1', startTime: '10:00', endTime: '12:00', spotId: 'sp_110', notes: '公園で遊ぶ', budgetJpy: 0, travelMinutesAfter: 5 },
          { id: 'i2', startTime: '12:15', endTime: '13:30', spotId: 'sp_111', notes: '子連れOKカフェ', budgetJpy: 3500, travelMinutesAfter: 15 },
          { id: 'i3', startTime: '14:00', endTime: '15:30', spotId: 'sp_112', notes: '絵本コーナーあり', budgetJpy: 1500 },
        ],
      },
      {
        id: 'd2',
        date: '2026-07-21',
        label: 'Day 2',
        items: [
          { id: 'i4', startTime: '09:00', endTime: '11:00', spotId: 'sp_241', notes: '高架の公園散歩', budgetJpy: 0, travelMinutesAfter: 10 },
          { id: 'i5', startTime: '11:30', endTime: '13:00', spotId: 'sp_242', notes: 'クラシックなランチ', budgetJpy: 8000 },
        ],
      },
    ],
  },
];

export const getTrip = (id: string): Trip | undefined =>
  trips.find((t) => t.id === id);
