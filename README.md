# rail-meet / dots

複数の出発駅から、鉄道の移動距離で集合駅を提案する静的Webアプリ。ブラウザ内で計算し、人ごとの実鉄道経路と距離を表示します。APIキー、アカウント、バックエンドは不要です。

## 起動

```sh
python3 -m http.server 4173 --directory dist
```

http://localhost:4173 を開きます。通常利用にnpm installやビルドは不要。配布時は `dist/` を静的HTTPホストへ配置してください。JSONを読み込むため `file://` では動作しません。

## 距離と候補

出発地は2〜4人。千葉・横浜が初期値です。最も遠い人の距離、最大と最小の差、合計距離、駅名の順に昇順で比較し、候補を3件表示します。順位は丸め前の値で計算し、画面の距離は小数1桁です。

対象は76駅・80区間。山手線全周、中央・総武各駅停車の三鷹〜千葉、総武線の東京〜錦糸町、神田〜御茶ノ水、京浜東北線沿いの東京〜横浜です。対象外の路線を経由する近道は探索しません。全駅は `dist/network.json` を参照してください。

鉄道形状の各線分の球面距離を合計し、明示した駅の接続だけを使ってDijkstra法で最短経路を求めます。線路の交差だけで乗換を作りません。駅位置は形状へ投影し、平行線路は代表形状を使用します。ホーム間徒歩はゼロ距離扱いです。

線路形状距離は営業キロ・運賃距離・徒歩距離とは異なります。時刻表、待ち時間、快速、所要時間、運賃、運休は扱いません。都県境・海岸線は位置関係を見るための簡略図で、境界確認には使えません。

## 操作と表彰

候補を選ぶと経路と距離が更新されます。「集合場所を探す」はその場で再計算し、ページをスクロールしません。A–Dのコマは実際の経路を短くたどりますが、速度・所要時間・実際の到着を表しません。共通経路は色の縞で表示し、凡例で人ごとに切り替えられます。

オリジナルの集合応援団「ドッツン」が最長距離の参加者を「遠征の勇者」として表彰します。画面と同じ小数一桁の距離で比較し、同じ最長表示値の人は全員受賞します。全員の表示距離がゼロなら遠征の王冠は出しません。計算・候補順位は従来どおり丸め前の値を使います。表彰は候補順位に影響せず、金銭や外部特典もありません。駅選択に参加者の短いポップを返し、再計算では「そーれっ★」→実経路の走行→集合地点の合流→受賞者それぞれへの王冠、を短くつなぎます。コピーは同時に重ねません。操作位置・距離表示は動かさず、次操作で途中の演出をすべて取り消します。動きを減らすOS設定では静的表示になります。

## データとライセンス

- 鉄道：国土交通省 [N02-24](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2024.html)、2024年12月31日時点、[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ja)。[公開ミラー](https://github.com/antfu/mlit-json/tree/8e19627dc5db492ea4a3d9fd8501d5ccb862ef28)から取得。対象路線を抽出し、駅への投影・駅間分割を行っています。2025年版は使用していません。
- 背景：国土交通省 [N03-19_190101](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-v2_3.html)、2019年1月1日時点。[適用利用規約](https://nlftp.mlit.go.jp/ksj/other/agreement.html)（現行PDL1.0）に従います。[公開ミラー](https://github.com/piuccio/open-data-jp-prefectures-geojson/tree/513fb852832c99470e16b95a30ddd68bf3469dc0)での統合・簡略化後、関東周辺の都県を抽出し、輪郭を約160〜200m相当で簡略化しています。ミラーのMIT表記は `dist/vendor/prefectures-LICENSE.txt` に保持。
- Leaflet：BSD 2-Clause。全文は `dist/vendor/leaflet-LICENSE.txt`。
- ドッツンと王冠：独自の画像生成ヒーローPNGと王冠SVG、CC0（権利が存在する範囲）。`dist/artwork-LICENSE.txt`。
- 独自アプリコード：MIT（`LICENSE`）。データ・ライブラリ・素材には上記の個別条件が適用されます。

詳細な原典、従前と今回の加工、免責は `dist/sources.html`、取得ハッシュは `data-source/provenance.json` にあります。タイルサーバー、CDN、有料経路APIへの実行時通信はありません。

## 再生成・テスト

Python 3とNode.jsを使用します。データ再生成・計算テストに追加パッケージは不要です。

```sh
python3 scripts/build_data.py
python3 scripts/build_basemap.py
python3 scripts/check_geometry.py
npm test
```

ブラウザテストだけはPlaywrightを使用します。別ターミナルで上記のHTTPサーバーを起動してから実行してください。

```sh
npm install
npx playwright install chromium
npm run test:browser
```

既存Chromiumを使う場合は `CHROMIUM_PATH` に実行ファイルを指定できます。テスト出力は `evidence/` に作成します。最短距離の全5,776駅対照合、原典形状、同駅・重複・到達不能、候補更新、モバイル幅、読込失敗、表彰、連打、キーボード、reduced-motion、スクロール保持を検証します。

## 構成

- `dist/`：そのまま配信するサイトと加工済みデータ
- `data-source/`：再生成用の範囲限定データと来歴
- `scripts/`：データ生成と検証
