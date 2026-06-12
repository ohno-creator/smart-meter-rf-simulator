/** =====================================================================
 *  コアデータ: 通信方式 / 環境 / 設置条件 / アンテナ実装状態
 *  数値は代表値（机上概算用）。実機仕様・法令・現地測定での確認が必要。
 *  ===================================================================== */

/** ===== 日本のスマートメーターで使われる通信方式 ===== */
export const BANDS = [
  {
    key: "wisun",
    label: "Wi-SUN（920MHz）",
    short: "Wi-SUN",
    freq: 920, txP: 13, sens: -105,
    use: "電気スマートメーター（Aルート マルチホップ / Bルート HEMS）",
    note: "ARIB STD-T108。送信20mW(13dBm)。電気の次世代スマメではWi-SUN FANでガス・水道との共同検針も視野。",
  },
  {
    key: "ubus",
    label: "U-Bus Air（920MHz）",
    short: "U-Bus Air",
    freq: 920, txP: 13, sens: -105,
    use: "都市ガススマートメーター（NCU）",
    note: "ARIB STD-T108ベース、最大15ホップ中継。電池10年駆動が前提のため省電力設計が厳しい。",
  },
  {
    key: "lpwa920",
    label: "920MHz LPWA（LoRa等 長距離系）",
    short: "LPWA",
    freq: 920, txP: 13, sens: -130,
    use: "水道スマートメーター実証 / LPガス",
    note: "LoRa SF12で感度-137dBm級。狭帯域・低レートで感度を稼ぐぶん通信時間が長く電池に効く（代表値として-130dBmを使用）。",
  },
  {
    key: "telem429",
    label: "特定小電力テレメータ（429MHz）",
    short: "429MHz特小",
    freq: 429, txP: 10, sens: -120,
    use: "LPガス集中監視（従来型）",
    note: "波長が長く回折に強い。古くからのLPガス集中監視で実績。",
  },
  {
    key: "ltem",
    label: "LTE-M / Cat-M1（800MHz帯）",
    short: "LTE-M",
    freq: 800, txP: 23, sens: -115,
    use: "LPガスNCU / 水道スマートメーター",
    note: "キャリア網利用。基地局が遠い場合や地下では端末側アンテナ性能が効く。",
  },
  {
    key: "nbiot",
    label: "NB-IoT（900MHz帯）",
    short: "NB-IoT",
    freq: 900, txP: 23, sens: -129,
    use: "水道スマートメーター実証",
    note: "超狭帯域で感度が深い。それでも鉄蓋ピット水没では届かないことがある。",
  },
];
export const bandOf = (key) => BANDS.find((b) => b.key === key) || BANDS[0];

/** ===== 周辺環境（伝搬係数 n と環境損失） ===== */
export const ENVS = [
  { key: "los", label: "見通し（開けた場所）", icon: "🏞", n: 2.0, loss: 0, lossMax: 3, sigma: 3, desc: "障害物がほぼ無い理想条件。カタログ的な飛距離が出る環境。" },
  { key: "suburb", label: "郊外住宅地", icon: "🏘", n: 2.7, loss: 5, lossMax: 12, sigma: 6, desc: "戸建て中心。建物の回り込みで届くが、軒下や物陰でムラが出る。" },
  { key: "urban", label: "都市部", icon: "🏙", n: 3.2, loss: 10, lossMax: 22, sigma: 8, desc: "中層ビル・マンション混在。見通しが取れず反射・回折頼みになる。" },
  { key: "dense", label: "高密市街・ビル街", icon: "🌆", n: 3.8, loss: 18, lossMax: 32, sigma: 9, desc: "ビル谷間。電波の通り道が限られ、数十m単位で圏内外が変わる。" },
];
export const envOf = (key) => ENVS.find((e) => e.key === key) || ENVS[1];

/** ===== 設置条件（遮蔽損失）===== */
export const SITES = [
  { key: "wall", label: "壁面・露出", icon: "🧱", loss: 0, lossMax: 3, desc: "建物外壁に露出設置。最も素直な条件。" },
  { key: "plastic_box", label: "樹脂ボックス内", icon: "📦", loss: 4, lossMax: 8, desc: "樹脂は電波をある程度通す。内部の金具・水滴に注意。" },
  { key: "metal_panel", label: "金属計器盤・キュービクル内", icon: "🗄", loss: 30, lossMax: 60, outage: true, desc: "金属箱は電波をほぼ遮蔽。隙間・窓の有無で大きく変わり、通信不能もある。" },
  { key: "ps_shaft", label: "パイプシャフト内", icon: "🚪", loss: 18, lossMax: 35, desc: "金属扉・配管・奥行きで損失大。扉の開閉で状態が変わる。" },
  { key: "pit_resin", label: "地中ピット（樹脂蓋）", icon: "🕳", loss: 15, lossMax: 30, desc: "蓋は通すが、地中・低位置・周囲の土の影響を受ける。" },
  { key: "pit_iron", label: "地中ピット（鋳鉄蓋）", icon: "⛓", loss: 40, lossMax: 70, outage: true, desc: "鉄蓋は電波をほぼ通さない。蓋の隙間からのわずかな漏れ頼み。" },
];
export const siteOf = (key) => SITES.find((s) => s.key === key) || SITES[0];

/** ===== アンテナ実装状態（講演の実測に基づくプリセット） =====
 *  netDb = カタログ値からの実効変化量（効率悪化＋実装損失）
 */
export const ANT_STATES = [
  {
    key: "catalog",
    label: "カタログ性能（理想実装）",
    icon: "📘",
    netDb: 0,
    desc: "メーカー測定条件どおりの理想状態。GND・周囲クリアランスが確保されている。",
    lecture: "講演でいう「カタログの利得方向性」。実装で必ずここから変化する。",
  },
  {
    key: "good_layout",
    label: "良配置（金属30cm確保）",
    icon: "✅",
    netDb: -1,
    desc: "金属・ノイズ源から30cm確保し縦置き。実装損失は最小限。",
    lecture: "講演の設置3原則（見通し・30cm・縦置き）を守った状態。",
  },
  {
    key: "metal_near",
    label: "金属近接（密着気味）",
    icon: "🔩",
    netDb: -7,
    desc: "金属板の近くに設置。共振がズレ、放射パターンも変形する。",
    lecture: "講演実測: カタログ効率-3.6dB → 金属板設置で-10.6dB（7dB悪化）@815MHz。",
  },
  {
    key: "battery",
    label: "バッテリー密着",
    icon: "🔋",
    netDb: -10,
    desc: "アンテナに電池パックが密着。電力換算で約1/10。",
    lecture: "講演実測: RSSI -55→-65dBm（-10dB）。通信距離は約1/3に。",
  },
  {
    key: "sandwich",
    label: "基板サンドイッチ",
    icon: "🥪",
    netDb: -14,
    desc: "アンテナを基板2枚で挟む最悪級の実装。電力換算で約1/25。",
    lecture: "講演実測: RSSI -55→-69dBm（-14dB）。通信距離は約1/5に。",
  },
  {
    key: "tuned",
    label: "筐体込み最適化（Stafサポート）",
    icon: "🛠",
    netDb: 1.5,
    desc: "筐体・GND・給電部を込みで設計調整。実装による悪化を防ぎ数dBを回収。",
    lecture: "試作段階でのOTA測定＋GND設計で「飛ばない」を設計段階で防ぐ。",
  },
];
export const antStateOf = (key) => ANT_STATES.find((a) => a.key === key) || ANT_STATES[0];

/** ===== 偏波 ===== */
export const POLS = [
  { key: "V", label: "垂直" },
  { key: "H", label: "水平" },
  { key: "C", label: "円" },
  { key: "MIX", label: "不明・混在" },
];

/** 講演実験（実験ラボで再現） */
export const LECTURE_EXPERIMENTS = [
  {
    key: "baseline",
    label: "基準（理想配置）",
    icon: "📡",
    rssi: -55, deltaDb: 0,
    powerText: "1.0", distText: "100%",
    desc: "Leafony LoRa Leaf + 1018-521Aアンテナ。障害物なしの基準状態で RSSI -55dBm。",
    physics: "アンテナ周囲に金属や人体がなく、カタログに近い効率で放射できている状態です。",
  },
  {
    key: "pocket",
    label: "ポケットに入れる（人体接触）",
    icon: "🧥",
    rssi: -61, deltaDb: 6,
    powerText: "約1/4", distText: "約1/2",
    desc: "ウェアラブル・ハンドヘルド機器で起きる条件。人体が電波を吸収し -6dB。",
    physics: "人体は水分が多く920MHz帯を吸収します。アンテナに近いほど効率が落ち、ポケットや手で覆うだけで通信性能は大きく低下します。",
  },
  {
    key: "battery",
    label: "バッテリーを密着",
    icon: "🔋",
    rssi: -65, deltaDb: 10,
    powerText: "約1/10", distText: "約1/3",
    desc: "アンテナの端末化でありがちな事例。金属の電池が密着して -10dB。",
    physics: "金属（電池）がアンテナに近接すると共振条件が変わり、電波の放り出しが阻害されます。わずかな配置の違いで通信性能は大きく変わります。",
  },
  {
    key: "sandwich",
    label: "基板でサンドイッチ",
    icon: "🥪",
    rssi: -69, deltaDb: 14,
    powerText: "約1/25", distText: "約1/5",
    desc: "アンテナを基板の上下で挟む実装。-14dBで電力は約1/25に。",
    physics: "基板（金属GND）に挟まれるとアンテナの上下に金属が来るため、電波の放出が大きく妨げられます。設計段階での配置検討が不可欠です。",
  },
];
