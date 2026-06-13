/** =====================================================================
 *  RF物理エンジン
 *  - リンクバジェット / 伝搬モデル / 通信半径・エリア計算
 *  - アンテナ静特性（効率・VSWR・偏波・パターン）→ dB換算
 *  本ツールは机上概算用。通信性能を保証するものではない。
 *  ===================================================================== */
import { clamp, log10 } from "../theme.js";

/** 自由空間伝搬損失 [dB]（f: MHz, d: m） */
export const fspl = (fMHz, dM) => 32.44 + 20 * log10(fMHz) + 20 * log10(clamp(dM, 0.1) / 1000);

/**
 * パスロス [dB]
 * model: "FS"(自由空間+ブレークポイント) | "CI"(距離減衰指数n) | "TWO"(2波)
 */
export function pathLoss({ model = "CI", fMHz = 920, dM = 100, n = 3.0, ht = 1.5, hr = 10, envLoss = 0 }) {
  const lambda = 300 / fMHz;
  const base = fspl(fMHz, dM);
  if (model === "CI") {
    const pl1m = fspl(fMHz, 1);
    return pl1m + 10 * n * log10(clamp(dM, 1)) + envLoss;
  }
  if (model === "TWO") {
    const dr = Math.sqrt(dM * dM + (ht + hr) ** 2) - Math.sqrt(dM * dM + (ht - hr) ** 2);
    const interference = clamp(Math.abs(2 * Math.sin((Math.PI * dr) / lambda)), 1e-9);
    return base - 20 * log10(interference) + envLoss;
  }
  // FS + 遠方d^4傾向の簡易ブレークポイント補正
  const dbp = (4 * Math.PI * ht * hr) / lambda;
  let loss = base + envLoss;
  if (dM > dbp) loss += 20 * log10(dM / dbp);
  return loss;
}

/**
 * リンクマージン [dB]
 * link: { txPdBm, txAntNetDb(アンテナ実効=利得+効率+実装損まとめ), rxGdBi, rxLossDb, sensDbm,
 *         siteLossDb(設置遮蔽), envLossDb(環境), polLossDb, extraLossDb }
 */
export function marginAt(dM, link, prop) {
  const eirp = link.txPdBm + (link.txAntNetDb || 0);
  const totalEnv = (link.siteLossDb || 0) + (link.envLossDb || 0) + (link.polLossDb || 0) + (link.extraLossDb || 0);
  const pl = pathLoss({ ...prop, dM, envLoss: totalEnv });
  const prx = eirp + (link.rxGdBi || 0) - (link.rxLossDb || 0) - pl;
  return prx - link.sensDbm;
}

/** margin(d) >= target を満たす最大距離（単調減少前提の対数二分探索） */
export function radiusFor(targetMarginDb, link, prop, dMax = 3e5) {
  const f = (d) => marginAt(d, link, prop) - targetMarginDb;
  if (f(1) < 0) return 0;
  if (f(dMax) >= 0) return dMax;
  let lo = 1;
  let hi = dMax;
  for (let i = 0; i < 48; i++) {
    const mid = 10 ** ((log10(lo) + log10(hi)) / 2);
    if (f(mid) >= 0) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** ===== アンテナ静特性 → dB ===== */

/** 放射効率 % → dB（50% → -3dB） */
export const efficiencyToDb = (pct) => 10 * log10(clamp(pct, 0.1, 100) / 100);

/** VSWR → ミスマッチ損失 dB（VSWR2:1 → 0.51dB, 3:1 → 1.25dB） */
export const vswrToMismatchDb = (vswr) => {
  const g = (clamp(vswr, 1) - 1) / (clamp(vswr, 1) + 1);
  return -10 * log10(clamp(1 - g * g, 1e-6));
};

/** 偏波不一致損失 dB（実環境では反射散乱で完全には消えない前提） */
export function polLoss(txPol, rxPol) {
  if (txPol === "MIX" || rxPol === "MIX") return 6;
  if (txPol === rxPol) return 0;
  if ((txPol === "V" && rxPol === "H") || (txPol === "H" && rxPol === "V")) return 18;
  if (txPol === "C" || rxPol === "C") return 3;
  return 6;
}

/** ΔdB悪化 → 通信距離比 / エリア面積比（パスロス指数nの環境で） */
export const distanceRatio = (deltaDb, n = 3) => 10 ** (-clamp(deltaDb, 0) / (10 * n));
export const areaRatio = (deltaDb, n = 3) => 10 ** ((-2 * clamp(deltaDb, 0)) / (10 * n));

/** 電力比（-6dB → 0.25） */
export const powerRatio = (deltaDb) => 10 ** (-clamp(deltaDb, 0) / 10);

/** =====================================================================
 *  電池寿命への影響（簡易モデル）
 *  レイリーフェージング下のアウテージ確率: PER(M) = 1 - exp(-10^(-M/10))
 *  期待送信回数 = 1/(1-PER)。通信分の電池消費は送信回数に比例すると仮定。
 *  ※ スリープ電流等は含まない「通信分のみの相対比較」。静止端末でも
 *    周囲の車・人・扉開閉・降雨で実効的なフェージングは生じる。
 *  ===================================================================== */
export const perFromMargin = (marginDb) => clamp(1 - Math.exp(-(10 ** (-marginDb / 10))), 0, 0.999);

/** 期待送信回数（再送込み、上限あり） */
export const expectedTxCount = (marginDb, maxRetry = 8) =>
  Math.min(1 / (1 - perFromMargin(marginDb)), maxRetry + 1);

/** 基準マージン(20dB)比の通信分電池消費倍率 */
export const batteryDrainFactor = (marginDb, refMarginDb = 20) =>
  expectedTxCount(marginDb) / expectedTxCount(refMarginDb);
