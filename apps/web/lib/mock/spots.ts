import type { Spot } from './types';

// パリの実在地区の座標範囲: lat 48.81-48.90, lng 2.27-2.41
// 各記事 3-6 スポット、合計 80-100 が目安。

export const spots: Spot[] = [
  // art_001 マレ朝
  { id: 'sp_001', articleId: 'art_001', name: 'Café des Anciens', address: 'Rue Vieille du Temple, 75003 Paris', lat: 48.8593, lng: 2.3617, category: 'カフェ・ビストロ', priceEstimate: '€3〜€8', openingHours: '7:00–14:00', tags: ['朝食', '常連系'], description: 'カウンター4席のみの古いビストロ。エスプレッソ€1.50。' },
  { id: 'sp_002', articleId: 'art_001', name: 'Le Comptoir de Marie', address: 'Rue de Bretagne, 75003 Paris', lat: 48.8625, lng: 2.3635, category: 'ビストロ', priceEstimate: '€8〜€15', openingHours: '7:30–22:00', tags: ['朝食', 'ガレット'] },
  { id: 'sp_003', articleId: 'art_001', name: 'Bar du Coin', address: 'Rue des Archives, 75003 Paris', lat: 48.8608, lng: 2.3590, category: 'バー', priceEstimate: '€3〜€10', openingHours: '6:30–24:00', tags: ['朝食', '常連系'] },

  // art_002 20区市場
  { id: 'sp_010', articleId: 'art_002', name: 'Marché Barbès', address: 'Boulevard de la Chapelle, 75018 Paris', lat: 48.8848, lng: 2.3493, category: '市場', priceEstimate: '€5〜', openingHours: '水・土 7:00–14:30', tags: ['市場', '北アフリカ'] },
  { id: 'sp_011', articleId: 'art_002', name: 'Marché de Belleville', address: 'Boulevard de Belleville, 75011 Paris', lat: 48.8709, lng: 2.3771, category: '市場', priceEstimate: '€3〜', openingHours: '火・金 7:00–14:30', tags: ['市場', '生鮮'] },
  { id: 'sp_012', articleId: 'art_002', name: 'Le Pho 14', address: 'Rue de Belleville, 75020 Paris', lat: 48.8720, lng: 2.3849, category: 'ベトナム料理', priceEstimate: '€8〜€14', openingHours: '11:00–22:00', tags: ['アジアン'] },
  { id: 'sp_013', articleId: 'art_002', name: 'Place des Fêtes Café', address: 'Place des Fêtes, 75019 Paris', lat: 48.8769, lng: 2.3899, category: 'カフェ', priceEstimate: '€3〜€6', openingHours: '7:00–20:00', tags: ['カフェ'] },

  // art_003 5区パン
  { id: 'sp_020', articleId: 'art_003', name: 'Boulangerie Mauvieux', address: 'Rue Mouffetard, 75005 Paris', lat: 48.8424, lng: 2.3503, category: 'ブーランジェリー', priceEstimate: '€1〜€5', openingHours: '6:30–20:00', tags: ['パン', '老舗'] },
  { id: 'sp_021', articleId: 'art_003', name: 'Aux Pains de Mathilde', address: 'Rue Monge, 75005 Paris', lat: 48.8460, lng: 2.3530, category: 'ブーランジェリー', priceEstimate: '€1〜€6', openingHours: '7:00–20:30', tags: ['パン'] },
  { id: 'sp_022', articleId: 'art_003', name: 'Le Fournil de Jean', address: 'Rue Saint-Jacques, 75005 Paris', lat: 48.8480, lng: 2.3458, category: 'ブーランジェリー', priceEstimate: '€1〜€5', openingHours: '6:00–19:00', tags: ['パン', '老舗'] },
  { id: 'sp_023', articleId: 'art_003', name: 'La Petite Boulangerie', address: 'Rue de la Montagne Sainte-Geneviève, 75005 Paris', lat: 48.8470, lng: 2.3480, category: 'ブーランジェリー', priceEstimate: '€2〜€7', openingHours: '6:30–19:30', tags: ['パン'] },

  // art_004 モンマルトル夜
  { id: 'sp_030', articleId: 'art_004', name: 'Au Lapin Agile（裏路地から）', address: 'Rue des Saules, 75018 Paris', lat: 48.8884, lng: 2.3401, category: 'シャンソニエ', priceEstimate: '€20〜', openingHours: '21:00–24:00', tags: ['夜', '音楽'] },
  { id: 'sp_031', articleId: 'art_004', name: 'Librairie de Nuit', address: 'Rue des Abbesses, 75018 Paris', lat: 48.8842, lng: 2.3373, category: '書店', priceEstimate: '€5〜', openingHours: '15:00–23:00', tags: ['本', '夜'] },
  { id: 'sp_032', articleId: 'art_004', name: 'Le Tire-Bouchon', address: 'Rue Norvins, 75018 Paris', lat: 48.8865, lng: 2.3402, category: 'ワインバー', priceEstimate: '€8〜€20', openingHours: '18:00–02:00', tags: ['夜', 'ワイン'] },

  // art_005 隠れ美術館
  { id: 'sp_040', articleId: 'art_005', name: 'Musée Cognacq-Jay', address: '8 Rue Elzévir, 75003 Paris', lat: 48.8587, lng: 2.3624, category: '美術館', priceEstimate: '無料', openingHours: '10:00–18:00（月休）', tags: ['アート', '無料'] },
  { id: 'sp_041', articleId: 'art_005', name: 'Musée Nissim de Camondo', address: '63 Rue de Monceau, 75008 Paris', lat: 48.8783, lng: 2.3094, category: '美術館', priceEstimate: '€12', openingHours: '10:00–17:30', tags: ['アート'] },
  { id: 'sp_042', articleId: 'art_005', name: 'Maison de Balzac', address: '47 Rue Raynouard, 75016 Paris', lat: 48.8557, lng: 2.2772, category: '文学館', priceEstimate: '無料', openingHours: '10:00–18:00（月休）', tags: ['文学', '無料'] },
  { id: 'sp_043', articleId: 'art_005', name: 'Musée Bourdelle', address: '18 Rue Antoine Bourdelle, 75015 Paris', lat: 48.8430, lng: 2.3179, category: '美術館', priceEstimate: '無料', openingHours: '10:00–18:00（月休）', tags: ['アート', '彫刻'] },
  { id: 'sp_044', articleId: 'art_005', name: 'Musée Zadkine', address: '100 bis Rue d\'Assas, 75006 Paris', lat: 48.8433, lng: 2.3338, category: '美術館', priceEstimate: '無料', openingHours: '10:00–18:00（月休）', tags: ['アート'] },

  // art_006 朝食7軒（5つだけ実装）
  { id: 'sp_050', articleId: 'art_006', name: 'Holybelly 5', address: '5 Rue Lucien Sampaix, 75010 Paris', lat: 48.8723, lng: 2.3617, category: 'ブランチ', priceEstimate: '€10〜€18', openingHours: '8:30–16:00', tags: ['朝食', 'パンケーキ'] },
  { id: 'sp_051', articleId: 'art_006', name: 'Café Pinson', address: '6 Rue du Forez, 75003 Paris', lat: 48.8642, lng: 2.3640, category: 'オーガニック', priceEstimate: '€10〜€15', openingHours: '9:00–18:00', tags: ['朝食', 'ヘルシー'] },
  { id: 'sp_052', articleId: 'art_006', name: 'Mokonuts', address: '5 Rue Saint-Bernard, 75011 Paris', lat: 48.8520, lng: 2.3792, category: 'カフェ', priceEstimate: '€8〜€14', openingHours: '9:00–18:00', tags: ['朝食', '焼き菓子'] },
  { id: 'sp_053', articleId: 'art_006', name: 'Du Pain et des Idées', address: '34 Rue Yves Toudic, 75010 Paris', lat: 48.8702, lng: 2.3625, category: 'ブーランジェリー', priceEstimate: '€2〜€8', openingHours: '6:45–19:30', tags: ['パン', '名店'] },
  { id: 'sp_054', articleId: 'art_006', name: 'Boot Café', address: '19 Rue du Pont aux Choux, 75003 Paris', lat: 48.8607, lng: 2.3653, category: 'カフェ', priceEstimate: '€3〜€6', openingHours: '8:00–18:00', tags: ['カフェ', 'ミニマル'] },

  // art_007 11区ナチュラルワインバー
  { id: 'sp_060', articleId: 'art_007', name: 'Le Servan', address: '32 Rue Saint-Maur, 75011 Paris', lat: 48.8639, lng: 2.3786, category: 'ワインバー', priceEstimate: '€8〜€20', openingHours: '19:00–02:00', tags: ['ワイン', '夜遊び'] },
  { id: 'sp_061', articleId: 'art_007', name: 'Aux Deux Amis', address: '45 Rue Oberkampf, 75011 Paris', lat: 48.8657, lng: 2.3737, category: 'ナチュールバー', priceEstimate: '€6〜€18', openingHours: '17:00–02:00', tags: ['ワイン', 'ナチュール'] },
  { id: 'sp_062', articleId: 'art_007', name: 'Le Mary Celeste', address: '1 Rue Commines, 75003 Paris', lat: 48.8615, lng: 2.3654, category: 'カクテル・ワイン', priceEstimate: '€10〜€20', openingHours: '18:00–02:00', tags: ['カクテル'] },

  // art_008 雨の日マレ
  { id: 'sp_070', articleId: 'art_008', name: 'Musée Picasso', address: '5 Rue de Thorigny, 75003 Paris', lat: 48.8597, lng: 2.3625, category: '美術館', priceEstimate: '€14', openingHours: '10:30–18:00', tags: ['アート', '屋内'] },
  { id: 'sp_071', articleId: 'art_008', name: 'Merci Concept Store', address: '111 Boulevard Beaumarchais, 75003 Paris', lat: 48.8597, lng: 2.3683, category: 'ライフスタイル', priceEstimate: '€10〜', openingHours: '10:30–19:30', tags: ['雑貨'] },
  { id: 'sp_072', articleId: 'art_008', name: 'Carette Vosges', address: '25 Place des Vosges, 75003 Paris', lat: 48.8552, lng: 2.3658, category: 'カフェ・サロン', priceEstimate: '€8〜€18', openingHours: '7:30–23:30', tags: ['カフェ'] },
  { id: 'sp_073', articleId: 'art_008', name: 'Ofr. Bookshop', address: '20 Rue Dupetit-Thouars, 75003 Paris', lat: 48.8649, lng: 2.3640, category: '書店', priceEstimate: '€10〜', openingHours: '10:30–19:30', tags: ['本'] },

  // art_009 6区デート
  { id: 'sp_080', articleId: 'art_009', name: 'Le Comptoir du Relais', address: '9 Carrefour de l\'Odéon, 75006 Paris', lat: 48.8513, lng: 2.3389, category: 'ビストロ', priceEstimate: '€25〜€50', openingHours: '12:00–23:00', tags: ['デート'] },
  { id: 'sp_081', articleId: 'art_009', name: 'Semilla', address: '54 Rue de Seine, 75006 Paris', lat: 48.8550, lng: 2.3372, category: 'ネオビストロ', priceEstimate: '€30〜€60', openingHours: '12:30–14:30, 19:30–22:30', tags: ['デート', 'モダン'] },
  { id: 'sp_082', articleId: 'art_009', name: 'Bar Hemingway', address: '15 Place Vendôme（裏側ルート）', lat: 48.8678, lng: 2.3296, category: 'カクテルバー', priceEstimate: '€25〜', openingHours: '18:00–02:00', tags: ['デート', 'カクテル'] },

  // art_010 おばあちゃん雑貨店
  { id: 'sp_090', articleId: 'art_010', name: 'Bric-à-Brac de Madame Lulu', address: 'Rue de Lancry, 75010 Paris', lat: 48.8716, lng: 2.3608, category: '古道具', priceEstimate: '€5〜', openingHours: '11:00–19:00', tags: ['雑貨', '古道具'] },
  { id: 'sp_091', articleId: 'art_010', name: 'Antiquités Bélanger', address: 'Rue Oberkampf, 75011 Paris', lat: 48.8650, lng: 2.3760, category: 'アンティーク', priceEstimate: '€10〜', openingHours: '14:00–19:00', tags: ['アンティーク'] },
  { id: 'sp_092', articleId: 'art_010', name: 'Le Comptoir des Tisanes', address: 'Rue de Belleville, 75011 Paris', lat: 48.8704, lng: 2.3791, category: 'ハーブ・乾物', priceEstimate: '€3〜', openingHours: '10:00–19:00', tags: ['雑貨'] },
  { id: 'sp_093', articleId: 'art_010', name: 'Le Petit Souk', address: 'Rue de Lancry, 75010 Paris', lat: 48.8718, lng: 2.3617, category: '雑貨', priceEstimate: '€5〜', openingHours: '11:00–19:30', tags: ['雑貨'] },
  { id: 'sp_094', articleId: 'art_010', name: 'Mme. Plouf', address: 'Rue Saint-Maur, 75011 Paris', lat: 48.8645, lng: 2.3801, category: '古道具', priceEstimate: '€5〜', openingHours: '13:00–19:00', tags: ['古道具'] },

  // art_011 3区パティスリー
  { id: 'sp_100', articleId: 'art_011', name: 'Jacques Genin', address: '133 Rue de Turenne, 75003 Paris', lat: 48.8634, lng: 2.3650, category: 'パティスリー', priceEstimate: '€7〜', openingHours: '11:00–19:00', tags: ['スイーツ', '名店'] },
  { id: 'sp_101', articleId: 'art_011', name: 'Pain de Sucre', address: '14 Rue Rambuteau, 75003 Paris', lat: 48.8615, lng: 2.3558, category: 'パティスリー', priceEstimate: '€5〜', openingHours: '10:00–20:00', tags: ['スイーツ'] },
  { id: 'sp_102', articleId: 'art_011', name: 'Popelini', address: '29 Rue Debelleyme, 75003 Paris', lat: 48.8617, lng: 2.3654, category: 'シュークリーム専門', priceEstimate: '€2〜€5', openingHours: '11:00–19:30', tags: ['スイーツ'] },
  { id: 'sp_103', articleId: 'art_011', name: 'Pâtisserie Stohrer', address: '51 Rue Montorgueil, 75002 Paris', lat: 48.8649, lng: 2.3471, category: 'パティスリー', priceEstimate: '€5〜', openingHours: '7:30–20:30', tags: ['老舗'] },

  // art_012 11区子連れ
  { id: 'sp_110', articleId: 'art_012', name: 'Square Maurice Gardette', address: 'Rue du Général Blaise, 75011 Paris', lat: 48.8607, lng: 2.3784, category: '公園', priceEstimate: '無料', openingHours: '8:00–日没', tags: ['公園', '子連れ'] },
  { id: 'sp_111', articleId: 'art_012', name: 'Café Méricourt', address: '22 Rue de la Folie Méricourt, 75011 Paris', lat: 48.8635, lng: 2.3725, category: 'カフェ', priceEstimate: '€8〜€15', openingHours: '8:30–17:00', tags: ['朝食', '子連れ'] },
  { id: 'sp_112', articleId: 'art_012', name: 'Librairie L\'Atelier', address: '2bis Rue du Jourdain, 75020 Paris', lat: 48.8730, lng: 2.3870, category: '本屋', priceEstimate: '€5〜', openingHours: '10:30–19:30', tags: ['本'] },
  { id: 'sp_113', articleId: 'art_012', name: 'Le Square Marché Popincourt', address: 'Rue Ternaux, 75011 Paris', lat: 48.8638, lng: 2.3768, category: '市場', priceEstimate: '€3〜', openingHours: '火・金 7:00–14:30', tags: ['市場'] },

  // art_013 14区モンスーリ
  { id: 'sp_120', articleId: 'art_013', name: 'Parc Montsouris', address: 'Bd Jourdan, 75014 Paris', lat: 48.8228, lng: 2.3373, category: '公園', priceEstimate: '無料', openingHours: '7:30–日没', tags: ['公園', '散歩'] },
  { id: 'sp_121', articleId: 'art_013', name: 'Le Pavillon Montsouris', address: '20 Rue Gazan, 75014 Paris', lat: 48.8222, lng: 2.3375, category: 'ビストロ', priceEstimate: '€18〜€35', openingHours: '12:00–22:00', tags: ['朝食'] },
  { id: 'sp_122', articleId: 'art_013', name: 'Boulangerie de la Cité Universitaire', address: 'Bd Jourdan, 75014 Paris', lat: 48.8195, lng: 2.3376, category: 'ブーランジェリー', priceEstimate: '€1〜€5', openingHours: '7:00–19:30', tags: ['パン'] },

  // art_014 マレ古本
  { id: 'sp_130', articleId: 'art_014', name: 'Librairie de la Halle Saint-Pierre', address: 'Rue Ronsard, 75018 Paris', lat: 48.8862, lng: 2.3438, category: '古書店', priceEstimate: '€5〜', openingHours: '11:00–18:00', tags: ['本'] },
  { id: 'sp_131', articleId: 'art_014', name: 'Vinyles Anciens', address: 'Rue de Rivoli, 75004 Paris', lat: 48.8555, lng: 2.3580, category: 'レコード', priceEstimate: '€10〜', openingHours: '12:00–19:00', tags: ['レコード'] },
  { id: 'sp_132', articleId: 'art_014', name: 'La Belle Hortense', address: '31 Rue Vieille du Temple, 75004 Paris', lat: 48.8572, lng: 2.3596, category: '書店・ワイン', priceEstimate: '€8〜', openingHours: '17:00–02:00', tags: ['本', 'ワイン'] },
  { id: 'sp_133', articleId: 'art_014', name: 'Yvon Lambert Bookshop', address: '14 Rue des Filles du Calvaire, 75003 Paris', lat: 48.8636, lng: 2.3648, category: 'アート書店', priceEstimate: '€10〜', openingHours: '10:00–19:00', tags: ['本', 'アート'] },

  // art_015 ストリートフード
  { id: 'sp_140', articleId: 'art_015', name: 'Sao Mai Vietnam Truck', address: 'Avenue de Choisy, 75013 Paris', lat: 48.8254, lng: 2.3603, category: 'ベトナム屋台', priceEstimate: '€5〜€10', openingHours: '11:30–22:00', tags: ['ストリートフード'] },
  { id: 'sp_141', articleId: 'art_015', name: 'Chez Aïssa（クスクス）', address: 'Bd de Belleville, 75011 Paris', lat: 48.8702, lng: 2.3766, category: '北アフリカ屋台', priceEstimate: '€7〜€12', openingHours: '11:00–22:00', tags: ['ストリートフード'] },
  { id: 'sp_142', articleId: 'art_015', name: 'Senegalese Bowl', address: 'Rue de Charonne, 75011 Paris', lat: 48.8538, lng: 2.3818, category: 'アフリカ料理', priceEstimate: '€8〜€14', openingHours: '12:00–21:00', tags: ['ストリートフード'] },

  // art_016 エスプレッソ
  { id: 'sp_150', articleId: 'art_016', name: 'Telescope', address: '5 Rue Villedo, 75001 Paris', lat: 48.8665, lng: 2.3372, category: 'カフェ', priceEstimate: '€3〜€5', openingHours: '8:30–17:30', tags: ['コーヒー'] },
  { id: 'sp_151', articleId: 'art_016', name: 'Coutume Café', address: '47 Rue de Babylone, 75007 Paris', lat: 48.8519, lng: 2.3175, category: 'カフェ', priceEstimate: '€3〜€6', openingHours: '8:00–18:00', tags: ['コーヒー'] },
  { id: 'sp_152', articleId: 'art_016', name: 'Loustic', address: '40 Rue Chapon, 75003 Paris', lat: 48.8636, lng: 2.3565, category: 'カフェ', priceEstimate: '€3〜€5', openingHours: '8:30–18:30', tags: ['コーヒー'] },
  { id: 'sp_153', articleId: 'art_016', name: 'KB CaféShop', address: '53 Avenue Trudaine, 75009 Paris', lat: 48.8821, lng: 2.3438, category: 'カフェ', priceEstimate: '€3〜€5', openingHours: '8:30–18:00', tags: ['コーヒー'] },
  { id: 'sp_154', articleId: 'art_016', name: 'Café Lomi', address: '3 Rue Marcadet, 75018 Paris', lat: 48.8909, lng: 2.3520, category: 'カフェ・焙煎所', priceEstimate: '€3〜€7', openingHours: '10:00–18:00', tags: ['コーヒー'] },
  { id: 'sp_155', articleId: 'art_016', name: 'Café Mirage', address: 'Rue Saint-Maur, 75011 Paris', lat: 48.8632, lng: 2.3796, category: 'カフェ', priceEstimate: '€3〜€6', openingHours: '8:00–17:30', tags: ['コーヒー'] },

  // art_017 7区エッフェル塔
  { id: 'sp_160', articleId: 'art_017', name: 'Le P\'tit Troquet', address: '28 Rue de l\'Exposition, 75007 Paris', lat: 48.8569, lng: 2.3047, category: 'ビストロ', priceEstimate: '€25〜€40', openingHours: '12:00–22:00', tags: ['ビストロ'] },
  { id: 'sp_161', articleId: 'art_017', name: 'L\'Ami Jean', address: '27 Rue Malar, 75007 Paris', lat: 48.8612, lng: 2.3072, category: 'ビストロ', priceEstimate: '€30〜€55', openingHours: '12:00–23:00', tags: ['ビストロ', 'バスク'] },
  { id: 'sp_162', articleId: 'art_017', name: 'Café Constant', address: '139 Rue Saint-Dominique, 75007 Paris', lat: 48.8588, lng: 2.3050, category: 'カフェ・ビストロ', priceEstimate: '€20〜€40', openingHours: '7:00–23:00', tags: ['ビストロ'] },

  // art_018 13区チャイナタウン
  { id: 'sp_170', articleId: 'art_018', name: 'Pho 14', address: '129 Avenue de Choisy, 75013 Paris', lat: 48.8264, lng: 2.3596, category: 'ベトナム料理', priceEstimate: '€8〜€14', openingHours: '11:30–22:30', tags: ['アジアン'] },
  { id: 'sp_171', articleId: 'art_018', name: 'Tricotin', address: '15 Avenue de Choisy, 75013 Paris', lat: 48.8311, lng: 2.3606, category: '中華・点心', priceEstimate: '€10〜€18', openingHours: '9:30–24:00', tags: ['アジアン'] },
  { id: 'sp_172', articleId: 'art_018', name: 'Lao Lane Xang', address: '102 Avenue d\'Ivry, 75013 Paris', lat: 48.8240, lng: 2.3617, category: 'ラオス・タイ', priceEstimate: '€10〜€18', openingHours: '12:00–23:00', tags: ['アジアン'] },
  { id: 'sp_173', articleId: 'art_018', name: 'Tang Frères', address: '48 Avenue d\'Ivry, 75013 Paris', lat: 48.8270, lng: 2.3611, category: 'アジア食材店', priceEstimate: '€2〜', openingHours: '9:00–19:30', tags: ['食材店'] },

  // art_019 サンマルタン運河
  { id: 'sp_180', articleId: 'art_019', name: 'Chez Prune', address: '36 Rue Beaurepaire, 75010 Paris', lat: 48.8702, lng: 2.3651, category: 'カフェ・バー', priceEstimate: '€5〜€15', openingHours: '8:00–02:00', tags: ['立ち飲み'] },
  { id: 'sp_181', articleId: 'art_019', name: 'Le Comptoir Général', address: '80 Quai de Jemmapes, 75010 Paris', lat: 48.8719, lng: 2.3650, category: 'バー', priceEstimate: '€6〜€15', openingHours: '11:00–02:00', tags: ['夕方', 'カルチャー'] },
  { id: 'sp_182', articleId: 'art_019', name: 'Hôtel du Nord', address: '102 Quai de Jemmapes, 75010 Paris', lat: 48.8745, lng: 2.3650, category: 'ビストロ', priceEstimate: '€15〜€30', openingHours: '9:00–02:00', tags: ['ビストロ'] },

  // art_020 マレ蚤の市
  { id: 'sp_190', articleId: 'art_020', name: 'Marché aux Puces de la Bastille', address: 'Bd Richard-Lenoir, 75011 Paris', lat: 48.8576, lng: 2.3705, category: '蚤の市', priceEstimate: '€5〜', openingHours: '土日 7:00–14:00', tags: ['蚤の市'] },
  { id: 'sp_191', articleId: 'art_020', name: 'Galerie 88', address: '88 Rue de la Roquette, 75011 Paris', lat: 48.8584, lng: 2.3784, category: 'アンティーク', priceEstimate: '€10〜', openingHours: '11:00–19:00', tags: ['アンティーク'] },
  { id: 'sp_192', articleId: 'art_020', name: 'Au Petit Bonheur la Chance', address: '13 Rue Saint-Paul, 75004 Paris', lat: 48.8543, lng: 2.3617, category: '雑貨', priceEstimate: '€5〜', openingHours: '11:00–19:00', tags: ['雑貨', 'ヴィンテージ'] },
  { id: 'sp_193', articleId: 'art_020', name: 'Le Village Saint-Paul', address: 'Rue Saint-Paul, 75004 Paris', lat: 48.8540, lng: 2.3625, category: 'アンティーク街', priceEstimate: '€10〜', openingHours: '11:00–19:00', tags: ['古道具'] },

  // art_021 名画座
  { id: 'sp_200', articleId: 'art_021', name: 'Le Champo', address: '51 Rue des Écoles, 75005 Paris', lat: 48.8497, lng: 2.3437, category: '映画館', priceEstimate: '€7〜€10', openingHours: '14:00–24:00', tags: ['映画'] },
  { id: 'sp_201', articleId: 'art_021', name: 'Studio 28', address: '10 Rue Tholozé, 75018 Paris', lat: 48.8852, lng: 2.3374, category: '映画館', priceEstimate: '€7〜€10', openingHours: '15:00–23:30', tags: ['映画', '老舗'] },
  { id: 'sp_202', articleId: 'art_021', name: 'Le Brady', address: '39 Bd de Strasbourg, 75010 Paris', lat: 48.8716, lng: 2.3550, category: '映画館', priceEstimate: '€7', openingHours: '14:30–24:00', tags: ['映画'] },

  // art_022 パッサージュ
  { id: 'sp_210', articleId: 'art_022', name: 'Passage des Panoramas', address: '11 Bd Montmartre, 75002 Paris', lat: 48.8707, lng: 2.3415, category: 'パッサージュ', priceEstimate: '€', openingHours: '6:00–24:00', tags: ['建築', '雨の日'] },
  { id: 'sp_211', articleId: 'art_022', name: 'Galerie Vivienne', address: '4 Rue des Petits Champs, 75002 Paris', lat: 48.8665, lng: 2.3402, category: 'パッサージュ', priceEstimate: '€', openingHours: '8:30–20:30', tags: ['建築'] },
  { id: 'sp_212', articleId: 'art_022', name: 'Passage Jouffroy', address: '10 Bd Montmartre, 75009 Paris', lat: 48.8716, lng: 2.3416, category: 'パッサージュ', priceEstimate: '€', openingHours: '7:00–21:30', tags: ['建築'] },
  { id: 'sp_213', articleId: 'art_022', name: 'Passage Verdeau', address: '6 Rue de la Grange Batelière, 75009 Paris', lat: 48.8723, lng: 2.3414, category: 'パッサージュ', priceEstimate: '€', openingHours: '7:00–21:30', tags: ['建築'] },
  { id: 'sp_214', articleId: 'art_022', name: 'Passage Brady', address: '46 Rue du Faubourg Saint-Denis, 75010 Paris', lat: 48.8714, lng: 2.3535, category: 'パッサージュ', priceEstimate: '€', openingHours: '6:00–22:00', tags: ['建築', 'インド料理'] },

  // art_023 深夜営業
  { id: 'sp_220', articleId: 'art_023', name: 'Au Pied de Cochon', address: '6 Rue Coquillière, 75001 Paris', lat: 48.8631, lng: 2.3458, category: 'ブラスリー', priceEstimate: '€20〜€40', openingHours: '24時間営業', tags: ['深夜'] },
  { id: 'sp_221', articleId: 'art_023', name: 'Le Tambour', address: '41 Rue Montmartre, 75002 Paris', lat: 48.8665, lng: 2.3475, category: 'ビストロ', priceEstimate: '€15〜€30', openingHours: '24時間営業', tags: ['深夜'] },
  { id: 'sp_222', articleId: 'art_023', name: 'La Maison de l\'Aubrac', address: '37 Rue Marbeuf, 75008 Paris', lat: 48.8693, lng: 2.3035, category: 'ステーキ', priceEstimate: '€30〜€60', openingHours: '24時間営業', tags: ['深夜'] },

  // art_024 16区
  { id: 'sp_230', articleId: 'art_024', name: 'Boulangerie Bo', address: '38 Rue de Boulainvilliers, 75016 Paris', lat: 48.8533, lng: 2.2776, category: 'ブーランジェリー', priceEstimate: '€2〜€7', openingHours: '7:00–20:00', tags: ['パン'] },
  { id: 'sp_231', articleId: 'art_024', name: 'Aux Délices de Passy', address: '76 Rue de Passy, 75016 Paris', lat: 48.8567, lng: 2.2775, category: 'ブーランジェリー', priceEstimate: '€2〜€7', openingHours: '7:00–19:30', tags: ['パン'] },
  { id: 'sp_232', articleId: 'art_024', name: 'Pâtisserie de Auteuil', address: '24 Rue d\'Auteuil, 75016 Paris', lat: 48.8497, lng: 2.2697, category: 'パティスリー', priceEstimate: '€3〜€8', openingHours: '7:30–19:30', tags: ['パン'] },

  // art_025 1日コース
  { id: 'sp_240', articleId: 'art_025', name: 'Marché Bastille', address: 'Bd Richard-Lenoir, 75011 Paris', lat: 48.8576, lng: 2.3705, category: '市場', priceEstimate: '€', openingHours: '木日 7:00–14:30', tags: ['市場', '朝'] },
  { id: 'sp_241', articleId: 'art_025', name: 'Promenade Plantée', address: 'Avenue Daumesnil, 75012 Paris', lat: 48.8491, lng: 2.3776, category: '高架公園', priceEstimate: '無料', openingHours: '8:00–日没', tags: ['散歩', '公園'] },
  { id: 'sp_242', articleId: 'art_025', name: 'Le Train Bleu', address: 'Gare de Lyon, 75012 Paris', lat: 48.8447, lng: 2.3736, category: 'ブラスリー（歴史的）', priceEstimate: '€20〜€50', openingHours: '11:30–22:30', tags: ['観光地内の穴場', 'ランチ'] },
  { id: 'sp_243', articleId: 'art_025', name: 'Le Baron Rouge', address: '1 Rue Théophile Roussel, 75012 Paris', lat: 48.8497, lng: 2.3779, category: 'ワインバー', priceEstimate: '€5〜€12', openingHours: '17:00–22:00', tags: ['立ち飲み'] },
];

export const getSpot = (id: string): Spot | undefined =>
  spots.find((s) => s.id === id);

export const spotsForArticle = (articleId: string): Spot[] =>
  spots.filter((s) => s.articleId === articleId);
