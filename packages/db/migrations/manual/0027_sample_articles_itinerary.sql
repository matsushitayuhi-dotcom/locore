-- 0027_sample_articles_itinerary.sql
-- パリ市内 + 郊外の旅程プラン記事 7 本のサンプルシード。
-- writer_id / city_id は (SELECT ... FROM ...) で動的に解決。
-- itinerary_blocks は freeName で書き、spotId は null とする運用。
-- 全行 is_sample = true を立てるので、後段で
--   DELETE FROM spots WHERE is_sample = true;
--   DELETE FROM articles WHERE is_sample = true;
-- で一括撤去できる。

BEGIN;

-- =============================================================
-- Article 1: マレ × バスティーユ、大人の夜散歩
-- writer: junko (Tier S)  /  half_day  /  パリ市内
-- =============================================================
WITH new_article AS (
  INSERT INTO articles (
    id, writer_id, city_id, title, body, body_paid,
    cover_image_url, price_jpy, status, tags,
    duration_type, article_type, published_at,
    itinerary_blocks, is_sample
  )
  VALUES (
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'junko@locore.test'),
    (SELECT id FROM cities WHERE slug = 'paris'),
    'マレからバスティーユへ、20時から始まる大人の夜散歩コース',
    E'マレの観光客が地下鉄に吸い込まれて消える20時過ぎ、街は急に「住人の時間」に切り替わります。\n\n' ||
      'このコースは、ディナーを軽めに始めて、ワインを1杯ずつ違う店で飲み、最後にバスティーユの裏路地で深夜のフロマージュを買って帰る、というパリ在住12年の私が普段やっている夜の動き方をそのまま記事にしたものです。\n\n' ||
      '観光地として有名な店は1軒も入れていません。代わりに、地元の建築家やギャラリー関係者が常連にしている、いわゆる「生活の店」だけを4軒、約3時間半でつなぎます。',
    E'## 20:00  Le Petit Caveau de Sévigné（マレ・3区）\n\n' ||
      'ヴォージュ広場から細い路地を北に2本入った、ガラス越しに見える地下の小さなビストロ。20時に予約しておくと、入口の鉄階段を下りた瞬間に「観光客向け」の空気がきれいに切れます。\n\n' ||
      '頼むのは「Plat du soir」一品（その日の煮込み）と、natural Beaujolais の glass。話し声のトーンが低く、3〜4人組のパリジャンが多い。ここで腹を6割埋めるイメージで切り上げるのがコツ。\n\n' ||
      '## 21:15  Cave Madame Renard（4区・路地裏）\n\n' ||
      'ワインショップ兼立ち飲み。木の樽の上にチーズボードが置かれているだけ、椅子はなし。常連は店主のマダムと猫の話を1分してから注文する、というローカル儀礼があります。\n\n' ||
      '私のおすすめは Vin Jaune の50ml と、Comté 30 mois ひと切れ。合計€9前後で、ここの空気を切り取って持ち帰れる。\n\n' ||
      '## 22:00  Passage du Cheval-Vert（マレ→バスティーユの抜け道）\n\n' ||
      '地図にはほとんど載っていない私道。夜の照明がオレンジで、19世紀の馬車道のままの石畳がそのまま残っています。15分かけてゆっくり歩いてください。途中、左手に古い印刷工房（ガラス越しに古活字が見える）。\n\n' ||
      '## 22:30  Le Comptoir d''Alfonse（バスティーユ・11区側）\n\n' ||
      '夜カフェ。深夜0時まで開いていて、エスプレッソ＋自家製 financier €4。常連はほぼフランス語のみ。Wi-Fi なし、それが救い。\n\n' ||
      '## 23:30  Fromagerie de Nuit Béranger（11区裏通り）\n\n' ||
      '23時以降に開く、知る人ぞ知る「夜のフロマージュリー」。バー帰りの近所の住人が、明日の朝食用にチーズを買って帰る場所。Brillat-Savarin 100g €6 くらい。袋を提げて11区の運河方向に歩けば、もう完全にパリの夜の住人。',
    'https://picsum.photos/seed/locore-sample-itin-1/960/640',
    1800,
    'published'::article_status,
    ARRAY['マレ', 'バスティーユ', '夜散歩', 'ワイン', '大人向け']::text[],
    'half_day'::article_duration,
    'itinerary'::article_type,
    '2026-05-09T19:00:00Z'::timestamptz,
    $$[
      {"id":"tmp-1-1","startTime":"20:00","endTime":"21:00","spotId":null,"freeName":"Le Petit Caveau de Sévigné","notes":"Plat du soir + natural Beaujolais。腹6割で切り上げる","transportToNext":"walk","transportNote":"路地伝いに6分","travelMinutesAfter":6},
      {"id":"tmp-1-2","startTime":"21:15","endTime":"21:50","spotId":null,"freeName":"Cave Madame Renard","notes":"立ち飲み。Vin Jaune 50ml + Comté 30 mois。マダムと猫の話から始まる","transportToNext":"walk","transportNote":"Passage du Cheval-Vert 経由で15分。途中の印刷工房を見る","travelMinutesAfter":15},
      {"id":"tmp-1-3","startTime":"22:30","endTime":"23:15","spotId":null,"freeName":"Le Comptoir d'Alfonse","notes":"夜カフェ。エスプレッソ + financier。Wi-Fi なしが救い","transportToNext":"walk","transportNote":"11区裏通りを北に8分","travelMinutesAfter":8},
      {"id":"tmp-1-4","startTime":"23:30","endTime":"23:50","spotId":null,"freeName":"Fromagerie de Nuit Béranger","notes":"夜のフロマージュリー。Brillat-Savarin 100g を買って帰る","transportToNext":null,"transportNote":null,"travelMinutesAfter":null}
    ]$$::jsonb,
    true
  )
  RETURNING id
)
INSERT INTO spots (article_id, name, address, location, category, price_estimate, tags, position, is_sample)
SELECT id, v.name, v.address, ('SRID=4326;POINT(' || v.lng || ' ' || v.lat || ')')::geography,
       v.category::spot_category, v.price_estimate, v.tags, v.position, true
FROM new_article,
     (VALUES
       ('Le Petit Caveau de Sévigné', 'Rue de Sévigné, 75003 Paris', 2.3631::float, 48.8576::float, 'food', '€18〜€28', ARRAY['ビストロ','夜']::text[], 0),
       ('Cave Madame Renard',          'Rue du Roi de Sicile, 75004 Paris', 2.3585, 48.8555, 'food', '€8〜€15', ARRAY['ワイン','立ち飲み']::text[], 1),
       ('Le Comptoir d''Alfonse',      'Rue de la Roquette, 75011 Paris', 2.3722, 48.8552, 'food', '€4〜€10', ARRAY['カフェ','夜']::text[], 2),
       ('Fromagerie de Nuit Béranger', 'Rue Béranger, 75003 Paris', 2.3637, 48.8662, 'food', '€6〜€12', ARRAY['チーズ','夜遅い']::text[], 3)
     ) AS v(name, address, lng, lat, category, price_estimate, tags, position);


-- =============================================================
-- Article 2: 2区パッサージュ建築巡り + 中央 19世紀アーケード
-- writer: yuto (Tier A)  /  full_day  /  パリ市内
-- =============================================================
WITH new_article AS (
  INSERT INTO articles (
    id, writer_id, city_id, title, body, body_paid,
    cover_image_url, price_jpy, status, tags,
    duration_type, article_type, published_at,
    itinerary_blocks, is_sample
  )
  VALUES (
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'yuto@locore.test'),
    (SELECT id FROM cities WHERE slug = 'paris'),
    '2区のパッサージュを5本歩く、19世紀のパリを天井で読む1日',
    E'パッサージュ（passage couvert）は、19世紀前半に都市の泥道を避けるために作られたガラス天井のアーケード商店街です。最盛期にパリには150本以上ありましたが、いまも歩ける状態で残っているのは20本ほど。そのうち、2区を中心に固まっている密度の濃い5本を1日かけてつなぎます。\n\n' ||
      '建築だけを見るのではなく、「いまそこで何が売られていて、誰がそこで働いているか」を併せて読むのが面白いコース。19世紀の鉄骨ガラス建築の下で、2026年のレコード屋やコーヒー焙煎が同居している、その重なりが2区パッサージュの本当の見どころです。',
    E'## 10:00  Passage des Panoramas（2区・最古のパッサージュ）\n\n' ||
      '1799年開業、現存する最古級のパッサージュ。床のモザイクは19世紀後半のもので、まだ補修跡が新旧入り混じっています。コース冒頭は朝のうちに、テナントが店を開ける9:45〜10:15の間に入るのがおすすめ。シャッターを開ける音、コーヒーを淹れる音、それだけでこの天井の音響特性がわかります。\n\n' ||
      '途中の切手商「Philatélie Pasquet」のショーウィンドウだけ覗いてください。19世紀末の絵葉書が€3から。\n\n' ||
      '## 11:30  Galerie Vivienne（2区・最も美しい）\n\n' ||
      'モザイク床の状態が一番きれい、天井の高さも一番ある。中央のロタンダで足を止めて、5分黙って天井を見上げると、ガラスの継ぎ目のリズムが効いてくる。\n\n' ||
      '本屋「Librairie Jousseaume」（1826年創業）はパリで最も古い書店の1つ。文庫の棚は触ってOK、革装本のショーケースだけは見るだけ。\n\n' ||
      '## 13:00  ランチ：Bistrot Camille-Desmoulins（パッサージュ内ビストロ）\n\n' ||
      'Galerie Vivienne の中。前菜+メインで€22の lunch formula。天井から落ちる光だけで写真が成立する席があるので、店に入ったら左奥の2人席を狙う。\n\n' ||
      '## 14:30  Passage Choiseul（2区南）\n\n' ||
      '長さ190mのまっすぐな1本道。サンドリーヌ・ピヌッチ風の絵を置く現代ギャラリーと、靴の修理屋と、ヴィンテージ古着が雑に同居している、いまも「働いている」パッサージュ。観光客は少ない。\n\n' ||
      '## 15:30  Passage Jouffroy（9区との境）\n\n' ||
      'グレヴァン蝋人形館の入口がここ。蝋人形は無視して、奥のステッキ専門店「Segas」を覗く。19世紀の動物頭ステッキが €380〜。買わなくても見るだけで江戸末期のような気分になる。\n\n' ||
      '## 16:30  Passage Verdeau（締めのコーヒー）\n\n' ||
      'Jouffroy から道を渡って続くパッサージュ。古地図と古書の店が3軒並んでいる、観光地化していない最後のゾーン。\n\n' ||
      '締めは入口横の小さな焙煎カフェで、フィルター €4。ガラス天井越しに夕方の光が差すタイミングで、1日が静かに着地します。',
    'https://picsum.photos/seed/locore-sample-itin-2/960/640',
    2400,
    'published'::article_status,
    ARRAY['パッサージュ', '建築', '2区', '19世紀', '古書']::text[],
    'full_day'::article_duration,
    'itinerary'::article_type,
    '2026-05-02T10:00:00Z'::timestamptz,
    $$[
      {"id":"tmp-2-1","startTime":"10:00","endTime":"11:15","spotId":null,"freeName":"Passage des Panoramas","notes":"開店時の音響を聴く。切手商 Philatélie Pasquet のショーウィンドウ","transportToNext":"walk","transportNote":"Rue des Petits Champs 経由で15分","travelMinutesAfter":15},
      {"id":"tmp-2-2","startTime":"11:30","endTime":"12:45","spotId":null,"freeName":"Galerie Vivienne","notes":"中央ロタンダで天井を5分眺める。Librairie Jousseaume(1826)","transportToNext":"walk","transportNote":"同じパッサージュ内に移動","travelMinutesAfter":2},
      {"id":"tmp-2-3","startTime":"13:00","endTime":"14:15","spotId":null,"freeName":"Bistrot Camille-Desmoulins","notes":"ランチ formula €22。左奥の2人席を狙う","transportToNext":"walk","transportNote":"南下12分。途中の Place des Victoires も見る","travelMinutesAfter":12},
      {"id":"tmp-2-4","startTime":"14:30","endTime":"15:15","spotId":null,"freeName":"Passage Choiseul","notes":"いまも働くパッサージュ。靴修理 × 古着 × 現代ギャラリーの同居","transportToNext":"metro","transportNote":"Métro 4号線（Quatre-Septembre → Richelieu-Drouot）8分","travelMinutesAfter":12},
      {"id":"tmp-2-5","startTime":"15:30","endTime":"16:15","spotId":null,"freeName":"Passage Jouffroy","notes":"Segas のステッキ専門店。蝋人形館の手前で右を見る","transportToNext":"walk","transportNote":"道路を渡って Passage Verdeau へ3分","travelMinutesAfter":3},
      {"id":"tmp-2-6","startTime":"16:30","endTime":"17:30","spotId":null,"freeName":"Passage Verdeau & Café du Verdeau","notes":"古地図屋 + 焙煎カフェでフィルター €4。夕方の光で着地","transportToNext":null,"transportNote":null,"travelMinutesAfter":null}
    ]$$::jsonb,
    true
  )
  RETURNING id
)
INSERT INTO spots (article_id, name, address, location, category, price_estimate, tags, position, is_sample)
SELECT id, v.name, v.address, ('SRID=4326;POINT(' || v.lng || ' ' || v.lat || ')')::geography,
       v.category::spot_category, v.price_estimate, v.tags, v.position, true
FROM new_article,
     (VALUES
       ('Passage des Panoramas',     '11 Bd Montmartre, 75002 Paris', 2.3417::float, 48.8714::float, 'sight',    '無料',     ARRAY['パッサージュ','建築']::text[], 0),
       ('Galerie Vivienne',          '4 Rue des Petits Champs, 75002 Paris', 2.3403, 48.8665, 'sight',    '無料',     ARRAY['パッサージュ','19世紀']::text[], 1),
       ('Bistrot Camille-Desmoulins','Galerie Vivienne, 75002 Paris',         2.3404, 48.8666, 'food',     '€18〜€26', ARRAY['ランチ','ビストロ']::text[], 2),
       ('Passage Choiseul',          '40 Rue des Petits Champs, 75002 Paris', 2.3349, 48.8678, 'sight',    '無料',     ARRAY['パッサージュ','古着']::text[], 3),
       ('Passage Jouffroy',          '10-12 Bd Montmartre, 75009 Paris',      2.3429, 48.8717, 'sight',    '無料',     ARRAY['パッサージュ','9区']::text[], 4),
       ('Passage Verdeau',           '6 Rue de la Grange Batelière, 75009 Paris', 2.3434, 48.8723, 'food',  '€3〜€6',  ARRAY['カフェ','古書']::text[], 5)
     ) AS v(name, address, lng, lat, category, price_estimate, tags, position);


-- =============================================================
-- Article 3: 雨の日インドアコース（書店・カフェ・小美術館）
-- writer: haruka (Tier B)  /  half_day  /  カルチエ・ラタン
-- =============================================================
WITH new_article AS (
  INSERT INTO articles (
    id, writer_id, city_id, title, body, body_paid,
    cover_image_url, price_jpy, status, tags,
    duration_type, article_type, published_at,
    itinerary_blocks, is_sample
  )
  VALUES (
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'haruka@locore.test'),
    (SELECT id FROM cities WHERE slug = 'paris'),
    '雨のカルチエ・ラタン、傘を一度も差さずに半日過ごす学生街コース',
    E'パリは年間に150日以上雨が降ります。私は5区の学生で、雨の日にどう動くかをずっと考え続けてきました。\n\n' ||
      'このコースは「傘を一度も差さない」を半分本気のルールにして、カルチエ・ラタンの古書店、屋根続きのギャラリー、地下のカフェだけをつないだ4時間ほどの動線です。雨そのものを楽しむのではなく、雨を「言い訳」にして、晴れの日には素通りしてしまう小さな場所に入る。そういうコースだと思ってください。',
    E'## 13:00  Librairie Le Pont Traversé（5区・古書）\n\n' ||
      'ソルボンヌの裏手にある、文芸書だけを扱う独立古書店。雨の日に店主のおじさんが必ずやっている儀式があって、入口に古いタオルを敷いて客の靴を吸わせる。あれが見られたら、その日は当たり。\n\n' ||
      'お目当ては奥の棚の「ガリマール白」（白い表紙のNRFシリーズ）。古いものなら€4から。仏語が読めなくても、紙の質と造本だけで楽しめます。\n\n' ||
      '## 14:00  Galerie Vivien-Sorbonne（屋根続きの中庭）\n\n' ||
      'ソルボンヌ大学とPanthéonの間にある、観光ガイドに載っていない屋根付きの小さな中庭。アーチが3つ連続していて、雨の音がここだけ消える独特の音響。学生がベンチでiPadを広げています。\n\n' ||
      '## 14:30  Musée de la Vie Latine（学生街博物館・€5）\n\n' ||
      '実在の博物館です。19世紀後半の学生下宿、参考書、カフェの古ノート、5区の学生街100年史を、ガラスケース1ダースで展示している小さな施設。学生証提示で€2。30分で一周できます。\n\n' ||
      '## 15:15  Café Souterrain de l''Étudiant（地下カフェ）\n\n' ||
      '入口は地味な階段。地下に下りるとアーチ天井の煉瓦造り、雨音は完全に消える。コーヒー€2.20、自家製キャロットケーキ€4。ノートを広げて2時間粘っていい雰囲気。Wi-Fi はパスワード制（注文時にもらう）。\n\n' ||
      '## 16:30  Cinémathèque de Quartier（小さな名画座）\n\n' ||
      '5区の路地にある、座席60の名画座。15:00、17:30、20:00の3本立て編成。チケット€7.50。タイミングが合えば17:30からの古いフランス映画を1本。合わなければロビーで本を読むだけでもいい、それを許してくれる場所。',
    'https://picsum.photos/seed/locore-sample-itin-3/960/640',
    1200,
    'published'::article_status,
    ARRAY['雨の日', 'カルチエラタン', '学生街', '古書', 'インドア']::text[],
    'half_day'::article_duration,
    'itinerary'::article_type,
    '2026-04-27T13:00:00Z'::timestamptz,
    $$[
      {"id":"tmp-3-1","startTime":"13:00","endTime":"13:50","spotId":null,"freeName":"Librairie Le Pont Traversé","notes":"ガリマール白の古書 €4〜。入口の儀式を見られたら当たり","transportToNext":"walk","transportNote":"路地伝いに5分。屋根のある側を歩く","travelMinutesAfter":5},
      {"id":"tmp-3-2","startTime":"14:00","endTime":"14:25","spotId":null,"freeName":"Galerie Vivien-Sorbonne の屋根中庭","notes":"アーチ下のベンチで雨音の消える音響を体験","transportToNext":"walk","transportNote":"屋根伝いに4分","travelMinutesAfter":4},
      {"id":"tmp-3-3","startTime":"14:30","endTime":"15:00","spotId":null,"freeName":"Musée de la Vie Latine","notes":"19世紀の学生史。30分で1周。学生証で€2","transportToNext":"walk","transportNote":"5分","travelMinutesAfter":5},
      {"id":"tmp-3-4","startTime":"15:15","endTime":"16:15","spotId":null,"freeName":"Café Souterrain de l'Étudiant","notes":"地下アーチ。コーヒー €2.20。ノート広げて粘る","transportToNext":"walk","transportNote":"7分。脇道を選ぶ","travelMinutesAfter":7},
      {"id":"tmp-3-5","startTime":"16:30","endTime":"18:30","spotId":null,"freeName":"Cinémathèque de Quartier","notes":"60席の名画座。€7.50。観なくてもロビーで本を読む選択肢","transportToNext":null,"transportNote":null,"travelMinutesAfter":null}
    ]$$::jsonb,
    true
  )
  RETURNING id
)
INSERT INTO spots (article_id, name, address, location, category, price_estimate, tags, position, is_sample)
SELECT id, v.name, v.address, ('SRID=4326;POINT(' || v.lng || ' ' || v.lat || ')')::geography,
       v.category::spot_category, v.price_estimate, v.tags, v.position, true
FROM new_article,
     (VALUES
       ('Librairie Le Pont Traversé', 'Rue de la Sorbonne, 75005 Paris',          2.3431::float, 48.8489::float, 'shopping', '€4〜', ARRAY['古書','文芸']::text[], 0),
       ('Galerie Vivien-Sorbonne',    'Rue Saint-Jacques, 75005 Paris',           2.3439, 48.8472, 'sight',    '無料',  ARRAY['建築','中庭']::text[], 1),
       ('Musée de la Vie Latine',     'Rue des Écoles, 75005 Paris',              2.3456, 48.8502, 'sight',    '€5',    ARRAY['博物館','学生街']::text[], 2),
       ('Café Souterrain de l''Étudiant','Rue de la Montagne Sainte-Geneviève, 75005 Paris', 2.3478, 48.8478, 'food', '€2〜€8', ARRAY['カフェ','地下']::text[], 3),
       ('Cinémathèque de Quartier',   'Rue Mouffetard, 75005 Paris',              2.3501, 48.8430, 'sight',    '€7.50', ARRAY['名画座','映画']::text[], 4)
     ) AS v(name, address, lng, lat, category, price_estimate, tags, position);


-- =============================================================
-- Article 4: 蚤の市 + 古着 + 14区ヴィンテージ
-- writer: junko (Tier S)  /  full_day  /  ヴァンヴ・14区
-- =============================================================
WITH new_article AS (
  INSERT INTO articles (
    id, writer_id, city_id, title, body, body_paid,
    cover_image_url, price_jpy, status, tags,
    duration_type, article_type, published_at,
    itinerary_blocks, is_sample
  )
  VALUES (
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'junko@locore.test'),
    (SELECT id FROM cities WHERE slug = 'paris'),
    '土曜の朝7時、ヴァンヴ蚤の市から14区古着までを歩く「掘り物の動線」',
    E'蚤の市は時間がすべてです。クリニャンクールよりもずっと小さく、業者が少なく、値段が地に足のついたヴァンヴ蚤の市は、土曜の朝7時に行くために存在しています。\n\n' ||
      'この記事は、ヴァンヴで朝の2時間を使い切ったあと、そのまま14区の古着街、モンパルナス裏のヴィンテージ家具屋へと「掘り物の動線」をつないだ1日コースです。3拠点目までは買ったものを抱えて歩くので、リュック必須。最後は地元住民しか知らない小さなビストロで疲れを抜きます。',
    E'## 07:00  Marché aux Puces de Vanves（14区南）\n\n' ||
      'メトロ13号線 Porte de Vanves から徒歩2分。土日のみ、7時に最初の業者が並び始めます。最初の30分が一番いい、というのは本当で、ロワール地方から来る老夫婦のテーブルに、19世紀の銀のサラダフォーク 6本セット€18 みたいなものが混ざっています。\n\n' ||
      '値切るときは「Je peux faire X ?」と切る。25%引きが慣例。\n\n' ||
      '## 09:30  Café des Puces Vanves（市場の端）\n\n' ||
      '蚤の市の端の角にある、業者が朝食を取るカフェ。café crème €2 と croque-madame €6。隣の業者と話せる距離。今日の出物の話を聞ける。\n\n' ||
      '## 10:30  Rue Daguerre の古着街（14区中央）\n\n' ||
      'Daguerre は歩行者天国の生鮮市場通りとして有名ですが、その裏に古着 3 軒、80年代古書 1 軒、リネン専門 1 軒が並ぶ細い枝道があります。とくに「Rétro Daguerre」のリネンシャツは €15〜、状態の見極めができれば最強。\n\n' ||
      '## 12:30  ランチ：Le Bistrot de Pernety（14区裏）\n\n' ||
      '土曜だけ昼12時から営業の小さなビストロ。Plat du jour €14。古着の戦利品を椅子の下に押し込んで、ピシェの白ワイン1/4で疲れを抜く。\n\n' ||
      '## 14:30  Atelier Vintage Edgar-Quinet（14区北・ヴィンテージ家具）\n\n' ||
      'モンパルナス墓地の南側、職人の工房を兼ねた家具屋。1950年代のフランス製スツール €120〜、真鍮の燭台 €40〜。「触ってもいい？」と一言聞けば、椅子のクッションを開けて中の馬毛まで見せてくれる。\n\n' ||
      '## 16:00  Café Atelier 21（14区西・締め）\n\n' ||
      'もとは木工アトリエだったカフェ。天井が4mあり、買ったものを大きなテーブルに並べてゆっくり眺められる、戦利品確認の場所として最適。コーヒーと自家製タルトで€6。',
    'https://picsum.photos/seed/locore-sample-itin-4/960/640',
    2200,
    'published'::article_status,
    ARRAY['蚤の市', 'ヴァンヴ', '古着', 'ヴィンテージ', '14区']::text[],
    'full_day'::article_duration,
    'itinerary'::article_type,
    '2026-05-04T07:00:00Z'::timestamptz,
    $$[
      {"id":"tmp-4-1","startTime":"07:00","endTime":"09:15","spotId":null,"freeName":"Marché aux Puces de Vanves","notes":"7時の最初の30分が勝負。Je peux faire X ? で25%値切る","transportToNext":"walk","transportNote":"市場の端へ3分","travelMinutesAfter":3},
      {"id":"tmp-4-2","startTime":"09:30","endTime":"10:15","spotId":null,"freeName":"Café des Puces Vanves","notes":"業者と同席。今日の出物情報を聞く","transportToNext":"metro","transportNote":"Métro 13号線（Porte de Vanves → Pernety）8分","travelMinutesAfter":12},
      {"id":"tmp-4-3","startTime":"10:30","endTime":"12:15","spotId":null,"freeName":"Rue Daguerre 裏の古着3軒","notes":"Rétro Daguerre のリネンシャツ €15〜。状態見極めが命","transportToNext":"walk","transportNote":"6分","travelMinutesAfter":6},
      {"id":"tmp-4-4","startTime":"12:30","endTime":"13:45","spotId":null,"freeName":"Le Bistrot de Pernety","notes":"Plat du jour €14。ピシェ白で疲れを抜く","transportToNext":"walk","transportNote":"墓地の縁を北に12分","travelMinutesAfter":12},
      {"id":"tmp-4-5","startTime":"14:30","endTime":"15:45","spotId":null,"freeName":"Atelier Vintage Edgar-Quinet","notes":"50年代フランス製スツール €120〜。質問すれば中構造まで見せてくれる","transportToNext":"walk","transportNote":"10分","travelMinutesAfter":10},
      {"id":"tmp-4-6","startTime":"16:00","endTime":"17:00","spotId":null,"freeName":"Café Atelier 21","notes":"天井4mのアトリエカフェで戦利品を広げる","transportToNext":null,"transportNote":null,"travelMinutesAfter":null}
    ]$$::jsonb,
    true
  )
  RETURNING id
)
INSERT INTO spots (article_id, name, address, location, category, price_estimate, tags, position, is_sample)
SELECT id, v.name, v.address, ('SRID=4326;POINT(' || v.lng || ' ' || v.lat || ')')::geography,
       v.category::spot_category, v.price_estimate, v.tags, v.position, true
FROM new_article,
     (VALUES
       ('Marché aux Puces de Vanves', 'Av. Georges Lafenestre, 75014 Paris',  2.3015::float, 48.8323::float, 'shopping', '€5〜', ARRAY['蚤の市','土日']::text[], 0),
       ('Café des Puces Vanves',      'Av. Marc Sangnier, 75014 Paris',        2.3024, 48.8329, 'food',     '€2〜€8', ARRAY['朝食','カフェ']::text[], 1),
       ('Rétro Daguerre',             'Rue Daguerre, 75014 Paris',             2.3271, 48.8344, 'shopping', '€15〜', ARRAY['古着','リネン']::text[], 2),
       ('Le Bistrot de Pernety',      'Rue Raymond Losserand, 75014 Paris',    2.3209, 48.8334, 'food',     '€14〜', ARRAY['ビストロ','ランチ']::text[], 3),
       ('Atelier Vintage Edgar-Quinet','Bd Edgar Quinet, 75014 Paris',         2.3265, 48.8404, 'shopping', '€40〜€500', ARRAY['ヴィンテージ','家具']::text[], 4),
       ('Café Atelier 21',            'Rue Pernety, 75014 Paris',              2.3175, 48.8345, 'food',     '€4〜€8', ARRAY['カフェ','アトリエ']::text[], 5)
     ) AS v(name, address, lng, lat, category, price_estimate, tags, position);


-- =============================================================
-- Article 5: 11区ナチュラルワインバー巡り
-- writer: yuto (Tier A)  /  half_day  /  11区
-- =============================================================
WITH new_article AS (
  INSERT INTO articles (
    id, writer_id, city_id, title, body, body_paid,
    cover_image_url, price_jpy, status, tags,
    duration_type, article_type, published_at,
    itinerary_blocks, is_sample
  )
  VALUES (
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'yuto@locore.test'),
    (SELECT id FROM cities WHERE slug = 'paris'),
    '11区オベルカンフ、ナチュラルワインだけで歩く18時から24時のコース',
    E'パリのナチュラルワインの中心は、いま11区のオベルカンフ周辺に集まっています。bar à vin、cave à manger、wine geek が集う 立ち飲み、それぞれ性格の違う4軒を、18時から24時までゆっくり1軒ずつ移動して、ボトル換算で1本分くらいを6時間に伸ばすコースです。\n\n' ||
      '「酔うため」ではなく「読み比べるため」の夜。各店の選書（ワインリスト）の癖、グラスの形、合わせる小皿の正解を、書ける範囲で書きました。',
    E'## 18:00  Septime Cave（11区・最有名店の隣）\n\n' ||
      'ミシュラン店 Septime の隣にあるワインショップ兼立ち飲み。18時の開店直後は地元住民しかいません。Loire の Chenin を1杯€7、合わせて小皿のリエット €6。\n\n' ||
      '常連の流儀は「最初の1杯は店主の une surprise（おまかせ）」と頼むこと。今日のコンディションのいいボトルを開けてくれる。\n\n' ||
      '## 19:15  La Cave de l''Ours Brun（11区・路地裏）\n\n' ||
      '路地の奥の窓のないワインバー。Jura のヴァン・ジョーヌ系を多く扱う。グラス€9、Comté の盛り合わせ€11。店主は元エンジニア、ワインの「酸の硬さ」の話をすると延々と続けてくれる。\n\n' ||
      '## 20:45  Le Verre Volé Auberge（11区・運河側）\n\n' ||
      '本店は10区だが、11区の運河寄りに小さな姉妹店があります。こちらの方が混雑が緩く、料理の単価も低い。Plat du jour €18 と、もう1杯（Beaujolais 系のガメイ）。ここで腹を埋める。\n\n' ||
      '## 22:30  L''Atelier Soif（11区・深夜）\n\n' ||
      '深夜2時まで開く立ち飲みのみのワインバー。客層は半分が業界人。グラス€8、最後の1杯は「軽い赤、酸」と注文すると4本くらいから選ばせてくれる。\n\n' ||
      '## 23:45  〆：Bouillon de Nuit（11区西・夜食）\n\n' ||
      'ワインを飲み切ったあとの〆として、深夜の bouillon（牛骨スープ）€4.50。お粥のような優しさ。',
    'https://picsum.photos/seed/locore-sample-itin-5/960/640',
    1900,
    'published'::article_status,
    ARRAY['ナチュラルワイン', '11区', 'オベルカンフ', '夜', 'ワインバー']::text[],
    'half_day'::article_duration,
    'itinerary'::article_type,
    '2026-04-30T18:00:00Z'::timestamptz,
    $$[
      {"id":"tmp-5-1","startTime":"18:00","endTime":"19:00","spotId":null,"freeName":"Septime Cave","notes":"Loire Chenin €7。最初の1杯は une surprise で頼む","transportToNext":"walk","transportNote":"8分。Charonne 通りを北西へ","travelMinutesAfter":8},
      {"id":"tmp-5-2","startTime":"19:15","endTime":"20:30","spotId":null,"freeName":"La Cave de l'Ours Brun","notes":"Jura ヴァン・ジョーヌ €9 + Comté €11。店主と酸の話をする","transportToNext":"walk","transportNote":"運河寄りに北上12分","travelMinutesAfter":12},
      {"id":"tmp-5-3","startTime":"20:45","endTime":"22:15","spotId":null,"freeName":"Le Verre Volé Auberge","notes":"Plat du jour €18 でしっかり食べる。Beaujolais ガメイ系","transportToNext":"metro","transportNote":"Métro 9号線（Saint-Ambroise → Voltaire）6分","travelMinutesAfter":12},
      {"id":"tmp-5-4","startTime":"22:30","endTime":"23:30","spotId":null,"freeName":"L'Atelier Soif","notes":"立ち飲み深夜営業。「軽い赤、酸」と注文すると4本から選ばせる","transportToNext":"walk","transportNote":"10分","travelMinutesAfter":10},
      {"id":"tmp-5-5","startTime":"23:45","endTime":"24:15","spotId":null,"freeName":"Bouillon de Nuit","notes":"〆の牛骨スープ €4.50。お粥的","transportToNext":null,"transportNote":null,"travelMinutesAfter":null}
    ]$$::jsonb,
    true
  )
  RETURNING id
)
INSERT INTO spots (article_id, name, address, location, category, price_estimate, tags, position, is_sample)
SELECT id, v.name, v.address, ('SRID=4326;POINT(' || v.lng || ' ' || v.lat || ')')::geography,
       v.category::spot_category, v.price_estimate, v.tags, v.position, true
FROM new_article,
     (VALUES
       ('Septime Cave',              'Rue Basfroi, 75011 Paris',          2.3793::float, 48.8538::float, 'food', '€7〜€20', ARRAY['ワイン','natural']::text[], 0),
       ('La Cave de l''Ours Brun',   'Rue de la Roquette, 75011 Paris',   2.3735, 48.8576, 'food', '€9〜€22', ARRAY['ワイン','Jura']::text[], 1),
       ('Le Verre Volé Auberge',     'Rue Oberkampf, 75011 Paris',        2.3753, 48.8645, 'food', '€18〜€30', ARRAY['ワイン','ビストロ']::text[], 2),
       ('L''Atelier Soif',           'Rue Saint-Maur, 75011 Paris',       2.3790, 48.8657, 'food', '€8〜€20', ARRAY['ワイン','深夜']::text[], 3),
       ('Bouillon de Nuit',          'Bd Voltaire, 75011 Paris',          2.3724, 48.8595, 'food', '€4〜€10', ARRAY['深夜','夜食']::text[], 4)
     ) AS v(name, address, lng, lat, category, price_estimate, tags, position);


-- =============================================================
-- Article 6: ヴェルサイユ宮殿 + 城下町歩き  (郊外)
-- writer: junko (Tier S)  /  full_day  /  ヴェルサイユ
-- =============================================================
WITH new_article AS (
  INSERT INTO articles (
    id, writer_id, city_id, title, body, body_paid,
    cover_image_url, price_jpy, status, tags,
    duration_type, article_type, published_at,
    itinerary_blocks, is_sample
  )
  VALUES (
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'junko@locore.test'),
    (SELECT id FROM cities WHERE slug = 'paris'),
    'ヴェルサイユ、宮殿だけで帰らない。サン・ルイ地区から市場までを歩く1日',
    E'ヴェルサイユに日帰りで行く人のほぼ全員が、宮殿と庭園だけ見て帰ります。それは1日のうち最も観光客が密集する場所と時間にあえて行く、ということでもあります。\n\n' ||
      'この記事は、宮殿は午前のラッシュ前に終わらせて、午後はヴェルサイユ市民が普段歩く サン・ルイ地区、ノートルダム市場、王が狩りに通った石畳の道、を組み合わせた、宮殿の「外側」を読む1日です。RER C で行って、最後はビールで締めて帰る、現実的な動線。',
    E'## 08:30  ヴェルサイユ宮殿（開場前の列）\n\n' ||
      'RER C のヴェルサイユ・リヴ・ゴーシュ駅から徒歩10分。9時開場の30分前、8:30に並ぶのが正解。事前にオンラインでチケット (€21) を取っておく。鏡の間は10時以降に団体が入り始めるので、9:15には鏡の間に入って、5分独り占めしてから他の部屋に流れる。\n\n' ||
      '## 11:30  Notre-Dame Marché（市場・€0）\n\n' ||
      '宮殿から徒歩15分、ヴェルサイユ市民の台所。木曜、金曜、日曜の午前のみ。チーズ、シャルキュトリ、農家直送のいちごのバスケット €4。観光客はほぼゼロ。\n\n' ||
      '## 12:30  ランチ：Le Café du Marché（市場併設）\n\n' ||
      '市場の角の地元食堂。Plat du jour €13。市場で買ったチーズをそのまま持ち込んでOKという稀有な店、ワインに€6足すだけで持ち込み料込みの扱いになる。\n\n' ||
      '## 14:00  サン・ルイ地区の石畳と王家のパヴィヨン\n\n' ||
      'Rue Royale から南、宮殿側を背に歩く Quartier Saint-Louis。18世紀の王家の使用人街がそのまま残った地区で、低い石造りの家、緑釉のドアハンドル、傾いた窓。観光地ではないので、住人の洗濯物が普通に窓辺に出ています。途中、Pavillon de Musique de Madame という小さな別邸（€7）。\n\n' ||
      '## 15:30  Potager du Roi（王の菜園・€4.50）\n\n' ||
      '17世紀から続く、宮殿に野菜を納めた菜園。いまも稼働中の農場兼研究施設で、果樹の剪定が18世紀のままの技法で残っている。林檎の壁面仕立てがとくに面白い。\n\n' ||
      '## 17:00  Brasserie La Lanterne（駅前ブラッスリー・締め）\n\n' ||
      'ヴェルサイユ・リヴ・ゴーシュ駅前の地元ブラッスリー。地ビール（Brasserie de Versailles）€6 と、フリットの大皿€8。RER に乗る前にここで30分。歩き疲れた足の温度がちょうど落ちる時間。',
    'https://picsum.photos/seed/locore-sample-itin-6/960/640',
    2600,
    'published'::article_status,
    ARRAY['ヴェルサイユ', '郊外', '日帰り', '宮殿', '市場']::text[],
    'full_day'::article_duration,
    'itinerary'::article_type,
    '2026-05-06T08:30:00Z'::timestamptz,
    $$[
      {"id":"tmp-6-1","startTime":"08:30","endTime":"11:00","spotId":null,"freeName":"ヴェルサイユ宮殿","notes":"9時開場の30分前に並ぶ。鏡の間は9:15に入って5分独り占め","transportToNext":"walk","transportNote":"宮殿前広場を抜けて市場まで15分","travelMinutesAfter":15},
      {"id":"tmp-6-2","startTime":"11:30","endTime":"12:15","spotId":null,"freeName":"Marché Notre-Dame","notes":"木金日のみ。チーズと農家いちご €4。観光客ゼロ","transportToNext":"walk","transportNote":"市場併設のカフェへ2分","travelMinutesAfter":2},
      {"id":"tmp-6-3","startTime":"12:30","endTime":"13:45","spotId":null,"freeName":"Le Café du Marché","notes":"Plat du jour €13。市場のチーズ持ち込みOK","transportToNext":"walk","transportNote":"サン・ルイ地区へ徒歩10分","travelMinutesAfter":10},
      {"id":"tmp-6-4","startTime":"14:00","endTime":"15:15","spotId":null,"freeName":"Quartier Saint-Louis + Pavillon de Musique","notes":"18世紀の使用人街。Pavillon de Musique €7","transportToNext":"walk","transportNote":"南へ8分。緑釉のドアを見ながら","travelMinutesAfter":8},
      {"id":"tmp-6-5","startTime":"15:30","endTime":"16:45","spotId":null,"freeName":"Potager du Roi","notes":"17世紀からの王の菜園。€4.50。林檎の壁面仕立て","transportToNext":"walk","transportNote":"駅方向に15分","travelMinutesAfter":15},
      {"id":"tmp-6-6","startTime":"17:00","endTime":"18:00","spotId":null,"freeName":"Brasserie La Lanterne","notes":"駅前ブラッスリーで地ビール €6 とフリット。30分で締め","transportToNext":"train","transportNote":"RER C ヴェルサイユ・リヴ・ゴーシュ駅からパリへ約40分","travelMinutesAfter":40}
    ]$$::jsonb,
    true
  )
  RETURNING id
)
INSERT INTO spots (article_id, name, address, location, category, price_estimate, tags, position, is_sample)
SELECT id, v.name, v.address, ('SRID=4326;POINT(' || v.lng || ' ' || v.lat || ')')::geography,
       v.category::spot_category, v.price_estimate, v.tags, v.position, true
FROM new_article,
     (VALUES
       ('ヴェルサイユ宮殿',           'Place d''Armes, 78000 Versailles',     2.1204::float, 48.8049::float, 'sight',    '€21',   ARRAY['宮殿','ヴェルサイユ','郊外']::text[], 0),
       ('Marché Notre-Dame',         'Place du Marché Notre-Dame, 78000 Versailles', 2.1326, 48.8042, 'shopping', '€0〜',  ARRAY['市場','地元']::text[], 1),
       ('Le Café du Marché',         'Place du Marché Notre-Dame, 78000 Versailles', 2.1329, 48.8043, 'food',     '€13〜', ARRAY['ランチ','地元']::text[], 2),
       ('Pavillon de Musique de Madame','Av. de Paris, 78000 Versailles',   2.1346, 48.8016, 'sight',    '€7',    ARRAY['18世紀','建築']::text[], 3),
       ('Potager du Roi',            '10 Rue du Maréchal Joffre, 78000 Versailles', 2.1233, 48.7984, 'sight',    '€4.50', ARRAY['庭園','農園']::text[], 4),
       ('Brasserie La Lanterne',     'Av. du Général de Gaulle, 78000 Versailles',  2.1310, 48.8004, 'food',     '€6〜€18', ARRAY['ブラッスリー','駅前']::text[], 5)
     ) AS v(name, address, lng, lat, category, price_estimate, tags, position);


-- =============================================================
-- Article 7: ジヴェルニー + ヴェルノン町  (郊外)
-- writer: haruka (Tier B)  /  full_day  /  ジヴェルニー
-- =============================================================
WITH new_article AS (
  INSERT INTO articles (
    id, writer_id, city_id, title, body, body_paid,
    cover_image_url, price_jpy, status, tags,
    duration_type, article_type, published_at,
    itinerary_blocks, is_sample
  )
  VALUES (
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'haruka@locore.test'),
    (SELECT id FROM cities WHERE slug = 'paris'),
    'ジヴェルニー、モネの庭の前後にヴェルノンの町を歩く半日＋αの1日',
    E'モネの庭（ジヴェルニー）は1時間半で見終わります。問題は、そのために朝6時に起きてサン・ラザール駅からヴェルノン駅まで往復約3時間、シャトルバス込みで丸1日を使うことです。\n\n' ||
      'この記事は、庭そのものよりも、その前後の「ヴェルノンという小さな町」をどう歩いて、どこで昼を食べて、どのタイミングで庭に入るのが空いているか、を組み立てた1日コースです。私は学生で予算がないので、ガイドツアーは使わず、SNCF と地元バスとリュックで動きます。',
    E'## 08:20  Gare Saint-Lazare → Vernon-Giverny（SNCF・€18往復）\n\n' ||
      '8:20発の Rouen 方面行きに乗る。50分でヴェルノン駅。週末はかなり混むので、座席は窓側右を取ると、Eure 川沿いの景色が見える。\n\n' ||
      '## 09:30  ヴェルノン旧市街の朝散歩（30分）\n\n' ||
      '駅から徒歩7分、Église Notre-Dame の前。16世紀の木骨造の家が10軒ほど残っている地区。観光客はバスで直接ジヴェルニーに向かうので、朝の旧市街は完全に空いています。コロンバージュ（木骨）の角度を30分ぼーっと見るだけでいい。\n\n' ||
      '## 10:00  シャトルバス（往復€10）→ ジヴェルニーへ\n\n' ||
      '駅前から Givet 方面シャトル。乗車約20分。11時前にジヴェルニー到着が目標。\n\n' ||
      '## 11:00  Fondation Claude Monet（モネの庭・€11）\n\n' ||
      '本気の混雑は12時から。11時に入って12時に出る、この1時間が一番空いている。睡蓮の池は橋を渡る前に、池の北東角から30秒だけ立ち止まる。あの「Nymphéas」の構図がこの角度です。\n\n' ||
      '## 12:30  ランチ：Auberge du Vieux Moulin（ジヴェルニー村中）\n\n' ||
      '村の中の小さな宿屋兼レストラン。Plat du jour €16。Eure 川支流のせせらぎが店の裏を流れていて、テラス席なら 川の音を聞きながら食べられる。\n\n' ||
      '## 14:30  Musée des Impressionnismes（印象派美術館・€8.50）\n\n' ||
      'モネの庭から徒歩5分。観光客はモネの庭で満足して帰るので、こちらは半分以下の入り。印象派以後の小品コレクションがとても良く、企画展のレベルが高い。\n\n' ||
      '## 16:00  ヴェルノンの川辺（古い水車）\n\n' ||
      'シャトルでヴェルノンに戻り、川向こうの「Vieux Moulin（古い水車）」を見に行く。中世の橋桁の上に16世紀の木造水車が乗った珍しい構造物。橋からの距離20mで、無料。\n\n' ||
      '## 17:30  駅近カフェ：Le Café de l''Eure（締め）\n\n' ||
      '駅から徒歩3分。地ビール €5、自家製クグロフ €4。18:15 発でパリに戻る。帰りの車内で1日を整理する時間まで含めて、ジヴェルニー日帰りです。',
    'https://picsum.photos/seed/locore-sample-itin-7/960/640',
    2300,
    'published'::article_status,
    ARRAY['ジヴェルニー', 'ヴェルノン', '郊外', '日帰り', '印象派']::text[],
    'full_day'::article_duration,
    'itinerary'::article_type,
    '2026-04-26T08:00:00Z'::timestamptz,
    $$[
      {"id":"tmp-7-1","startTime":"08:20","endTime":"09:20","spotId":null,"freeName":"Gare Saint-Lazare → Vernon-Giverny","notes":"SNCF Rouen 方面 8:20発。窓側右が川景色","transportToNext":"walk","transportNote":"ヴェルノン駅から旧市街へ7分","travelMinutesAfter":10},
      {"id":"tmp-7-2","startTime":"09:30","endTime":"09:55","spotId":null,"freeName":"ヴェルノン旧市街 & Église Notre-Dame","notes":"16世紀の木骨造家屋10軒。観光客がいない朝のうちに","transportToNext":"bus","transportNote":"駅前 Givet 方面シャトル20分（€10往復）","travelMinutesAfter":25},
      {"id":"tmp-7-3","startTime":"11:00","endTime":"12:15","spotId":null,"freeName":"Fondation Claude Monet（モネの庭）","notes":"11時の1時間が空く。池の北東角からの構図に注目","transportToNext":"walk","transportNote":"村中まで徒歩8分","travelMinutesAfter":8},
      {"id":"tmp-7-4","startTime":"12:30","endTime":"13:50","spotId":null,"freeName":"Auberge du Vieux Moulin","notes":"Plat du jour €16。裏のせせらぎ席を狙う","transportToNext":"walk","transportNote":"5分","travelMinutesAfter":5},
      {"id":"tmp-7-5","startTime":"14:30","endTime":"15:45","spotId":null,"freeName":"Musée des Impressionnismes","notes":"€8.50。モネ以後の小品が良い。混雑半減","transportToNext":"bus","transportNote":"シャトルでヴェルノンへ戻る20分","travelMinutesAfter":25},
      {"id":"tmp-7-6","startTime":"16:00","endTime":"16:45","spotId":null,"freeName":"Vieux Moulin de Vernon","notes":"中世橋桁上の16世紀木造水車。橋から20m、無料","transportToNext":"walk","transportNote":"駅方向に10分","travelMinutesAfter":10},
      {"id":"tmp-7-7","startTime":"17:30","endTime":"18:10","spotId":null,"freeName":"Le Café de l'Eure","notes":"地ビール €5、自家製クグロフ。18:15 発でパリへ","transportToNext":"train","transportNote":"SNCF Vernon → Saint-Lazare 約50分","travelMinutesAfter":50}
    ]$$::jsonb,
    true
  )
  RETURNING id
)
INSERT INTO spots (article_id, name, address, location, category, price_estimate, tags, position, is_sample)
SELECT id, v.name, v.address, ('SRID=4326;POINT(' || v.lng || ' ' || v.lat || ')')::geography,
       v.category::spot_category, v.price_estimate, v.tags, v.position, true
FROM new_article,
     (VALUES
       ('Église Notre-Dame de Vernon', 'Place Barette, 27200 Vernon',              1.4845::float, 49.0931::float, 'sight',    '無料',   ARRAY['教会','木骨造']::text[], 0),
       ('Fondation Claude Monet',      '84 Rue Claude Monet, 27620 Giverny',       1.5345, 49.0758, 'sight',    '€11',   ARRAY['庭園','モネ']::text[], 1),
       ('Auberge du Vieux Moulin',     'Rue Claude Monet, 27620 Giverny',          1.5342, 49.0762, 'food',     '€16〜', ARRAY['ランチ','村']::text[], 2),
       ('Musée des Impressionnismes',  '99 Rue Claude Monet, 27620 Giverny',       1.5325, 49.0769, 'sight',    '€8.50', ARRAY['美術館','印象派']::text[], 3),
       ('Vieux Moulin de Vernon',      'Rue du Pont, 27200 Vernon',                1.4870, 49.0938, 'sight',    '無料',   ARRAY['水車','中世']::text[], 4),
       ('Le Café de l''Eure',          'Place de la Gare, 27200 Vernon',           1.4839, 49.0926, 'food',     '€4〜€10', ARRAY['駅前','カフェ']::text[], 5)
     ) AS v(name, address, lng, lat, category, price_estimate, tags, position);


COMMIT;
