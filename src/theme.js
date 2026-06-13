/** =====================================================================
 *  デザイントークン + 共通ユーティリティ
 *  ===================================================================== */

export const C = {
  paper: "#ECF1F4",
  panel: "#FFFFFF",
  line: "#D3DDE3",
  grid: "#E4EDF2",
  ink: "#14252F",
  sub: "#5B6E79",
  blue: "#2B5DA8",
  cyan: "#1B7FA6",
  ok: "#0E7C66",
  warn: "#B26B00",
  ng: "#B3261E",
  bad: "#6F1D1B",
  okBg: "#E2F2EE",
  warnBg: "#F7ECD9",
  ngBg: "#F8E3E1",
  badBg: "#F4D8D5",
  accent: "#D94F2B",
};

export const clamp = (x, min, max = Infinity) => Math.max(min, Math.min(max, x));
export const log10 = (x) => Math.log10(clamp(x, 1e-12));
export const round = (x, d = 1) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : NaN);
export const fmt = (x, d = 1) => (Number.isFinite(x) ? String(round(x, d)) : "—");
export const fmtSigned = (x, d = 1) => (Number.isFinite(x) ? `${x >= 0 ? "+" : ""}${fmt(x, d)}` : "—");
export const fmtDistance = (m) => {
  if (!Number.isFinite(m)) return "—";
  if (m >= 1000) return `${round(m / 1000, 2)} km`;
  return `${round(m, 0)} m`;
};
export const fmtArea = (m2) => {
  if (!Number.isFinite(m2)) return "—";
  if (m2 >= 1e6) return `${round(m2 / 1e6, 2)} km²`;
  if (m2 >= 1e4) return `${round(m2 / 1e4, 1)} ha`;
  return `${round(m2, 0)} m²`;
};

/** 電力比・距離比の直感表示: -6dB → 「電力 約1/4」 */
export const powerRatioText = (db) => {
  if (!Number.isFinite(db) || db <= 0) return "基準";
  const r = 10 ** (db / 10);
  if (r >= 100) return `約1/${Math.round(r / 10) * 10}`;
  if (r >= 9.5) return `約1/${Math.round(r)}`;
  if (r >= 1.4) return `約1/${round(r, 1)}`;
  return "ほぼ同等";
};

/** お問い合わせ（スタッフ株式会社） */
export const CONTACT_URL = "https://www.staf.co.jp/contact.html";

/** URL共有: 現在のタブ+条件をクエリにした共有URLを作る */
export const buildShareUrl = (tab, params = {}) => {
  const q = new URLSearchParams({ tab, ...params });
  return `${location.origin}${location.pathname}?${q.toString()}`;
};
export const readUrlParams = () => new URLSearchParams(location.search);

/** クリップボードコピー（失敗時はprompt表示） */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt("コピーしてください:", text);
    return false;
  }
}

/** 決定論的乱数（マップの家配置を再現可能に） */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
