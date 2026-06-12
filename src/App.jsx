import React, { useCallback, useEffect, useMemo, useState } from "react";

/** =====================================================================
 *  スマートメーター RFリンクリスク評価ツール v3
 *  改善点:
 *  - 金属ボックス/鉄蓋/浸水の損失を現実寄りのレンジ評価へ変更
 *  - 通常値 / 悲観値 / 2波ヌル対策の判定を分離
 *  - Tx/Rx偏波（垂直・水平・円・不明）を選択可能化
 *  - 損失は正のdB表記、受信電力はdBm表記に整理
 *  - 結果に応じた解説・ボトルネック・推奨対策を自動表示
 *  - リンク判定を「目標距離一点」から「判定用最小マージン」へ修正
 *  ===================================================================== */

/** ===== Utilities ===== */
const clamp = (x, min, max = Infinity) => Math.max(min, Math.min(max, x));
const log10 = (x) => Math.log10(clamp(x, 1e-9));
const round = (x, d = 1) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : NaN);
const fmt = (x, d = 1) => (Number.isFinite(x) ? String(round(x, d)) : "—");
const fmtSigned = (x, d = 1) => (Number.isFinite(x) ? `${x >= 0 ? "+" : ""}${fmt(x, d)}` : "—");
const fmtLoss = (x, d = 0) => (Number.isFinite(x) ? `${fmt(x, d)} dB損失` : "—");
const fmtDistance = (m) => {
  if (!Number.isFinite(m)) return "—";
  if (m >= 1000) return `${round(m / 1000, 2)} km`;
  return `${round(m, 0)} m`;
};
const fmtTick = (m) => {
  if (m >= 1000000) return `${round(m / 1000000, 1)}M`;
  if (m >= 1000) return `${round(m / 1000, m >= 10000 ? 0 : 1)}k`;
  return `${Math.round(m)}`;
};
const median = (arr) => {
  const xs = arr.filter(Number.isFinite).sort((a, b) => a - b);
  const n = xs.length;
  return n ? (n % 2 ? xs[(n - 1) / 2] : (xs[n / 2 - 1] + xs[n / 2]) / 2) : NaN;
};

/** ===== Design tokens ===== */
const C = {
  paper: "#ECF1F4",
  panel: "#FFFFFF",
  line: "#D3DDE3",
  grid: "#E4EDF2",
  ink: "#14252F",
  sub: "#5B6E79",
  blue: "#2B5DA8",
  ok: "#0E7C66",
  warn: "#B26B00",
  ng: "#B3261E",
  bad: "#6F1D1B",
  okBg: "#E2F2EE",
  warnBg: "#F7ECD9",
  ngBg: "#F8E3E1",
  badBg: "#F4D8D5",
};

/** ===== 通信方式・バンド（代表値。実機仕様で要確認） ===== */
const BANDS = [
  { key: "wisun", group: "省電力WAN", label: "Wi-SUN（920MHz）", freq: 920, txP: 13, sens: -105 },
  { key: "ubus", group: "省電力WAN", label: "U-Bus Air（920MHz）", freq: 920, txP: 13, sens: -110 },
  { key: "lpwa920", group: "省電力WAN", label: "920MHz LPWA（長距離系）", freq: 920, txP: 13, sens: -125 },
  { key: "telem429", group: "省電力WAN", label: "特定小電力テレメータ（429MHz）", freq: 429, txP: 10, sens: -120 },
  { key: "ltem", group: "セルラーIoT", label: "LTE-M / Cat-M1（B18 800MHz）", freq: 800, txP: 23, sens: -115 },
  { key: "nbiot", group: "セルラーIoT", label: "NB-IoT（B8 900MHz）", freq: 900, txP: 23, sens: -129 },
  { key: "b28", group: "LTE", label: "LTE B28（700MHz プラチナ）", freq: 700, txP: 23, sens: -110 },
  { key: "b19", group: "LTE", label: "LTE B19（800MHz プラチナ）", freq: 800, txP: 23, sens: -110 },
  { key: "b8", group: "LTE", label: "LTE B8（900MHz）", freq: 900, txP: 23, sens: -110 },
  { key: "b21", group: "LTE", label: "LTE B21（1.5GHz）", freq: 1500, txP: 23, sens: -108 },
  { key: "b3", group: "LTE", label: "LTE B3（1.7/1.8GHz）", freq: 1800, txP: 23, sens: -108 },
  { key: "b1", group: "LTE", label: "LTE B1（2.1GHz）", freq: 2100, txP: 23, sens: -106 },
  { key: "b42", group: "LTE", label: "LTE B42（3.5GHz）", freq: 3500, txP: 23, sens: -104 },
  { key: "n28", group: "5G NR", label: "5G n28（700MHz）", freq: 700, txP: 23, sens: -108 },
  { key: "n78", group: "5G NR", label: "5G n78（3.4–3.7GHz）", freq: 3500, txP: 23, sens: -98 },
  { key: "n77", group: "5G NR", label: "5G n77（3.7–4.1GHz）", freq: 3900, txP: 23, sens: -98 },
  { key: "n79", group: "5G NR", label: "5G n79（4.5GHz）", freq: 4500, txP: 23, sens: -97 },
  { key: "n257", group: "5G NR", label: "5G n257（28GHz ミリ波）", freq: 28000, txP: 23, sens: -88 },
];
const BAND_GROUPS = ["省電力WAN", "セルラーIoT", "LTE", "5G NR"];

/** ===== メーター種別プリセット ===== */
const UTILITIES = [
  {
    key: "elec",
    label: "電気",
    icon: "⚡",
    tone: "#B26B00",
    sub: "Wi-SUN 920MHz 想定",
    note: "壁面の電力量計から受信局へ。比較的見通しが取りやすいが、金属盤内では大きく悪化します。",
    v: { band: "wisun", txG: -2, rxG: 0, margin: 10, env: "urban", place: "wall", ht: 1.8, hr: 5, dTest: 300, txPol: "V", rxPol: "V" },
  },
  {
    key: "citygas",
    label: "都市ガス",
    icon: "🔥",
    tone: "#2B5DA8",
    sub: "U-Bus Air 920MHz 想定",
    note: "建物脇・パイプシャフト内が多く、遮蔽損失・人体近接・偏波ずれの影響が出やすい設置です。",
    v: { band: "ubus", txG: -3, rxG: 0, margin: 12, env: "urban", place: "shaft", ht: 1.2, hr: 8, dTest: 200, txPol: "V", rxPol: "V" },
  },
  {
    key: "lpgas",
    label: "LPガス",
    icon: "🛢",
    tone: "#5B6E79",
    sub: "920MHz LPWA / LTE-M 想定",
    note: "郊外・点在配置が多く、長距離リンク成立性がポイント。ボンベ・金属壁近接でアンテナ特性が変動します。",
    v: { band: "lpwa920", txG: -3, rxG: 2, margin: 12, env: "suburb", place: "wall", ht: 1.2, hr: 10, dTest: 1000, txPol: "V", rxPol: "V" },
  },
  {
    key: "water",
    label: "水道",
    icon: "💧",
    tone: "#0E7C66",
    sub: "920MHz LPWA 想定",
    note: "地中の量水器ピット内設置が標準。鉄蓋・浸水・低アンテナ高により、通信不能リスクが高い条件です。",
    v: { band: "lpwa920", txG: -5, rxG: 2, margin: 15, env: "suburb", place: "pit_metal", ht: 0.3, hr: 10, dTest: 100, txPol: "MIX", rxPol: "V" },
  },
];

/** ===== 設置場所損失：通常値 / 最小 / 最大 / 通信不能リスク ===== */
const PLACES = [
  { key: "wall", label: "壁面・露出", icon: "🧱", loss: 0, lossMin: 0, lossMax: 3, outageRisk: false, sub: "0〜3 dB損失" },
  { key: "plastic_box", label: "樹脂ボックス内", icon: "📦", loss: 5, lossMin: 3, lossMax: 10, outageRisk: false, sub: "3〜10 dB損失" },
  { key: "box", label: "金属ボックス内（隙間あり）", icon: "📦", loss: 30, lossMin: 15, lossMax: 50, outageRisk: true, sub: "15〜50 dB損失" },
  { key: "metal_sealed", label: "金属ボックス内（密閉）", icon: "🧰", loss: 50, lossMin: 30, lossMax: 80, outageRisk: true, sub: "30〜80 dB損失 / 通信不能あり" },
  { key: "shaft", label: "パイプシャフト内", icon: "🚪", loss: 20, lossMin: 10, lossMax: 35, outageRisk: false, sub: "10〜35 dB損失" },
  { key: "pit_resin", label: "地中ピット（樹脂蓋）", icon: "🕳", loss: 20, lossMin: 10, lossMax: 35, outageRisk: false, sub: "10〜35 dB損失" },
  { key: "pit_metal", label: "地中ピット（鉄蓋）", icon: "⛓", loss: 45, lossMin: 30, lossMax: 70, outageRisk: true, sub: "30〜70 dB損失 / 通信不能あり" },
];
const FLOOD_LOSS = { nominal: 20, min: 10, max: 35 };

/** ===== 周辺環境 ===== */
const ENV_OPTIONS = [
  { key: "los", label: "見通し", icon: "🏞", loss: 0, lossMin: 0, lossMax: 3, n: 2.0, sigma: 3, sub: "0〜3 dB", buildings: 0, hMin: 0, hMax: 0, walls: 0 },
  { key: "suburb", label: "郊外", icon: "🏘", loss: 5, lossMin: 3, lossMax: 12, n: 2.5, sigma: 6, sub: "3〜12 dB", buildings: 5, hMin: 16, hMax: 32, walls: 0 },
  { key: "urban", label: "都市", icon: "🏙", loss: 10, lossMin: 6, lossMax: 22, n: 3.0, sigma: 8, sub: "6〜22 dB", buildings: 10, hMin: 22, hMax: 52, walls: 0 },
  { key: "dense", label: "高密市街", icon: "🌆", loss: 18, lossMin: 10, lossMax: 32, n: 3.6, sigma: 9, sub: "10〜32 dB", buildings: 16, hMin: 28, hMax: 72, walls: 0 },
  { key: "indoorL", label: "屋内（壁少）", icon: "🏠", loss: 12, lossMin: 6, lossMax: 22, n: 3.0, sigma: 7, sub: "6〜22 dB", buildings: 0, hMin: 0, hMax: 0, walls: 3 },
  { key: "indoorH", label: "屋内（壁多）", icon: "🏢", loss: 25, lossMin: 15, lossMax: 45, n: 4.0, sigma: 10, sub: "15〜45 dB", buildings: 0, hMin: 0, hMax: 0, walls: 6 },
];

/** ===== 偏波 ===== */
const POL_OPTIONS = [
  { key: "V", label: "垂直偏波" },
  { key: "H", label: "水平偏波" },
  { key: "C", label: "円偏波" },
  { key: "MIX", label: "不明・混在" },
];
function calcPolLoss(txPol, rxPol) {
  if (txPol === "MIX" || rxPol === "MIX") return 6;
  if (txPol === rxPol) return 0;
  if ((txPol === "V" && rxPol === "H") || (txPol === "H" && rxPol === "V")) return 20;
  if (txPol === "C" || rxPol === "C") return 3;
  return 6;
}

const HELP = {
  model:
    "FS: 自由空間損失＋環境/設置/偏波/追加損失。\nCI: 1m自由空間損失＋パスロス指数n。都市・屋内NLOSの傾向表現に向きます。\n2波: 地表反射によるヌルを簡易表現。判定は目標距離周辺の最小マージンで行います。",
  place:
    "損失は正のdBで入力・表示します。例: 30dB損失 = 受信電力が30dB低下。\n金属ボックス・鉄蓋は10dBでは甘く、30〜70dB級または通信不能も見込むべき条件です。",
  pol:
    "Tx/Rx偏波を選ぶと自動で偏波損失を加算します。垂直×水平の直交では反射・散乱で完全には消えない前提で20dB損失に丸めています。",
  flood: "ピット浸水は通常+20dB、悲観+35dBとして扱います。水没時はアンテナ整合悪化も重なり、通信不能シナリオとして併記します。",
  margin: "マージン = 受信電力Prx − 受信感度。プラスなら受信感度を上回ります。目標マージンはフェージング・干渉・個体差の余裕です。",
  dB: "dBmは絶対電力、dBiはアンテナ利得、dBは比率です。損失・減衰量は通常プラスdBで表記し、受信電力側はdBmがマイナス方向へ下がります。",
  log: "現地RSSIログから、予測と実測の差分を推定現場損失として算出します。中央値を見ることで外れ値の影響を抑えます。",
};
const MODEL_NOTES = {
  FS: {
    name: "FS: Free Space / 自由空間ベース",
    text: "空中をまっすぐ伝わる基本損失に、設置場所・周辺環境・偏波などの損失を足すモデルです。見通しがある屋外や、まず概算したい時に向きます。",
    bestFor: "まず概算・見通し屋外",
  },
  CI: {
    name: "CI: Close-In / 距離減衰ベース",
    text: "1m地点の自由空間損失を基準に、環境ごとのパスロス指数nで距離減衰を表します。都市部・屋内・遮蔽物が多いNLOS条件の傾向確認に向きます。",
    bestFor: "都市・屋内・遮蔽物あり",
  },
  TWO: {
    name: "2波: 直接波 + 地表反射",
    text: "直接波と地面からの反射波が重なって強め合い・弱め合いを起こす前提です。特定距離で急に悪化するヌルを見たい時に使います。",
    bestFor: "低アンテナ・反射ヌル確認",
  },
};
const JUDGE_ACTIONS = {
  ok: ["現地RSSIで机上値との差を確認", "悲観カーブでも0dBを下回らないか確認", "量産前に設置ばらつきを数点で確認"],
  warn: ["アンテナ位置を高くする", "金属・人体・蓋材から距離を取る", "受信局追加または外部アンテナを検討"],
  ng: ["設置場所損失を下げる対策を優先", "通信方式・周波数帯を見直す", "中継局や受信局配置を再設計"],
  bad: ["金属密閉・鉄蓋・浸水条件を前提に対策", "外部アンテナ化または蓋材変更を検討", "机上計算だけでなく現地試験を必須化"],
};
const LECTURE_SCENARIOS = [
  { key: "none", label: "なし", loss: 0, sub: "基準条件" },
  { key: "body", label: "人体接触", loss: 6, sub: "実験: 約-6dB" },
  { key: "battery", label: "金属/電池密着", loss: 10, sub: "実験: 約-10dB" },
  { key: "board", label: "基板で挟む", loss: 14, sub: "実験: 約-14dB" },
  { key: "wall", label: "RC壁1枚", loss: 20, sub: "目安: 15〜25dB" },
];
const LECTURE_GUIDE = [
  "見通しを確保する",
  "金属・ノイズ源から離す",
  "縦置き/横置きを試しRSSIで比べる",
  "10〜20dBの余裕を持たせる",
];

/** ===== Numeric input hook ===== */
function useNum(initial, { min = -Infinity, max = Infinity } = {}) {
  const [v, setV] = useState(initial);
  const [t, setT] = useState(String(initial));
  useEffect(() => setT(String(v)), [v]);
  const commit = useCallback(
    (raw) => {
      let x = parseFloat(raw);
      if (!Number.isFinite(x)) x = v;
      x = clamp(x, min, max);
      setV(x);
      setT(String(x));
    },
    [v, min, max]
  );
  return {
    v,
    setV,
    bind: {
      value: t,
      onChange: (e) => setT(e.target.value),
      onBlur: () => commit(t),
      onKeyDown: (e) => e.key === "Enter" && commit(t),
      inputMode: "text",
    },
  };
}

/** ===== CSV ===== */
function detectDelim(text) {
  const line = (text || "").split(/\r?\n/).find((l) => l.trim());
  if (!line) return ",";
  return line.includes("\t") ? "\t" : ",";
}
function parseLog(text) {
  const src = (text || "").trim();
  if (!src) return [];
  const delim = detectDelim(src);
  const lines = src.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let start = /point|距離|distance|rssi/i.test(lines[0] || "") ? 1 : 0;
  const out = [];
  for (let i = start; i < lines.length; i++) {
    const cells = lines[i].split(delim).map((s) => s.trim());
    if (cells.length < 2) continue;
    let point = cells[0] || `P${out.length + 1}`;
    let d = parseFloat(cells[1]);
    let off = 2;
    if (!Number.isFinite(d)) {
      const d2 = parseFloat(cells[0]);
      if (!Number.isFinite(d2)) continue;
      point = `P${out.length + 1}`;
      d = d2;
      off = 1;
    }
    const rssi = Array.from({ length: 5 }, (_, k) => {
      const n = parseFloat(cells[off + k]);
      return Number.isFinite(n) ? clamp(Math.round(n), -200, 0) : NaN;
    });
    out.push({ point, d: clamp(d, 1, 1e9), rssi });
  }
  return out;
}
function toCSV(tableData) {
  const head = ["Point", "Distance_m", "RSSI1", "RSSI2", "RSSI3", "RSSI4", "RSSI5", "Median_dBm", "Pred_dBm", "EstLoss_dB"].join(",");
  const lines = tableData.map((r) => [r.point, r.d, ...r.rssi.map((x) => (Number.isFinite(x) ? x : "")), Number.isFinite(r.median) ? round(r.median, 1) : "", Number.isFinite(r.pred) ? round(r.pred, 1) : "", Number.isFinite(r.estAdd) ? round(r.estAdd, 1) : ""].join(","));
  return [head, ...lines].join("\n");
}

/** ===== Max distance search ===== */
function searchReliableDistance(metricFn, target, dMax = 1e7, steps = 1200) {
  let reliable = 0;
  const maxL = log10(dMax);
  for (let i = 0; i <= steps; i++) {
    const d = 10 ** ((maxL * i) / steps);
    const m = metricFn(d);
    if (m >= target) reliable = d;
    else return reliable;
  }
  return reliable || dMax;
}
function searchFarthestPassingDistance(metricFn, target, dMax = 1e7, steps = 2600, dMin = 1) {
  const minL = log10(dMin);
  const maxL = log10(dMax);
  const refine = (loD, hiD) => {
    let lo = loD;
    let hi = hiD;
    for (let i = 0; i < 28; i++) {
      const mid = 10 ** ((log10(lo) + log10(hi)) / 2);
      if (metricFn(mid) >= target) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  let prevD = dMin;
  let prevM = metricFn(prevD);
  let farthest = prevM >= target ? prevD : 0;
  for (let i = 1; i <= steps; i++) {
    const d = 10 ** (minL + ((maxL - minL) * i) / steps);
    const m = metricFn(d);
    if (m >= target) farthest = d;
    else if (prevM >= target) farthest = refine(prevD, d);
    prevD = d;
    prevM = m;
  }
  return farthest;
}

/** ===== Axis ===== */
const AX = { W: 1000, l: 74, r: 22 };
const plotW = AX.W - AX.l - AX.r;
const xOf = (d, maxX) => AX.l + (log10(d) / log10(maxX)) * plotW;
const X_TICKS = [10, 30, 100, 300, 1000, 3000, 10000, 30000, 100000, 300000, 1000000];
const marginColor = (m, target) => (m >= target ? C.ok : m >= 0 ? C.warn : C.ng);
const SLIDER_MIN_L = 1;
const SLIDER_MAX_L = 5;
const sliderToDist = (t) => Math.round(10 ** (SLIDER_MIN_L + (t / 1000) * (SLIDER_MAX_L - SLIDER_MIN_L)));
const distToSlider = (d) => clamp(Math.round(((log10(d) - SLIDER_MIN_L) / (SLIDER_MAX_L - SLIDER_MIN_L)) * 1000), 0, 1000);

function HLabel({ text, helpKey, setHelp }) {
  return (
    <span className="lab" onMouseEnter={() => setHelp(helpKey)} onFocus={() => setHelp(helpKey)} onClick={() => setHelp(helpKey)} tabIndex={0} role="button" aria-label={text}>
      {text}
    </span>
  );
}
function NumField({ label, helpKey, setHelp, bind, note }) {
  return (
    <label className="field">
      <div>
        <HLabel text={label} helpKey={helpKey} setHelp={setHelp} />
        {note ? <div className="small">{note}</div> : null}
      </div>
      <input className="in" type="number" step="any" {...bind} />
    </label>
  );
}
function PickGrid({ options, value, onChange, cols = 4, big = false }) {
  return (
    <div className="pick" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button key={o.key} className={`pk ${big ? "pkBig" : ""} ${value === o.key ? "on" : ""}`} onClick={() => onChange(o.key)} aria-pressed={value === o.key}>
          <span className="pkIcon">{o.icon}</span>
          <span className="pkLabel">{o.label}</span>
          <span className="pkSub">{o.sub}</span>
        </button>
      ))}
    </div>
  );
}
function RssiCell({ value, onCommit }) {
  const [t, setT] = useState(Number.isFinite(value) ? String(value) : "");
  useEffect(() => setT(Number.isFinite(value) ? String(value) : ""), [value]);
  const commit = () => {
    const n = parseInt(t, 10);
    onCommit(Number.isFinite(n) ? clamp(n, -200, 0) : NaN);
  };
  return <input type="number" step="1" className="tin tinR" value={t} onChange={(e) => /^-?\d*$/.test(e.target.value) && setT(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} />;
}
function Modal({ title, text, setText, onClose, onApply, applyLabel }) {
  return (
    <div className="modalBg" role="dialog" aria-modal="true">
      <div className="modal">
        <h3>{title}</h3>
        <textarea value={text} onChange={(e) => setText(e.target.value)} onFocus={(e) => e.target.select()} />
        <div className="acts">
          {onApply ? <button className="btn btnP" onClick={onApply}>{applyLabel || "適用"}</button> : null}
          <button className="btn" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

/** ===== Drawing ===== */
function MeterGraphic({ utility, txX, txY, groundY, antX, antY, reduced, floodOn, metalLid }) {
  const lidColor = metalLid ? "#4A5860" : "#6B5B45";
  return (
    <g>
      {utility === "elec" && (
        <>
          <rect x={txX - 26} y={txY - 34} width={20} height={groundY - (txY - 34)} fill="#DCE6EC" stroke="#9FB4C2" />
          <rect x={txX - 14} y={txY - 18} width={28} height={38} rx="4" fill="#FBFDFE" stroke={C.ink} strokeWidth="1.4" />
          <rect x={txX - 9} y={txY - 12} width={18} height={9} rx="1.5" fill="#0F2E2A" />
          <text x={txX} y={txY - 5} textAnchor="middle" fontSize="6.5" fill="#7BE3C5" fontFamily="ui-monospace,monospace">888.8</text>
          <circle cx={txX - 5} cy={txY + 7} r="2.4" fill={C.ok} />
        </>
      )}
      {utility === "citygas" && (
        <>
          <rect x={txX - 26} y={txY - 30} width={16} height={groundY - (txY - 30)} fill="#DCE6EC" stroke="#9FB4C2" />
          <rect x={txX - 12} y={txY - 14} width={30} height={27} rx="5" fill="#E9EEF2" stroke={C.ink} strokeWidth="1.4" />
          <rect x={txX - 7} y={txY - 9} width={20} height={8} rx="1.5" fill="#1A2B36" />
          <text x={txX + 3} y={txY - 2.5} textAnchor="middle" fontSize="6" fill="#9FD8FF" fontFamily="ui-monospace,monospace">0123</text>
          <line x1={txX - 5} y1={txY + 13} x2={txX - 5} y2={groundY} stroke="#8A9BA8" strokeWidth="3.4" />
        </>
      )}
      {utility === "lpgas" && (
        <>
          <rect x={txX - 34} y={groundY - 44} width={18} height={44} rx="8" fill="#D8E2E9" stroke="#8A9BA8" strokeWidth="1.4" />
          <rect x={txX - 28} y={groundY - 50} width={6} height={7} fill="#8A9BA8" />
          <text x={txX - 25} y={groundY - 22} textAnchor="middle" fontSize="7" fill={C.sub} fontWeight="700">LP</text>
          <rect x={txX - 8} y={txY - 13} width={28} height={25} rx="5" fill="#E9EEF2" stroke={C.ink} strokeWidth="1.4" />
          <rect x={txX - 3} y={txY - 8} width={17} height={7} rx="1.5" fill="#1A2B36" />
        </>
      )}
      {utility === "water" && (
        <>
          <rect x={txX - 22} y={groundY} width={50} height={22} fill="#C7B9A4" stroke="#8F7F66" strokeWidth="1.2" />
          <rect x={txX - 18} y={groundY + 3} width={42} height={16} fill="#EFE7D8" stroke="#8F7F66" />
          {floodOn && <rect x={txX - 18} y={groundY + 7} width={42} height={12} fill="#7FB8D8" opacity="0.85" />}
          <circle cx={txX + 2} cy={groundY + 11} r="5.8" fill="#FBFDFE" stroke={C.ink} strokeWidth="1.2" />
          <line x1={txX - 22} y1={groundY} x2={txX + 28} y2={groundY} stroke={lidColor} strokeWidth="2.4" />
          <line x1={txX + 8} y1={groundY} x2={txX + 32} y2={groundY - 10} stroke={lidColor} strokeWidth={metalLid ? 4 : 3} />
        </>
      )}
      <line x1={txX + (utility === "water" ? 2 : 12)} y1={utility === "water" ? groundY + 6 : txY - 6} x2={antX} y2={antY} stroke={C.ink} strokeWidth="1.6" />
      <circle cx={antX} cy={antY} r="2" fill={C.ink} />
      {[0, 1, 2].map((k) => (
        <circle key={k} cx={antX} cy={antY} r="6" fill="none" stroke={C.blue} strokeWidth="1.4" opacity="0">
          {!reduced && (
            <>
              <animate attributeName="r" values="4;78" dur="2.8s" begin={`${k * 0.93}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.75;0" dur="2.8s" begin={`${k * 0.93}s`} repeatCount="indefinite" />
            </>
          )}
        </circle>
      ))}
    </g>
  );
}

function PropagationScene({ maxX, envKey, placeKey, utility, floodOn, ht, hr, dTest, maxD, line, target, reduced }) {
  const H = 210;
  const top = 12;
  const groundY = H - 44;
  const env = ENV_OPTIONS.find((o) => o.key === envKey) || ENV_OPTIONS[0];
  const uMeta = UTILITIES.find((u) => u.key === utility) || UTILITIES[0];
  const place = PLACES.find((p) => p.key === placeKey) || PLACES[0];
  const hMaxM = Math.max(12, ht * 1.3, hr * 1.3);
  const hPx = (m) => (clamp(m, 0, hMaxM) / hMaxM) * (groundY - top - 26);
  const txX = xOf(1.6, maxX);
  const txY = groundY - Math.max(hPx(ht), utility === "water" ? 0 : 10);
  const antX = txX + (utility === "water" ? 2 : 20);
  const antY = utility === "water" ? groundY - hPx(Math.max(ht, 0.2)) - 4 : txY - 16;
  const rxX = clamp(xOf(dTest, maxX), AX.l + 80, AX.W - AX.r - 8);
  const rxY = groundY - hPx(hr);
  const buildings = useMemo(() => Array.from({ length: env.buildings }, (_, i) => {
    const f = 0.18 + ((i * 0.6180339887) % 1) * 0.7;
    return { x: AX.l + f * plotW, w: 12 + ((i * 7) % 16), h: env.hMin + ((i * 13) % Math.max(1, env.hMax - env.hMin)), win: i % 3 };
  }).sort((a, b) => a.x - b.x), [env]);
  const walls = useMemo(() => Array.from({ length: env.walls }, (_, i) => AX.l + (0.2 + (i + 1) * (0.62 / (env.walls + 1))) * plotW), [env]);
  const heat = useMemo(() => line.slice(0, -1).map((p, i) => ({ x: xOf(p.d, maxX), w: Math.max(0.8, xOf(line[i + 1].d, maxX) - xOf(p.d, maxX)), c: marginColor(p.m, target) })), [line, maxX, target]);
  const maxMX = Number.isFinite(maxD) && maxD > 1 ? xOf(maxD, maxX) : NaN;
  return (
    <svg viewBox={`0 0 ${AX.W} ${H}`} style={{ width: "100%", display: "block" }} aria-label="伝搬断面図">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F6FAFC" /><stop offset="1" stopColor="#E2EDF4" /></linearGradient>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#CFDCE5" /><line x1="0" y1="0" x2="0" y2="6" stroke="#9FB4C2" strokeWidth="1.4" /></pattern>
      </defs>
      <rect x={AX.l} y={top} width={plotW} height={groundY - top} fill="url(#sky)" stroke={C.line} />
      {buildings.map((b, i) => <g key={i} opacity="0.9"><rect x={b.x} y={groundY - b.h} width={b.w} height={b.h} fill="#C6D4DD" stroke="#9FB4C2" strokeWidth="1" /><rect x={b.x + 3} y={groundY - b.h + 6} width={Math.max(4, b.w - 6)} height="5" fill="#EAF1F5" /></g>)}
      {walls.map((wx, i) => <rect key={i} x={wx} y={top + 8} width={9} height={groundY - top - 8} fill="url(#hatch)" stroke="#9FB4C2" />)}
      <line x1={antX} y1={antY} x2={rxX} y2={rxY} stroke={C.blue} strokeWidth="1.2" strokeDasharray="2 5" opacity="0.7" />
      <line x1={AX.l} x2={AX.W - AX.r} y1={groundY} y2={groundY} stroke={C.ink} strokeWidth="1.6" />
      <MeterGraphic utility={utility} txX={txX} txY={txY} groundY={groundY} antX={antX} antY={antY} reduced={reduced} floodOn={floodOn} metalLid={placeKey === "pit_metal"} />
      <text x={txX - 2} y={groundY + (utility === "water" ? 34 : 17)} textAnchor="middle" fontSize="11" fill={C.ink} fontWeight="700">{uMeta.icon} {uMeta.label}メーター</text>
      <text x={txX - 2} y={groundY + (utility === "water" ? 46 : 30)} textAnchor="middle" fontSize="10" fill={C.sub}>{place.label}</text>
      <g>
        <line x1={rxX} y1={groundY} x2={rxX} y2={rxY} stroke="#6B5B45" strokeWidth="4" />
        <line x1={rxX - 12} y1={rxY + 2} x2={rxX + 12} y2={rxY + 2} stroke={C.ink} strokeWidth="2" />
        <line x1={rxX} y1={rxY + 2} x2={rxX} y2={rxY - 12} stroke={C.ink} strokeWidth="2" />
        <circle cx={rxX} cy={rxY - 13} r="2.4" fill={C.ink} />
        <text x={rxX} y={groundY + 16} textAnchor="middle" fontSize="11" fill={C.ink} fontWeight="700">受信局</text>
        <text x={rxX} y={groundY + 29} textAnchor="middle" fontSize="10" fill={C.sub}>目標 {fmtDistance(dTest)}</text>
      </g>
      {Number.isFinite(maxMX) && maxMX <= AX.W - AX.r && maxMX >= AX.l && (
        <g><line x1={maxMX} y1={top + 4} x2={maxMX} y2={groundY} stroke={C.ok} strokeWidth="1.6" strokeDasharray="6 4" /><rect x={clamp(maxMX - 58, AX.l, AX.W - AX.r - 116)} y={top + 4} width={116} height={18} rx="9" fill={C.ok} /><text x={clamp(maxMX - 58, AX.l, AX.W - AX.r - 116) + 58} y={top + 17} textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">最大 {fmtDistance(maxD)}</text></g>
      )}
      {heat.map((s, i) => <rect key={i} x={s.x} y={groundY + 2} width={s.w} height={6} fill={s.c} opacity="0.85" />)}
    </svg>
  );
}

function MarginChart({ line, pts, maxX, target, maxMarker, worstLine, sens, dTest }) {
  const W = AX.W;
  const H = 330;
  const M = { l: AX.l, r: AX.r, t: 28, b: 58 };
  const PW = W - M.l - M.r;
  const PH = H - M.t - M.b;
  const x = (d) => xOf(d, maxX);
  const all = [target, ...line.map((p) => p.m), ...worstLine.map((p) => p.m), ...pts.map((p) => p.m)].filter(Number.isFinite);
  let yMin = all.length ? Math.min(...all) : -20;
  let yMax = all.length ? Math.max(...all) : 50;
  if (yMax - yMin < 10) { const mid = (yMax + yMin) / 2; yMin = mid - 10; yMax = mid + 10; }
  const pad = Math.max(5, (yMax - yMin) * 0.12);
  yMin -= pad; yMax += pad;
  const y = (m) => M.t + ((yMax - m) / (yMax - yMin)) * PH;
  const poly = line.map((p) => `${x(p.d).toFixed(1)},${y(p.m).toFixed(1)}`).join(" ");
  const polyWorst = worstLine.map((p) => `${x(p.d).toFixed(1)},${y(p.m).toFixed(1)}`).join(" ");
  const xTicks = X_TICKS.filter((v) => v <= maxX);
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) * i) / 4);
  const yClip = (m) => clamp(y(m), M.t, H - M.b);
  const safeY = M.t;
  const safeH = Math.max(0, yClip(target) - M.t);
  const warnY = yClip(target);
  const warnH = Math.max(0, yClip(0) - yClip(target));
  const ngY = yClip(0);
  const ngH = Math.max(0, H - M.b - yClip(0));
  const targetX = clamp(x(dTest), M.l, W - M.r);
  const targetPoint = (() => {
    if (!line.length) return null;
    let best = line[0], bestErr = Infinity;
    for (const p of line) {
      const e = Math.abs(log10(p.d) - log10(dTest));
      if (e < bestErr) { best = p; bestErr = e; }
    }
    return best;
  })();
  const targetY = targetPoint ? y(targetPoint.m) : NaN;
  const markerColor = targetPoint ? marginColor(targetPoint.m, target) : C.sub;
  const [tip, setTip] = useState(null);
  const nearestLinePoint = (dist) => {
    if (!line.length) return null;
    let best = line[0], bestErr = Infinity;
    for (const p of line) { const e = Math.abs(log10(p.d) - log10(dist)); if (e < bestErr) { best = p; bestErr = e; } }
    return best;
  };
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    if (px < M.l || px > W - M.r) return setTip(null);
    const dist = 10 ** (clamp((px - M.l) / PW, 0, 1) * log10(maxX));
    const p = nearestLinePoint(dist);
    setTip(p ? { ...p, x: x(p.d), y: y(p.m) } : null);
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", cursor: "crosshair" }} onPointerMove={onMove} onPointerLeave={() => setTip(null)} aria-label="マージンと距離のグラフ">
      <defs>
        <filter id="markerShadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#102330" floodOpacity="0.22" /></filter>
      </defs>
      <rect x={M.l} y={M.t} width={PW} height={PH} fill="#FFFFFF" stroke={C.line} />
      <rect x={M.l} y={safeY} width={PW} height={safeH} fill={C.okBg} opacity="0.72" />
      <rect x={M.l} y={warnY} width={PW} height={warnH} fill={C.warnBg} opacity="0.78" />
      <rect x={M.l} y={ngY} width={PW} height={ngH} fill={C.ngBg} opacity="0.78" />
      <text x={M.l + 10} y={M.t + 18} fontSize="12" fill={C.ok} fontWeight="800">安全域</text>
      {warnH > 18 && <text x={M.l + 10} y={warnY + 17} fontSize="12" fill={C.warn} fontWeight="800">注意域</text>}
      {ngH > 18 && <text x={M.l + 10} y={ngY + 17} fontSize="12" fill={C.ng} fontWeight="800">不成立域</text>}
      {yTicks.map((v, i) => <g key={i}><line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="#CAD7DE" strokeWidth="1" opacity="0.7" /><text x={M.l - 10} y={y(v) + 4} textAnchor="end" fontSize="12" fill={C.sub} fontFamily="ui-monospace,monospace">{Math.round(v)}</text></g>)}
      {xTicks.map((v) => <g key={v}><line x1={x(v)} x2={x(v)} y1={M.t} y2={H - M.b} stroke="#D8E3E9" opacity="0.8" /><text x={x(v)} y={H - M.b + 20} textAnchor="middle" fontSize="12" fill={C.sub} fontFamily="ui-monospace,monospace">{fmtTick(v)}</text></g>)}
      {0 >= yMin && 0 <= yMax && <><line x1={M.l} x2={W - M.r} y1={y(0)} y2={y(0)} stroke={C.ng} strokeWidth="1.7" opacity="0.75" /><text x={W - M.r - 8} y={y(0) + 15} textAnchor="end" fontSize="11" fill={C.ng} fontWeight="800">受信限界 0 dB</text></>}
      {Number.isFinite(target) && <><line x1={M.l} x2={W - M.r} y1={y(target)} y2={y(target)} stroke={C.ink} strokeDasharray="8 6" strokeWidth="1.5" opacity="0.85" /><rect x={W - M.r - 100} y={y(target) - 24} width="92" height="18" rx="9" fill={C.ink} opacity="0.9" /><text x={W - M.r - 54} y={y(target) - 11} textAnchor="middle" fontSize="11" fill="#fff" fontWeight="800">目標 {fmt(target, 0)} dB</text></>}
      {Number.isFinite(maxMarker) && maxMarker > 0 && maxMarker <= maxX && <><line x1={x(maxMarker)} x2={x(maxMarker)} y1={M.t} y2={H - M.b} stroke={C.ok} strokeWidth="1.8" strokeDasharray="8 4" /><text x={clamp(x(maxMarker), M.l + 52, W - M.r - 52)} y={M.t - 8} textAnchor="middle" fontSize="11.5" fill={C.ok} fontWeight="800">最大 {fmtDistance(maxMarker)}</text></>}
      <line x1={targetX} x2={targetX} y1={M.t} y2={H - M.b} stroke={markerColor} strokeWidth="2.4" opacity="0.9" />
      <rect x={clamp(targetX - 56, M.l, W - M.r - 112)} y={H - M.b - 28} width="112" height="22" rx="11" fill={markerColor} filter="url(#markerShadow)" />
      <text x={clamp(targetX - 56, M.l, W - M.r - 112) + 56} y={H - M.b - 13} textAnchor="middle" fontSize="12" fill="#fff" fontWeight="800">目標 {fmtDistance(dTest)}</text>
      <polyline points={polyWorst} fill="none" stroke={C.ng} strokeWidth="2.2" strokeDasharray="7 6" opacity="0.9" />
      <polyline points={poly} fill="none" stroke={C.ink} strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" />
      {Number.isFinite(targetY) && targetY >= M.t && targetY <= H - M.b && <g filter="url(#markerShadow)"><circle cx={targetX} cy={targetY} r="8" fill="#fff" stroke={markerColor} strokeWidth="4" /><text x={clamp(targetX + 16, M.l, W - M.r - 142)} y={clamp(targetY - 12, M.t + 14, H - M.b - 34)} fontSize="12" fill={markerColor} fontWeight="800">判定 {fmtSigned(targetPoint.m)} dB</text></g>}
      {pts.map((p, i) => <g key={i}><rect x={x(p.d) - 5} y={y(p.m) - 5} width="10" height="10" fill={C.blue} stroke="#fff" strokeWidth="2" transform={`rotate(45 ${x(p.d)} ${y(p.m)})`} /><text x={x(p.d) + 8} y={y(p.m) - 8} fontSize="10" fill={C.blue} fontWeight="800">{p.point}</text></g>)}
      <text x={M.l + PW / 2} y={H - 18} textAnchor="middle" fontSize="13" fill={C.ink}>距離 (m) ※対数目盛</text>
      <text x="18" y={M.t + PH / 2} textAnchor="middle" fontSize="13" fill={C.ink} transform={`rotate(-90 18 ${M.t + PH / 2})`}>マージン (dB)</text>
      {tip && <g pointerEvents="none"><line x1={tip.x} x2={tip.x} y1={M.t} y2={H - M.b} stroke={C.ink} opacity="0.18" /><rect x={clamp(tip.x + 12, M.l, W - M.r - 224)} y={clamp(tip.y - 76, M.t, H - M.b - 66)} width={224} height={66} rx={10} fill="#102330" opacity={0.94} /><text x={clamp(tip.x + 12, M.l, W - M.r - 224) + 10} y={clamp(tip.y - 76, M.t, H - M.b - 66) + 22} fontSize="12" fill="#D8E6EE">距離 {fmtDistance(tip.d)}</text><text x={clamp(tip.x + 12, M.l, W - M.r - 224) + 10} y={clamp(tip.y - 76, M.t, H - M.b - 66) + 42} fontSize="12" fill="#D8E6EE">マージン {fmtSigned(tip.m)} dB / Prx {fmt(tip.m + sens)} dBm</text></g>}
    </svg>
  );
}

function buildExplanation(args) {
  const { judge, mJudge, mNominal, mWorst, targetMargin, dTest, place, floodOn, autoPolLoss, totalPolLoss, freq, model, maxDistance, lossBreakdown, outageRisk } = args;
  const lines = [];
  lines.push(`目標距離 ${fmtDistance(dTest)} における判定用マージンは ${fmtSigned(mJudge)} dBです。通常条件では ${fmtSigned(mNominal)} dB、悲観条件では ${fmtSigned(mWorst)} dBです。`);
  if (judge.level === "ok") lines.push(`目標マージン ${fmt(targetMargin, 0)} dBを満たしており、現在条件では安定通信が期待できます。ただし、現地RSSIログでの照合は推奨です。`);
  if (judge.level === "warn") lines.push("受信感度は上回っていますが、目標マージン不足です。雨天・車両・人体近接・端末姿勢・個体差で断続的な通信失敗が起きる可能性があります。");
  if (judge.level === "ng") lines.push("評価範囲内で受信感度を下回る条件があります。対策なしでの安定通信は難しく、アンテナ位置や設置条件の見直しが必要です。");
  if (judge.level === "bad") lines.push("通信不能リスクが高い条件です。机上計算上のdB加算だけでなく、外部アンテナ化・蓋材変更・中継局追加を前提に検討してください。");
  if (place.outageRisk) lines.push(`${place.label}は遮蔽損失が非常に大きい条件です。10dB程度ではなく、${fmt(place.lossMin, 0)}〜${fmt(place.lossMax, 0)}dB級の損失、または通信不能シナリオを併記するのが安全です。`);
  if (floodOn) lines.push(`浸水条件では水による吸収とアンテナ整合悪化が重なります。通常+${FLOOD_LOSS.nominal}dB、悲観+${FLOOD_LOSS.max}dB以上の悪化を見込んでいます。`);
  if (autoPolLoss >= 15) lines.push(`偏波不一致による損失が大きい条件です。現在の偏波損失は合計 ${fmt(totalPolLoss, 0)}dBです。端末の向き、受信局アンテナの偏波、取付姿勢の統一が有効です。`);
  if (freq >= 3000) lines.push("3GHz以上では自由空間損失と遮蔽損失の両方が大きくなります。メーター用途の金属・地下・屋内条件では700〜920MHz帯より不利です。");
  if (model === "TWO") lines.push("2波モデルでは反射波との干渉によりヌルが発生します。このアプリでは目標距離周辺の最小マージンでリンク判定し、最大到達距離は近距離ヌルで打ち切らず遠方側の最後成立距離として算出しています。");
  const topLosses = lossBreakdown.filter((x) => x.value > 0).slice(0, 3).map((x, i) => `${i + 1}. ${x.label}: ${fmt(x.value, 0)}dB`).join(" / ");
  if (topLosses) lines.push(`主な損失要因は、${topLosses} です。`);
  lines.push(`現在条件での最大到達距離目安は ${fmtDistance(maxDistance)} です。`);
  return lines.join("\n");
}

/** =====================================================================
 *  App
 *  ===================================================================== */
export default function App() {
  const css = useMemo(() => `
    .app{--ink:${C.ink};--sub:${C.sub};--line:${C.line};font-family:"Hiragino Kaku Gothic ProN","Hiragino Sans","Yu Gothic UI","Noto Sans JP",system-ui,sans-serif;background:repeating-linear-gradient(0deg,transparent 0 31px,rgba(43,93,168,.05) 31px 32px),repeating-linear-gradient(90deg,transparent 0 31px,rgba(43,93,168,.05) 31px 32px),${C.paper};color:var(--ink);min-height:100vh}.wrap{max-width:1320px;margin:0 auto;padding:16px 16px 40px}.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.head{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;border-bottom:2px solid var(--ink);padding-bottom:12px;margin-bottom:14px}.eyebrow{font-size:11px;letter-spacing:.22em;color:${C.blue};font-weight:700}.title{font-size:23px;font-weight:800;margin:2px 0 0;letter-spacing:.02em}.sub{font-size:12px;color:var(--sub);margin-top:3px}.btn{border:1px solid var(--line);background:#fff;border-radius:9px;padding:7px 12px;font-size:12px;cursor:pointer;color:var(--ink)}.btn:hover{border-color:${C.blue}}.btnP{background:var(--ink);color:#fff;border-color:var(--ink)}.seg{display:flex;border:1px solid var(--line);border-radius:9px;overflow:hidden;background:#fff}.seg button{border:0;background:transparent;padding:7px 14px;font-size:12.5px;cursor:pointer;color:var(--ink)}.seg button.on{background:var(--ink);color:#fff;font-weight:700}.modelBox{margin:-2px 0 12px;background:#F6F9FB;border:1px solid var(--line);border-left:4px solid ${C.blue};border-radius:0 10px 10px 0;padding:9px 12px}.modelName{font-size:12px;font-weight:800;color:${C.blue};margin-bottom:3px}.modelText{font-size:12px;line-height:1.55;color:#33454F}.guide{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:0 0 12px}.guidePane{background:#fff;border:1px solid var(--line);border-radius:11px;padding:11px 12px}.guideTitle{font-size:11px;font-weight:800;letter-spacing:.12em;color:${C.blue};text-transform:uppercase;margin-bottom:7px}.guideMain{font-size:13px;font-weight:800;color:var(--ink);line-height:1.35}.guideList{margin:7px 0 0;padding-left:17px;font-size:12px;line-height:1.55;color:#33454F}.guideList li{margin:2px 0}.modelChoices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.modelChoice{border:1px solid var(--line);border-radius:8px;padding:7px;background:#F6F9FB}.modelChoice.on{border-color:${C.blue};box-shadow:inset 0 0 0 1px ${C.blue};background:#EEF5FB}.modelChoice b{display:block;font-size:12px;color:var(--ink);margin-bottom:2px}.modelChoice span{display:block;font-size:10.5px;line-height:1.35;color:var(--sub)}.readout{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.readCell{border-left:3px solid var(--line);padding:2px 0 2px 8px}.readCell b{display:block;font-size:12px;color:var(--ink)}.readCell span{display:block;font-size:10.5px;line-height:1.35;color:var(--sub)}.grid{display:grid;grid-template-columns:1fr;gap:14px;margin-top:14px}@media(min-width:1020px){.grid{grid-template-columns:430px 1fr}}.card{background:${C.panel};border:1px solid var(--line);border-radius:13px;padding:14px;box-shadow:0 1px 2px rgba(16,35,48,.05)}.ct{font-size:12px;font-weight:800;letter-spacing:.14em;color:${C.blue};margin-bottom:10px;text-transform:uppercase}.step{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800;margin:14px 0 8px}.step:first-of-type{margin-top:0}.stepNo{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;background:var(--ink);color:#fff;font-size:12px;font-weight:800}.grp{font-size:11px;font-weight:700;color:var(--sub);letter-spacing:.1em;border-top:1px dashed var(--line);padding-top:10px;margin:12px 0 8px}.grp:first-of-type{border-top:0;margin-top:0;padding-top:0}.fields{display:grid;grid-template-columns:1fr 1fr;gap:7px 12px}.field{display:flex;align-items:center;justify-content:space-between;gap:10px}.lab{font-size:12.5px;color:#33454F;cursor:help;outline:none;border-bottom:1px dotted #B9C7CF}.in{border:1px solid var(--line);border-radius:8px;padding:6px 8px;font-size:13px;background:#fff;width:108px;text-align:right;font-family:ui-monospace,"SF Mono",Consolas,monospace}.sel{width:210px;text-align:left;font-family:inherit}.small{font-size:11px;color:var(--sub);margin-top:2px;line-height:1.35}.pick{display:grid;gap:8px}.pk{display:flex;flex-direction:column;align-items:center;gap:2px;border:1.5px solid var(--line);background:#fff;border-radius:11px;padding:9px 6px;cursor:pointer;color:var(--ink)}.pk:hover{border-color:${C.blue}}.pk.on{border-color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink);background:#F6F9FB}.pkIcon{font-size:20px;line-height:1}.pkBig .pkIcon{font-size:26px}.pkLabel{font-size:12px;font-weight:800;text-align:center;line-height:1.2}.pkSub{font-size:10.5px;color:var(--sub);text-align:center;line-height:1.2}.bandSel{width:100%;border:1px solid var(--line);border-radius:9px;padding:8px 10px;font-size:13px;background:#fff;color:var(--ink);font-family:inherit;box-sizing:border-box}.floodChk{display:flex;align-items:center;gap:8px;font-size:12px;color:#33454F;background:#F2F6F9;border:1px dashed var(--line);border-radius:9px;padding:8px 11px;margin-top:8px;cursor:pointer}.sliderRow{display:flex;align-items:center;gap:12px}.slider{flex:1;accent-color:${C.ink};height:26px}.sliderVal{font-family:ui-monospace,"SF Mono",Consolas,monospace;font-size:16px;font-weight:800;min-width:88px;text-align:right}.chips{display:flex;gap:6px;flex-wrap:wrap}.chip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:4px 11px;font-size:11.5px;cursor:pointer;color:var(--ink)}.kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}@media(max-width:980px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}.kpi{background:#F6F9FB;border:1px solid var(--line);border-radius:11px;padding:11px 12px}.kpik{font-size:11px;color:var(--sub);letter-spacing:.06em}.kpiv{font-size:20px;font-weight:800;margin-top:3px;font-family:ui-monospace,"SF Mono",Consolas,monospace;letter-spacing:-.01em}.unit{font-size:12px;font-weight:600;color:var(--sub);margin-left:3px}.badge{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:5px 12px;font-size:14px;font-weight:800;margin-top:2px}.dot{width:9px;height:9px;border-radius:999px}.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:11.5px;color:var(--sub);margin-top:8px;align-items:center}.legend span{display:inline-flex;align-items:center;gap:6px}.sw{display:inline-block;width:16px;height:3px;border-radius:2px}.swd{display:inline-block;width:9px;height:9px;transform:rotate(45deg);background:${C.blue}}.note{margin-top:10px;font-size:12px;background:#F2F6F9;border:1px solid var(--line);border-radius:10px;padding:9px 11px;line-height:1.5}.uNote{font-size:12px;line-height:1.55;background:#F6F9FB;border-left:3px solid var(--ink);padding:8px 11px;border-radius:0 9px 9px 0;margin-top:8px}.help{font-size:12px;line-height:1.58;color:#33454F;background:#F6F9FB;border:1px dashed var(--line);border-radius:10px;padding:10px 12px;min-height:84px;white-space:pre-wrap}.tableWrap{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:960px;font-size:12px;font-family:ui-monospace,"SF Mono",Consolas,monospace}th,td{padding:7px 8px;border-bottom:1px solid ${C.grid};white-space:nowrap;text-align:center}thead th{background:#F2F6F9;border-bottom:1.5px solid var(--line);font-family:inherit;font-size:11.5px;color:#33454F}.tin{border:1px solid var(--line);border-radius:7px;padding:4px 6px;font-size:12px;background:#fff;font-family:inherit}.tinP{width:88px}.tinD{width:92px;text-align:right}.tinR{width:70px;text-align:right}.toast{position:fixed;right:14px;bottom:14px;background:#102330;color:#D8E6EE;border-radius:12px;padding:10px 14px;font-size:12px;max-width:380px;z-index:50;box-shadow:0 6px 20px rgba(16,35,48,.3)}.modalBg{position:fixed;inset:0;background:rgba(16,35,48,.5);z-index:60;display:flex;align-items:center;justify-content:center;padding:14px}.modal{width:min(900px,100%);background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px}.modal h3{margin:0 0 10px;font-size:14px}.modal textarea{width:100%;height:230px;border:1px solid var(--line);border-radius:11px;padding:10px;font-size:12px;font-family:ui-monospace,Consolas,monospace;box-sizing:border-box}.acts{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}pre{white-space:pre-wrap;margin:0;font-size:12px;line-height:1.5;font-family:ui-monospace,"SF Mono",Consolas,monospace}.footer{margin-top:18px;font-size:11px;color:var(--sub);border-top:1px solid var(--line);padding-top:10px;line-height:1.6}@media(max-width:700px){.pick{grid-template-columns:repeat(2,minmax(0,1fr)) !important}.modelChoices,.readout{grid-template-columns:1fr}}
  `, []);

  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setReduced(mq.matches);
    const fn = (e) => setReduced(e.matches);
    mq.addEventListener?.("change", fn);
    return () => mq.removeEventListener?.("change", fn);
  }, []);

  const [helpKey, setHelpKey] = useState("dB");
  const [model, setModel] = useState("FS"); // FS | CI | TWO
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState(null);
  const setModalText = (t) => setModal((m) => (m ? { ...m, text: t } : m));
  const flash = useCallback((msg) => { setStatus(msg); setTimeout(() => setStatus(""), 1900); }, []);

  const freq = useNum(920, { min: 1, max: 100000 });
  const dTest = useNum(300, { min: 1 });
  const graphMaxKm = useNum(20, { min: 2, max: 1000 });
  const txP = useNum(13);
  const txG = useNum(-2);
  const rxG = useNum(0);
  const sens = useNum(-105);
  const targetMargin = useNum(10, { min: 0 });
  const [envKey, setEnvKey] = useState("urban");
  const [placeKey, setPlaceKey] = useState("wall");
  const [floodOn, setFloodOn] = useState(false);
  const [lectureScenarioKey, setLectureScenarioKey] = useState("none");
  const addLoss = useNum(0, { min: 0 });
  const polExtraLoss = useNum(0, { min: 0 });
  const bodyLoss = useNum(0, { min: 0 });
  const ht = useNum(1.8, { min: 0.1 });
  const hr = useNum(5, { min: 0.1 });
  const nullPct = useNum(10, { min: 0, max: 50 });
  const txCable = useNum(0, { min: 0 });
  const txVswr = useNum(0, { min: 0 });
  const txEff = useNum(0, { min: 0 });
  const rxCable = useNum(0, { min: 0 });
  const rxVswr = useNum(0, { min: 0 });
  const rxEff = useNum(0, { min: 0 });
  const [txPol, setTxPol] = useState("V");
  const [rxPol, setRxPol] = useState("V");
  const [utility, setUtility] = useState("elec");
  const [bandKey, setBandKey] = useState("wisun");

  const applyBand = (key, silent = false) => {
    setBandKey(key);
    const b = BANDS.find((q) => q.key === key);
    if (!b) return;
    freq.setV(b.freq); txP.setV(b.txP); sens.setV(b.sens);
    if (!silent) flash(`通信方式「${b.label}」の代表値を設定しました`);
  };
  const applyUtility = (key) => {
    setUtility(key);
    const u = UTILITIES.find((q) => q.key === key);
    if (!u) return;
    applyBand(u.v.band, true);
    txG.setV(u.v.txG); rxG.setV(u.v.rxG); targetMargin.setV(u.v.margin);
    setEnvKey(u.v.env); setPlaceKey(u.v.place); setFloodOn(false);
    ht.setV(u.v.ht); hr.setV(u.v.hr); dTest.setV(u.v.dTest);
    setTxPol(u.v.txPol); setRxPol(u.v.rxPol);
    flash(`「${u.label}メーター」の代表値を設定しました`);
  };

  const [rows, setRows] = useState([10, 30, 100, 300, 500, 1000, 1500, 2000].map((d, i) => ({ point: `P${i + 1}`, d, rssi: [NaN, NaN, NaN, NaN, NaN] })));

  const place = PLACES.find((p) => p.key === placeKey) || PLACES[0];
  const env = ENV_OPTIONS.find((o) => o.key === envKey) || ENV_OPTIONS[0];
  const isPit = placeKey.startsWith("pit");
  const lambda = 300 / freq.v;
  const txLoss = txCable.v + txVswr.v + txEff.v;
  const rxLoss = rxCable.v + rxVswr.v + rxEff.v;
  const eirp = txP.v + txG.v - txLoss;
  const autoPolLoss = calcPolLoss(txPol, rxPol);
  const totalPolLoss = autoPolLoss + polExtraLoss.v;
  const floodNom = floodOn && isPit ? FLOOD_LOSS.nominal : 0;
  const floodWorst = floodOn && isPit ? FLOOD_LOSS.max : 0;
  const lectureScenario = LECTURE_SCENARIOS.find((s) => s.key === lectureScenarioKey) || LECTURE_SCENARIOS[0];
  const lectureLoss = lectureScenario.loss;

  const envLossNominal = env.loss + place.loss + floodNom + lectureLoss + addLoss.v + totalPolLoss + bodyLoss.v;
  const envLossWorst = env.lossMax + place.lossMax + floodWorst + lectureLoss + addLoss.v + totalPolLoss + bodyLoss.v;
  const dbp = (4 * Math.PI * ht.v * hr.v) / lambda;

  const basePathLoss = useCallback((d, envLossValue, useWorst = false) => {
    const fspl = 32.44 + 20 * log10(freq.v) + 20 * log10(d / 1000);
    if (model === "CI") {
      const n = useWorst ? Math.max(env.n + 0.5, env.n) : env.n;
      const fspl1m = 32.44 + 20 * log10(freq.v) + 20 * log10(0.001);
      return fspl1m + 10 * n * log10(d) + envLossValue;
    }
    if (model === "TWO") {
      const dr = Math.sqrt(d * d + (ht.v + hr.v) ** 2) - Math.sqrt(d * d + (ht.v - hr.v) ** 2);
      const interference = clamp(Math.abs(2 * Math.sin((Math.PI * dr) / lambda)), 1e-9);
      return fspl - 20 * log10(interference) + envLossValue;
    }
    let loss = fspl + envLossValue;
    if (d > dbp) loss += 20 * log10(d / dbp); // 遠方d^4傾向の簡易補正
    return loss;
  }, [freq.v, model, env.n, ht.v, hr.v, lambda, dbp]);

  const prxAt = useCallback((d) => eirp + rxG.v - rxLoss - basePathLoss(d, envLossNominal, false), [eirp, rxG.v, rxLoss, basePathLoss, envLossNominal]);
  const marginAt = useCallback((d) => prxAt(d) - sens.v, [prxAt, sens.v]);
  const prxWorstAt = useCallback((d) => eirp + rxG.v - rxLoss - basePathLoss(d, envLossWorst, true), [eirp, rxG.v, rxLoss, basePathLoss, envLossWorst]);
  const marginWorstAt = useCallback((d) => prxWorstAt(d) - sens.v, [prxWorstAt, sens.v]);

  const windowPct = model === "TWO" ? nullPct.v / 100 : 0;
  const windowStats = useCallback((d, fn = marginAt) => {
    if (windowPct <= 0) { const m = fn(d); return { min: m, avg: m }; }
    const n = 11;
    let mn = Infinity, sum = 0;
    for (let i = 0; i < n; i++) {
      const f = 1 - windowPct + (2 * windowPct * i) / (n - 1);
      const m = fn(d * f);
      mn = Math.min(mn, m); sum += m;
    }
    return { min: mn, avg: sum / n };
  }, [marginAt, windowPct]);

  const evalStats = useMemo(() => model === "TWO" ? windowStats(dTest.v, marginAt) : { min: marginAt(dTest.v), avg: marginAt(dTest.v) }, [model, windowStats, marginAt, dTest.v]);
  const evalWorstStats = useMemo(() => model === "TWO" ? windowStats(dTest.v, marginWorstAt) : { min: marginWorstAt(dTest.v), avg: marginWorstAt(dTest.v) }, [model, windowStats, marginWorstAt, dTest.v]);
  const mNominal = marginAt(dTest.v);
  const mJudge = evalStats.min;
  const mWorst = evalWorstStats.min;

  const outageRisk = place.outageRisk || (floodOn && isPit) || envLossWorst >= 95;
  const judge = useMemo(() => {
    if (outageRisk && mWorst < 0) return { level: "bad", label: "通信不能リスク", color: C.bad, bg: C.badBg, desc: "遮蔽・浸水・悲観条件で通信不能の恐れ" };
    if (mJudge >= targetMargin.v && mWorst >= 0) return { level: "ok", label: "安定", color: C.ok, bg: C.okBg, desc: "通常条件で目標マージンを満たします" };
    if (mJudge >= 0) return { level: "warn", label: "要注意", color: C.warn, bg: C.warnBg, desc: "受信可能だが余裕不足です" };
    return { level: "ng", label: "対策必要", color: C.ng, bg: C.ngBg, desc: "受信感度を下回る条件があります" };
  }, [outageRisk, mWorst, mJudge, targetMargin.v]);

  const maxDistanceMain = useMemo(() => {
    const fn = model === "TWO" ? (d) => windowStats(d, marginAt).min : marginAt;
    return model === "TWO" ? searchFarthestPassingDistance(fn, targetMargin.v) : searchReliableDistance(fn, targetMargin.v, 1e7, 1000);
  }, [model, windowStats, marginAt, targetMargin.v]);
  const maxDistanceWorst = useMemo(() => {
    const fn = model === "TWO" ? (d) => windowStats(d, marginWorstAt).min : marginWorstAt;
    return model === "TWO" ? searchFarthestPassingDistance(fn, targetMargin.v) : searchReliableDistance(fn, targetMargin.v, 1e7, 1000);
  }, [model, windowStats, marginWorstAt, targetMargin.v]);

  const tableData = useMemo(() => rows.map((r) => {
    const med = median(r.rssi);
    const pred = prxAt(r.d);
    return { ...r, median: med, pred, estAdd: Number.isFinite(med) ? clamp(pred - med, 0) : NaN };
  }), [rows, prxAt]);
  const recAddLoss = useMemo(() => median(tableData.map((r) => r.estAdd)), [tableData]);

  const graphMaxX = useMemo(() => clamp(Math.max(2000, dTest.v, graphMaxKm.v * 1000, maxDistanceMain * 1.15), 2000, 1000000), [dTest.v, graphMaxKm.v, maxDistanceMain]);
  const line = useMemo(() => Array.from({ length: 180 }, (_, i) => {
    const d = 10 ** ((log10(graphMaxX) * i) / 179);
    return { d, m: marginAt(d) };
  }), [graphMaxX, marginAt]);
  const worstLine = useMemo(() => Array.from({ length: 180 }, (_, i) => {
    const d = 10 ** ((log10(graphMaxX) * i) / 179);
    return { d, m: marginWorstAt(d) };
  }), [graphMaxX, marginWorstAt]);
  const pts = useMemo(() => tableData.filter((r) => Number.isFinite(r.median)).map((r) => ({ d: r.d, m: r.median - sens.v, point: r.point, median: r.median, estAdd: r.estAdd })), [tableData, sens.v]);

  const lossBreakdown = useMemo(() => [
    { label: "設置遮蔽", value: place.loss },
    { label: "周辺環境", value: env.loss },
    { label: "浸水", value: floodNom },
    { label: "講演シナリオ", value: lectureLoss },
    { label: "偏波", value: totalPolLoss },
    { label: "人体/近接", value: bodyLoss.v },
    { label: "現場補正", value: addLoss.v },
    { label: "Tx実装損失", value: txLoss },
    { label: "Rx実装損失", value: rxLoss },
  ].sort((a, b) => b.value - a.value), [place.loss, env.loss, floodNom, lectureLoss, totalPolLoss, bodyLoss.v, addLoss.v, txLoss, rxLoss]);

  const explanation = useMemo(() => buildExplanation({ judge, mJudge, mNominal, mWorst, targetMargin: targetMargin.v, dTest: dTest.v, place, floodOn, autoPolLoss, totalPolLoss, freq: freq.v, model, maxDistance: maxDistanceMain, lossBreakdown, outageRisk }), [judge, mJudge, mNominal, mWorst, targetMargin.v, dTest.v, place, floodOn, autoPolLoss, totalPolLoss, freq.v, model, maxDistanceMain, lossBreakdown, outageRisk]);

  const uMeta = UTILITIES.find((u) => u.key === utility) || UTILITIES[0];
  const bMeta = BANDS.find((b) => b.key === bandKey);
  const modelNote = MODEL_NOTES[model] || MODEL_NOTES.FS;
  const actionItems = JUDGE_ACTIONS[judge.level] || JUDGE_ACTIONS.warn;
  const graphParams = [
    ["メーター", `${uMeta.label}`],
    ["方式", bMeta?.label ?? "カスタム"],
    ["モデル", model === "TWO" ? "2波" : model],
    ["周波数", `${fmt(freq.v, 0)} MHz`],
    ["目標距離", fmtDistance(dTest.v)],
    ["目標余裕", `${fmt(targetMargin.v, 0)} dB`],
    ["講演条件", lectureScenario.loss ? `${lectureScenario.label} +${lectureScenario.loss} dB` : "なし"],
    ["設置", `${place.label}${floodOn ? " / 浸水あり" : ""}`],
    ["環境", env.label],
    ["高さ", `Tx ${fmt(ht.v, 1)} m / Rx ${fmt(hr.v, 1)} m`],
    ["損失", `通常 ${fmt(envLossNominal, 0)} dB / 悲観 ${fmt(envLossWorst, 0)} dB`],
  ];

  const updateRow = (idx, key, val) => setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));
  const updateRssi = (idx, j, val) => setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, rssi: r.rssi.map((v, k) => (k === j ? val : v)) } : r)));
  const addRow = () => setRows((rs) => [...rs, { point: `P${rs.length + 1}`, d: rs.length ? rs[rs.length - 1].d + 100 : 100, rssi: [NaN, NaN, NaN, NaN, NaN] }]);
  const sortRows = () => { setRows((rs) => [...rs].sort((a, b) => a.d - b.d)); flash("距離順に並び替えました"); };
  const clearLogs = () => { setRows((rs) => rs.map((r) => ({ ...r, rssi: [NaN, NaN, NaN, NaN, NaN] }))); flash("RSSIをクリアしました"); };
  const applyRecAdd = () => { if (!Number.isFinite(recAddLoss)) return; addLoss.setV(round(addLoss.v + recAddLoss, 1)); flash("推奨現場補正損失を加算しました"); };
  const syncGraphRange = () => { graphMaxKm.setV(clamp(Math.ceil((maxDistanceMain * 1.2) / 1000), 2, 1000)); flash("表示距離上限を自動調整しました"); };
  const openCSVExport = () => setModal({ title: "CSV出力（コピーして利用）", text: toCSV(tableData), mode: "view" });
  const openCSVImport = () => setModal({ title: "CSV/TSV貼り付け（Point, 距離, RSSI1..5）", text: "Point,Distance_m,RSSI1,RSSI2,RSSI3,RSSI4,RSSI5\nP1,10,-70,-71,-69,-70,-70\nP2,30,-82,-81,-83,-82,-82\n", mode: "import" });
  const applyCSVImport = () => {
    const parsed = parseLog(modal?.text || "");
    if (!parsed.length) return flash("取り込める行がありません。形式を確認してください");
    setRows(parsed.slice(0, 30)); setModal(null); flash(`取り込み完了: ${parsed.length} 行`);
  };
  const resultText = [
    `種別: ${uMeta.label}メーター / 方式: ${bMeta?.label ?? "カスタム"} / 設置: ${place.label}${floodOn ? "（浸水あり）" : ""}`,
    `${fmt(freq.v, 0)} MHz / モデル: ${model} / 目標マージン: ${fmt(targetMargin.v, 0)} dB`,
    `講演シナリオ: ${lectureScenario.label}${lectureLoss ? `（+${lectureLoss} dB）` : ""}`,
    `EIRP: ${fmt(eirp)} dBm / 通常損失計: ${fmt(envLossNominal)} dB / 悲観損失計: ${fmt(envLossWorst)} dB`,
    `目標距離 ${fmtDistance(dTest.v)}: 通常マージン ${fmtSigned(mNominal)} dB / 判定用 ${fmtSigned(mJudge)} dB / 悲観 ${fmtSigned(mWorst)} dB → ${judge.label}`,
    `最大到達距離: 通常 ${fmtDistance(maxDistanceMain)} / 悲観 ${fmtDistance(maxDistanceWorst)}`,
    `偏波: Tx ${txPol} × Rx ${rxPol} / 偏波損失 ${fmt(totalPolLoss, 0)} dB`,
    explanation,
  ].join("\n");
  const copyOrShow = async () => {
    try { await navigator.clipboard.writeText(resultText); flash("コピーしました"); }
    catch { setModal({ title: "結果（コピー用）", text: resultText, mode: "view" }); }
  };

  const kpiBlock = (
    <div className="kpis">
      <div className="kpi" style={{ background: judge.bg, borderColor: judge.color }}><div className="kpik">リンク判定（目標 {fmtDistance(dTest.v)}）</div><div className="badge" style={{ color: judge.color }}><span className="dot" style={{ background: judge.color }} />{judge.label}</div><div className="small" style={{ color: "#33454F" }}>{judge.desc}</div></div>
      <div className="kpi"><div className="kpik">判定用マージン</div><div className="kpiv" style={{ color: judge.color }}>{fmtSigned(mJudge)}<span className="unit">dB</span></div><div className="small">中心点 {fmtSigned(mNominal)} dB / 悲観 {fmtSigned(mWorst)} dB</div></div>
      <div className="kpi"><div className="kpik">{model === "TWO" ? "遠方側 最大到達距離" : "最大到達距離"}</div><div className="kpiv" style={{ color: C.ok }}>{fmtDistance(maxDistanceMain)}</div><div className="small">悲観: {fmtDistance(maxDistanceWorst)}{model === "TWO" ? " / ヌルは判定点で確認" : ""}</div></div>
      <div className="kpi"><div className="kpik">EIRP / 受信電力</div><div className="kpiv">{fmt(eirp)}<span className="unit">dBm</span></div><div className="small">Prx {fmt(prxAt(dTest.v))} dBm / 感度 {fmt(sens.v, 0)} dBm</div></div>
      <div className="kpi"><div className="kpik">損失計</div><div className="kpiv">{fmt(envLossNominal)}<span className="unit">dB</span></div><div className="small">悲観 {fmt(envLossWorst)} dB / 偏波 {fmt(totalPolLoss, 0)} dB</div></div>
    </div>
  );

  const guideBlock = (
    <div className="guide">
      <div className="guidePane">
        <div className="guideTitle">Next Action</div>
        <div className="guideMain" style={{ color: judge.color }}>{judge.label}: {judge.desc}</div>
        <ul className="guideList">{actionItems.map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
      <div className="guidePane">
        <div className="guideTitle">Model Picker</div>
        <div className="modelChoices">
          {Object.entries(MODEL_NOTES).map(([key, note]) => (
            <button key={key} className={`modelChoice ${model === key ? "on" : ""}`} onClick={() => setModel(key)} type="button">
              <b>{key === "TWO" ? "2波" : key}</b>
              <span>{note.bestFor}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="guidePane">
        <div className="guideTitle">How To Read</div>
        <div className="readout">
          <div className="readCell"><b>マージン</b><span>0dB未満は感度割れ。目標dB以上なら余裕あり。</span></div>
          <div className="readCell"><b>悲観値</b><span>雨・姿勢・遮蔽ばらつきを見込んだ厳しめの見方。</span></div>
          <div className="readCell"><b>損失</b><span>数値が大きいほど電波が弱くなる要因。</span></div>
        </div>
      </div>
      <div className="guidePane">
        <div className="guideTitle">Talk Takeaway</div>
        <div className="guideMain">講演の要点をその場で試算</div>
        <ul className="guideList">{LECTURE_GUIDE.map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
    </div>
  );

  const viewCard = (
    <div className="card">
      <div className="ct">判定グラフ — 安全域 / 注意域 / 不成立域</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))", gap: 6, marginBottom: 10 }}>
        {graphParams.map(([k, v]) => (
          <div key={k} style={{ border: `1px solid ${C.line}`, borderRadius: 8, background: "#F6F9FB", padding: "6px 8px", minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: C.sub, letterSpacing: ".05em", fontWeight: 700 }}>{k}</div>
            <div style={{ fontSize: 12, color: C.ink, fontWeight: 800, lineHeight: 1.25, overflowWrap: "anywhere" }}>{v}</div>
          </div>
        ))}
      </div>
      <PropagationScene maxX={graphMaxX} envKey={envKey} placeKey={placeKey} utility={utility} floodOn={floodOn} ht={ht.v} hr={hr.v} dTest={dTest.v} maxD={maxDistanceMain} line={line} target={targetMargin.v} reduced={reduced} />
      <MarginChart line={line} worstLine={worstLine} pts={pts} maxX={graphMaxX} target={targetMargin.v} maxMarker={maxDistanceMain} sens={sens.v} dTest={dTest.v} />
      <div className="legend"><span><span className="sw" style={{ background: C.ink, height: 4 }} />通常予測</span><span><span className="sw" style={{ background: C.ng, height: 3 }} />悲観予測</span><span><span className="sw" style={{ background: marginColor(mJudge, targetMargin.v), height: 4 }} />目標距離</span><span><span className="swd" />実測点</span><span><button className="btn" onMouseEnter={() => setHelpKey("dB")} onClick={syncGraphRange}>表示距離を自動合わせ</button></span></div>
      <div className="small" style={{ marginTop: 8 }}>背景が緑なら目標マージン達成、黄なら受信可能だが余裕不足、赤なら感度割れです。グラフ上のホバーで距離・マージン・Prxを表示します。</div>
    </div>
  );

  return (
    <div className="app">
      <style>{css}</style>
      <div className="wrap">
        <div className="head">
          <div><div className="eyebrow">SMART METER RF LINK RISK SIMULATOR</div><h1 className="title">スマートメーター RFリンクリスク評価ツール</h1><div className="sub">損失レンジ・偏波・金属遮蔽・浸水・2波ヌルを考慮した机上評価</div></div>
          <div className="row">
            <div className="seg" onMouseEnter={() => setHelpKey("model")}><button className={model === "FS" ? "on" : ""} onClick={() => setModel("FS")}>FS</button><button className={model === "CI" ? "on" : ""} onClick={() => setModel("CI")}>CI</button><button className={model === "TWO" ? "on" : ""} onClick={() => setModel("TWO")}>2波</button></div>
            <button className="btnP btn" onClick={copyOrShow}>結果をコピー</button>
          </div>
        </div>

        <div className="modelBox">
          <div className="modelName">{modelNote.name}</div>
          <div className="modelText">{modelNote.text}</div>
        </div>

        {kpiBlock}
        {guideBlock}

        <div className="grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card">
              <div className="ct">かんたん設定</div>
              <div className="step"><span className="stepNo">1</span>メーター種別</div>
              <PickGrid options={UTILITIES} value={utility} onChange={applyUtility} cols={4} big />
              <div className="uNote"><b>{uMeta.icon} {uMeta.label}メーター（{uMeta.sub}）</b><br />{uMeta.note}</div>
              <div className="step"><span className="stepNo">2</span>通信方式・バンド</div>
              <select className="bandSel" value={bandKey} onChange={(e) => applyBand(e.target.value)} onMouseEnter={() => setHelpKey("model")}>{BAND_GROUPS.map((g) => <optgroup key={g} label={g}>{BANDS.filter((b) => b.group === g).map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}</optgroup>)}</select>
              <div className="small">周波数 {fmt(freq.v, 0)} MHz / 出力 {fmt(txP.v, 0)} dBm / 感度 {fmt(sens.v, 0)} dBm</div>
              <div className="step"><span className="stepNo">3</span>設置場所</div>
              <PickGrid options={PLACES} value={placeKey} onChange={(k) => { setPlaceKey(k); if (!k.startsWith("pit")) setFloodOn(false); setHelpKey("place"); }} cols={3} />
              {isPit && <label className="floodChk" onMouseEnter={() => setHelpKey("flood")}><input type="checkbox" checked={floodOn} onChange={(e) => setFloodOn(e.target.checked)} />ピット浸水あり（通常+{FLOOD_LOSS.nominal}dB / 悲観+{FLOOD_LOSS.max}dB）</label>}
              <div className="step"><span className="stepNo">4</span>周辺環境</div>
              <PickGrid options={ENV_OPTIONS} value={envKey} onChange={(k) => { setEnvKey(k); setHelpKey("model"); }} cols={3} />
              <div className="step"><span className="stepNo">5</span>講演シナリオを重ねる</div>
              <div className="chips" style={{ gap: 8 }}>
                {LECTURE_SCENARIOS.map((s) => (
                  <button
                    key={s.key}
                    className="chip"
                    onClick={() => setLectureScenarioKey(s.key)}
                    style={{
                      borderColor: lectureScenarioKey === s.key ? C.ink : C.line,
                      boxShadow: lectureScenarioKey === s.key ? `inset 0 0 0 1px ${C.ink}` : "none",
                      background: lectureScenarioKey === s.key ? "#F6F9FB" : "#fff",
                      fontWeight: lectureScenarioKey === s.key ? 800 : 500,
                    }}
                  >
                    {s.label}<span style={{ color: C.sub, marginLeft: 4 }}>{s.sub}</span>
                  </button>
                ))}
              </div>
              <div className="uNote"><b>講演連動:</b> 人体接触・金属密着・基板挟み・RC壁の損失を、現在のリンク条件に重ねて体感できます。</div>
              <div className="step"><span className="stepNo">6</span>受信局までの距離</div>
              <div className="sliderRow"><input className="slider" type="range" min="0" max="1000" value={distToSlider(dTest.v)} onChange={(e) => dTest.setV(sliderToDist(parseInt(e.target.value, 10)))} /><span className="sliderVal">{fmtDistance(dTest.v)}</span></div>
              <div className="chips" style={{ marginTop: 6 }}>{[50, 100, 300, 500, 1000, 3000].map((d) => <button key={d} className="chip" onClick={() => dTest.setV(d)}>{fmtDistance(d)}</button>)}</div>
            </div>
            <div className="card"><div className="ct">結果解説</div><div className="help" style={{ minHeight: 0 }}>{explanation}</div></div>
            <div className="card"><div className="ct">dB表記メモ</div><div className="help" style={{ minHeight: 0 }}>{HELP.dB}</div></div>
          </div>
          {viewCard}
        </div>

        <div className="footer">本ツールは机上概算用です。通信性能・到達距離を保証するものではありません。プリセット値は代表的な想定例であり、実機仕様・法令・ARIB規格・現地RSSIログに基づく確認が必要です。</div>
      </div>
      {status ? <div className="toast">{status}</div> : null}
      {modal ? <Modal title={modal.title} text={modal.text} setText={setModalText} onClose={() => setModal(null)} onApply={modal.mode === "import" ? applyCSVImport : null} applyLabel="取り込み" /> : null}
    </div>
  );
}
