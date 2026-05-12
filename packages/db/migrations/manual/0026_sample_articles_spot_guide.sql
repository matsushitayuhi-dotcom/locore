-- 0026_sample_articles_spot_guide.sql
-- パリのスポット紹介記事 3 本のサンプルシード。
-- writer_id / city_id は (SELECT ... FROM ...) で動的に解決。
-- 価格・タグ・公開日はテストデータとして散らしてある。
--
-- 構成:
--   1. じゅんこ (Tier S, 在仏12年) — 13区イタリア人街の老舗食堂
--   2. ゆうと   (Tier A, 20区5年)  — 19区ビュット・ショーモン裏のアフリカ食材街
--   3. はるか   (Tier B, 1年)      — 6区サンジェルマンの学生街・古書文房具
--
-- 全行 is_sample = true。`DELETE FROM articles WHERE is_sample = true`
-- でロールバック可能（spots は ON DELETE CASCADE 想定）。

BEGIN;

-- ============================================================
-- 記事 1: じゅんこ / 13区イタリア人街 / spot_guide
-- ============================================================
WITH inserted_article AS (
  INSERT INTO articles (
    writer_id,
    city_id,
    title,
    body,
    body_paid,
    cover_image_url,
    price_jpy,
    status,
    tags,
    duration_type,
    article_type,
    published_at,
    is_sample
  )
  VALUES (
    (SELECT id FROM users WHERE email = 'junko@locore.test'),
    (SELECT id FROM cities WHERE slug = 'paris'),
    '13区トルビアック奥の「もう一つのイタリア」— パリで一番静かなトラットリア4軒',
    '13区というとアジア街の印象が強いが、トルビアック通りから一本南に入ると、戦後ピエモンテやカラブリアから移ってきた移民の家族が代を継いだ食堂が点々と残っている。看板は出ていないか、出ていても小さく、店主はだいたい仕込みの途中で電話を取る。

メニューはイタリア語が先、フランス語は手書きの紙が後から貼られる。値段は12〜18ユーロ。13区のこの一角だけは、いまだに「シェフ」ではなく「うちのおやじ」が厨房に立っている空気がある。

この記事では、私が12年通って常連扱いされている4軒を、行く曜日と頼むべき一皿、そして「グラスワインを断られない座り方」まで含めて紹介する。観光ガイドには載っていない、けれど水曜の夜8時に行けば必ず席が埋まっている店ばかり。',
    '## 各スポット詳細

### 1. Trattoria del Vecchio Mario — カラブリア家庭料理の砦
店主のマリオは1971年にカラブリアのコゼンツァから来た。店は90年代に息子のアントニオが継いでいるが、ランチタイムだけはまだマリオが厨房に立つ。看板メニューは「`nduja`（豚の発酵サラミ）入りの自家製キャヴァテッリ」。辛さは中レベルで頼むのがベスト、「ピカンテ」と言うとアントニオが満面の笑みで限界まで効かせてくる。

水・木の夜が一番落ち着く。金曜は近所のオフィスの常連で18時半には満席。テーブル席ではなくカウンター席を希望すると、グラスでアリアニコを開けてくれる確率が上がる。注意点として、クレジットカードは使えるが、現金で払うとデザートのリモンチェッロが1杯サービスになる古典的な暗黙ルールがある。

### 2. Osteria Piemonte — 戦後パリ移民史の生き証人
入口は本当に分かりにくい。ガラス窓に Osteria の文字すらない年があった。中に入ると壁一面にトリノ・ユヴェントスの古いポスターが貼られていて、奥にダイニングが12席だけ。

頼むべきは「ヴィテッロ・トンナート」(冷たい仔牛のツナソースがけ)とリゾット・アル・バローロ。リゾットはオーダーから30分以上かかると最初に告げられるが、待つ価値がある。バローロをワインとして注文すると、米に使うのと同じ瓶からグラスに注いでくれる。これが楽しい。

予約は電話のみ、しかも仏語かイタリア語。じゅんこ調べでは、火曜19時に電話すると一番つながりやすい。

### 3. Pasticceria Romana Bianchi — 朝7時に開く「裏」パン屋
食堂ではないが外せない。13区イタリア人街の人たちが日曜朝に集まる、ローマ式の小さなパスティッチェリア。コルネットはバター系とラード系の両方があって、後者は売り切れが早い。8時には消える。

ここの真価はカウンターで立ち飲みするエスプレッソとマリトッツォ(ホイップ入り菓子パン)の組み合わせ。フランスのカフェ・クレームに飽きた朝に行く。常連は「ウン・カフェ」とだけ言う。「アン・カフェ」と仏語で言うとコーヒーは出るが、空気がほんの少し冷たくなる。

### 4. Enoteca Sicilia — ワインバー兼夜の駆け込み寺
22時以降に開いている数少ない店。シチリア出身のフランチェスカが一人で回している。グラスワインが豊富で、3ユーロから9ユーロのレンジでエトナの白からチェラスオーロ・ディ・ヴィットーリアまで揃う。

軽食はチーズと、自家製のカポナータ、それからアランチーニ(ライスコロッケ)のみ。フードを2品以上頼むと、必ずグラッパが食後に出てくる。観光客は来ない。来てもメニューがほぼイタリア語なのですぐ帰る。私は仕事終わりの木曜夜、ここでiPhoneを伏せて1時間だけ過ごす。

---

**実用情報**: いずれもメトロ7号線 Tolbiac から徒歩10分圏内。木曜・金曜の夜が活気のピーク。日曜は4軒中3軒が休みなので注意。',
    'https://picsum.photos/seed/locore-sample-1/960/640',
    1300,
    'published',
    ARRAY['13区', 'イタリアン', '老舗', '夜ごはん', '移民食堂'],
    'half_day',
    'spot_guide',
    '2026-05-09T18:00:00+02:00',
    true
  )
  RETURNING id
)
INSERT INTO spots (article_id, name, address, location, category, position, is_sample)
SELECT id, 'Trattoria del Vecchio Mario', 'Rue de Tolbiac 142, 75013 Paris',
       'SRID=4326;POINT(2.3611 48.8278)'::geography, 'food', 0, true
FROM inserted_article
UNION ALL
SELECT id, 'Osteria Piemonte', 'Rue Bobillot 48, 75013 Paris',
       'SRID=4326;POINT(2.3528 48.8244)'::geography, 'food', 1, true
FROM inserted_article
UNION ALL
SELECT id, 'Pasticceria Romana Bianchi', 'Rue de la Glaciere 87, 75013 Paris',
       'SRID=4326;POINT(2.3445 48.8302)'::geography, 'food', 2, true
FROM inserted_article
UNION ALL
SELECT id, 'Enoteca Sicilia', 'Rue du Moulin des Pres 34, 75013 Paris',
       'SRID=4326;POINT(2.3552 48.8261)'::geography, 'food', 3, true
FROM inserted_article;

-- ============================================================
-- 記事 2: ゆうと / 19区ビュット・ショーモン裏のアフリカ食材街 / spot_guide
-- ============================================================
WITH inserted_article AS (
  INSERT INTO articles (
    writer_id,
    city_id,
    title,
    body,
    body_paid,
    cover_image_url,
    price_jpy,
    status,
    tags,
    duration_type,
    article_type,
    published_at,
    is_sample
  )
  VALUES (
    (SELECT id FROM users WHERE email = 'yuto@locore.test'),
    (SELECT id FROM cities WHERE slug = 'paris'),
    '19区ビュット・ショーモン北側、土曜朝のアフリカ食材ストリート歩き',
    'パリ19区のビュット・ショーモン公園を北に抜けると、ボツワナ通り界隈と地元で呼ばれる小さな商業ゾーンがある。セネガル、コートジボワール、コンゴ系の食材店と惣菜屋が、150メートルほどのなかに集まっている。

土曜の朝9時から正午までがピークで、その時間帯は店先で売られるグリヨ(揚げ豚)やアロコ(揚げバナナ)の香りが街区を覆う。観光客は来ない。地元住民、特に近所のアフリカ系コミュニティと、味を知っている20区在住の僕みたいな日本人が混じる。

この記事は、5年通って分かった「最初の一軒目」「持ち帰り向きの店」「店主と話せる時間帯」を整理したもの。サブサハラ料理の入門としても機能する。',
    '## 各スポット詳細

### 1. Chez Aminata — 開店15分でいつも行列のセネガル食堂
看板に Restaurant Senegalais とだけ書いてある古い店。木曜と土曜のランチがチェブジェン(魚と米の炊き込み)で、これがパリ最高峰だと近所のセネガル人が口を揃える。

午後12時の開店と同時に並ぶこと。15分後には地元の常連で満席になり、12時45分にはチェブジェンが売り切れている。値段は12ユーロ、テイクアウトなら10ユーロ。アミナタは仏語と日本語の単語をいくつか覚えていて、僕が行くと「ユウト、米多めね」と言ってくれる。

### 2. Epicerie Le Manguier — マンゴーと干物の食材店
入口にケニア産のドライマンゴーが箱で積まれている。中はキャッサバ粉、パーム油、ピリピリ(辛唐辛子)、フマック、それから干し魚が天井から吊られている。匂いが強烈なので心の準備をしてから入る。

店主のアダマは午前10時〜11時の間が一番話しやすい。11時を過ぎると土曜の買い物客で店内が動けなくなる。日本人がここで買う価値があるのは、安いパーム油(500mlで4ユーロ前後)、フランス本土では珍しいスコッチボネット唐辛子の生、それから自家製のスパイスミックス「ヤッサ」。

### 3. La Cantine de Brazza — コンゴ料理の隠れ家
階段を半階上がった2階にある。看板はなく、ドアの横に手書きで「Brazza」とだけ。店内は8席。フムビュ(キャッサバの葉と燻製魚の煮込み)を頼むとチョコレートのような深い苦味と燻製香で、ビールが止まらなくなる。

土曜の夜が一番混む。昼は予約なしで入れることが多い。ビールは Primus(コンゴのラガー)が3.5ユーロ。店主のジャン=クロードが音楽セレクトしていて、午後はリンガラ・ジャズが小さく流れている。

### 4. Marche aux Epices Dakar — 朝の青空スパイス市
土曜の朝のみ、Rue de Crimee と Rue de Joinville の交差点付近の歩道に、5〜6軒のスパイス売りが出る。朝7時半に出始め、11時には全員撤収する。

ここで買えるのは、量り売りのジンジャーパウダー、ネレ(西アフリカの発酵調味料)、グリーンカルダモン、それからオレンジ色の天然パーム油の小瓶。地元のおばさんたちは毎週通っている。袋持参が必須で、ビニール袋は基本的にくれない。価格交渉は軽くしてもらえる程度、強くは下がらない。

### 5. Cafe La Goutte — 散歩の終わりの一杯
ストリートを歩き終えたあとの休憩用。ピュエルトリコ系の若者がやっているカフェで、エスプレッソが2ユーロ、コートジボワール産のカカオを使ったホットチョコレートが3.5ユーロ。窓際の席に座ると、19区の住民が買い物袋を提げて歩く風景がよく見える。

---

**実用情報**: メトロ7bis Botzaris から徒歩6分、または5号線 Laumiere から徒歩10分。土曜午前が情報密度のピーク。冬は8時前は店も市も出ていないので、9時以降に到着するのが無難。',
    'https://picsum.photos/seed/locore-sample-2/960/640',
    1100,
    'published',
    ARRAY['19区', 'アフリカ', '食材店', '土曜朝', 'ローカル'],
    'half_day',
    'spot_guide',
    '2026-05-04T09:00:00+02:00',
    true
  )
  RETURNING id
)
INSERT INTO spots (article_id, name, address, location, category, position, is_sample)
SELECT id, 'Chez Aminata', 'Rue de Crimee 215, 75019 Paris',
       'SRID=4326;POINT(2.3878 48.8881)'::geography, 'food', 0, true
FROM inserted_article
UNION ALL
SELECT id, 'Epicerie Le Manguier', 'Rue de Joinville 23, 75019 Paris',
       'SRID=4326;POINT(2.3856 48.8895)'::geography, 'shopping', 1, true
FROM inserted_article
UNION ALL
SELECT id, 'La Cantine de Brazza', 'Avenue de Flandre 132, 75019 Paris',
       'SRID=4326;POINT(2.3791 48.8902)'::geography, 'food', 2, true
FROM inserted_article
UNION ALL
SELECT id, 'Marche aux Epices Dakar', 'Rue de Crimee x Rue de Joinville, 75019 Paris',
       'SRID=4326;POINT(2.3862 48.8889)'::geography, 'shopping', 3, true
FROM inserted_article
UNION ALL
SELECT id, 'Cafe La Goutte', 'Avenue Jean Jaures 178, 75019 Paris',
       'SRID=4326;POINT(2.3823 48.8866)'::geography, 'food', 4, true
FROM inserted_article;

-- ============================================================
-- 記事 3: はるか / 6区サンジェルマン学生街 / spot_guide
-- ============================================================
WITH inserted_article AS (
  INSERT INTO articles (
    writer_id,
    city_id,
    title,
    body,
    body_paid,
    cover_image_url,
    price_jpy,
    status,
    tags,
    duration_type,
    article_type,
    published_at,
    is_sample
  )
  VALUES (
    (SELECT id FROM users WHERE email = 'haruka@locore.test'),
    (SELECT id FROM cities WHERE slug = 'paris'),
    '6区サンジェルマン、ソルボンヌの学生が今でも通う紙と本と教会の小さな順路',
    '6区サンジェルマン・デ・プレといえば観光客のイメージが強いが、実はソルボンヌ大学とパリ第3大学の学生街でもある。観光通りから一本入ると、学生相手の文房具屋、何代目かの古書店、午前中だけ開いている小さな教会がいまも残っている。

私はパリに来て1年目、語学学校がこのエリアにあって、毎週この界隈を歩いた。観光客が消える平日午後3時から夕方の数時間、6区は学生の街に戻る。シャッターが半分閉まった文房具屋でロディアのノートを買い、古書店で1ユーロのペーパーバックを掘り、最後に静かな教会のベンチで一息つく、というのが私の定番ルート。

この記事は、その平日午後の小さな順路を、徒歩30分以内にまとめたもの。',
    '## 各スポット詳細

### 1. Papeterie Saint-Sulpice — 1948年創業、学生のための文房具店
サン=シュルピス教会の真裏。創業者の孫の世代が継いでいて、店内は照明が暗めだが、棚にロディア、クレールフォンテーヌ、エルバンのインク瓶がぎっしり並ぶ。観光客向けの土産店ではなく、近所のソルボンヌの学生が試験前にノートを買いに来る本気の文房具店。

私が必ず買うのはクレールフォンテーヌのA5方眼ノート(4.5ユーロ)と、エルバンの「Bleu Myosotis」の小瓶インク(6ユーロ)。店主のマダム・ベルナデットは万年筆の話を始めると30分止まらないので、午後3時以降の閉店間際は要注意。火曜は休み。

### 2. Librairie du Quartier Latin — 1ユーロ棚が秘宝のカルチエラタン古書店
入口左の外ワゴンに、雨の日以外は1ユーロ均一の棚が出ている。フランス文学のペーパーバックが中心で、ポール・オースターの仏訳やマリーズ・コンデが時々混じっている。日本語が読めない私でも、知っている作家のジャケット買いをするだけで楽しい。

奥に進むと階段下に詩集と哲学書のコーナーがあって、サルトル、ボーヴォワール、シモーヌ・ヴェイユの中古がそれぞれ3〜8ユーロ。店主のフランソワは平日午後しかいない。土曜はバイトの大学生が回している。

### 3. Eglise Saint-Severin — 平日午前限定の静かなステンドグラス
6区とは厳密には言えないが(住所は5区)、サンジェルマンから歩いて10分。観光ガイドではノートルダムやサン=シュルピスの陰に隠れるが、ステンドグラスの色彩は実は6区周辺で一番美しいと私は思っている。

平日10時から11時半までが圧倒的に空いている。観光バスのコースから外れているので、人がいても10人未満。入場無料、写真は撮ってよい(フラッシュは不可)。木の椅子に座って20分ぼんやりするだけで、その日の体力が少し戻る。

### 4. Cafe de la Mairie — 学生と作家の長居カフェ
サン=シュルピス広場の角にある古いカフェ。観光客もそれなりに来るが、平日午後の窓際テーブルはほぼ確実に学生で埋まる。エスプレッソが2.8ユーロ、カフェ・アロンジェが3.2ユーロ、これで2時間粘っても何も言われない。

おすすめは2階の窓際席。広場と教会のファサードが正面に見える。私は文房具と古書を買ったあと、ここで戦利品を並べて1時間読書するのを習慣にしている。

---

**実用情報**: メトロ4号線 Saint-Sulpice または 10号線 Mabillon が起点。所要は文房具・古書・教会・カフェの4箇所で約2時間半。平日の午後3時〜5時半が一番この街の本来の顔が見える時間帯。',
    'https://picsum.photos/seed/locore-sample-3/960/640',
    750,
    'published',
    ARRAY['6区', '文房具', '古書', 'カフェ', '学生街'],
    'few_hours',
    'spot_guide',
    '2026-05-02T15:00:00+02:00',
    true
  )
  RETURNING id
)
INSERT INTO spots (article_id, name, address, location, category, position, is_sample)
SELECT id, 'Papeterie Saint-Sulpice', 'Rue Servandoni 12, 75006 Paris',
       'SRID=4326;POINT(2.3338 48.8503)'::geography, 'shopping', 0, true
FROM inserted_article
UNION ALL
SELECT id, 'Librairie du Quartier Latin', 'Rue Monsieur-le-Prince 41, 75006 Paris',
       'SRID=4326;POINT(2.3401 48.8493)'::geography, 'shopping', 1, true
FROM inserted_article
UNION ALL
SELECT id, 'Eglise Saint-Severin', 'Rue des Pretres-Saint-Severin 3, 75005 Paris',
       'SRID=4326;POINT(2.3458 48.8521)'::geography, 'sight', 2, true
FROM inserted_article
UNION ALL
SELECT id, 'Cafe de la Mairie', 'Place Saint-Sulpice 8, 75006 Paris',
       'SRID=4326;POINT(2.3325 48.8511)'::geography, 'food', 3, true
FROM inserted_article;

COMMIT;
