import React from "react";
import { C, clamp, fmt, fmtSigned } from "../theme.js";
import { perFromMargin } from "../engine/rf.js";

/** =====================================================================
 *  リンクバジェット滝グラフ
 *  送信出力 → アンテナ実効 → 各損失 → 受信利得 → 受信電力 を段々で可視化
 *  ===================================================================== */
export function WaterfallChart({ txPdBm, antNetDb = 0, losses = [], rxGdBi = 0, sensDbm, target = 10 }) {
  const steps = [
    { label: "送信出力", delta: null, level: txPdBm, kind: "start" },
    { label: "アンテナ実効", delta: antNetDb, kind: "gain" },
    ...losses.filter((l) => Math.abs(l.db) > 0.01).map((l) => ({ label: l.label, delta: -Math.abs(l.db), kind: "loss" })),
    { label: "受信利得", delta: rxGdBi, kind: "gain" },
  ];
  let lv = txPdBm;
  const seq = steps.map((s) => {
    const from = lv;
    if (s.delta != null) lv += s.delta;
    return { ...s, from, to: lv };
  });
  const final = lv;
  const margin = final - sensDbm;
  const judgeColor = margin >= target ? C.ok : margin >= 0 ? C.warn : C.ng;

  const W = 760, H = 320;
  const M = { l: 56, r: 116, t: 18, b: 64 };
  const PW = W - M.l - M.r;
  const PH = H - M.t - M.b;
  const levels = [txPdBm, final, sensDbm, sensDbm + target, ...seq.map((s) => s.to)];
  let yMax = Math.max(...levels) + 6;
  let yMin = Math.min(...levels) - 8;
  const y = (v) => M.t + ((yMax - v) / (yMax - yMin)) * PH;
  const n = seq.length + 1; // +1 = 最終受信電力バー
  const slot = PW / n;
  const bw = Math.min(52, slot * 0.62);
  const x = (i) => M.l + slot * i + (slot - bw) / 2;

  const yTicks = [];
  const step = (yMax - yMin) > 90 ? 30 : 20;
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) yTicks.push(v);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} aria-label="リンクバジェットの滝グラフ">
      <rect x={M.l} y={M.t} width={PW} height={PH} fill="#FBFDFE" stroke={C.line} />
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke={C.grid} />
          <text x={M.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={C.sub} fontFamily="ui-monospace,monospace">{v}</text>
        </g>
      ))}
      {/* 感度ライン・目標ライン */}
      <line x1={M.l} x2={W - M.r} y1={y(sensDbm)} y2={y(sensDbm)} stroke={C.ng} strokeWidth="2" strokeDasharray="7 5" />
      <text x={W - M.r + 6} y={y(sensDbm) + 4} fontSize="11" fill={C.ng} fontWeight="800">受信感度 {fmt(sensDbm, 0)}dBm</text>
      <line x1={M.l} x2={W - M.r} y1={y(sensDbm + target)} y2={y(sensDbm + target)} stroke={C.ok} strokeWidth="1.6" strokeDasharray="4 5" />
      <text x={W - M.r + 6} y={y(sensDbm + target) + 4} fontSize="10.5" fill={C.ok} fontWeight="700">目標 +{target}dB</text>

      {/* 段差バー */}
      {seq.map((s, i) => {
        const isStart = s.kind === "start";
        const up = (s.delta ?? 0) >= 0;
        const top = isStart ? y(s.level) : y(Math.max(s.from, s.to));
        const hgt = isStart ? Math.max(3, y(yMin) - y(s.level)) * 0 + 8 : Math.max(3, Math.abs(y(s.from) - y(s.to)));
        const color = isStart ? C.blue : s.kind === "gain" ? (up ? C.cyan : C.warn) : C.ng;
        return (
          <g key={i}>
            {isStart ? (
              <rect x={x(i)} y={y(s.level)} width={bw} height={Math.max(4, y(yMin + 2) - y(s.level))} fill={C.blue} opacity="0.85" rx="3" />
            ) : (
              <rect x={x(i)} y={top} width={bw} height={hgt} fill={color} opacity="0.85" rx="3" />
            )}
            {/* 接続線 */}
            {i < seq.length - 1 && <line x1={x(i) + bw} y1={y(s.to)} x2={x(i + 1)} y2={y(s.to)} stroke={C.ink} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />}
            {i === seq.length - 1 && <line x1={x(i) + bw} y1={y(s.to)} x2={x(i + 1)} y2={y(s.to)} stroke={C.ink} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />}
            <text x={x(i) + bw / 2} y={isStart ? y(s.level) - 6 : top - 6} textAnchor="middle" fontSize="11" fontWeight="800" fill={isStart ? C.blue : color}>
              {isStart ? `${fmt(s.level, 0)}dBm` : fmtSigned(s.delta, Math.abs(s.delta) < 3 ? 1 : 0)}
            </text>
            <text x={x(i) + bw / 2} y={H - M.b + 14} textAnchor="middle" fontSize="10" fill={C.ink}
              transform={`rotate(-28 ${x(i) + bw / 2} ${H - M.b + 14})`}>{s.label}</text>
          </g>
        );
      })}

      {/* 最終受信電力バー */}
      <rect x={x(n - 1)} y={y(final)} width={bw} height={Math.max(4, y(yMin + 2) - y(final))} fill={judgeColor} rx="3" />
      <text x={x(n - 1) + bw / 2} y={y(final) - 6} textAnchor="middle" fontSize="11.5" fontWeight="800" fill={judgeColor}>{fmt(final, 1)}dBm</text>
      <text x={x(n - 1) + bw / 2} y={H - M.b + 14} textAnchor="middle" fontSize="10" fill={C.ink} transform={`rotate(-28 ${x(n - 1) + bw / 2} ${H - M.b + 14})`}>受信電力</text>

      {/* マージン矢印 */}
      <g>
        <line x1={x(n - 1) + bw + 8} y1={y(final)} x2={x(n - 1) + bw + 8} y2={y(sensDbm)} stroke={judgeColor} strokeWidth="2.6" />
        <polygon points={`${x(n - 1) + bw + 8},${y(final)} ${x(n - 1) + bw + 4},${y(final) + (margin >= 0 ? 7 : -7)} ${x(n - 1) + bw + 12},${y(final) + (margin >= 0 ? 7 : -7)}`} fill={judgeColor} />
        <text x={x(n - 1) + bw + 14} y={(y(final) + y(sensDbm)) / 2 + 4} fontSize="12" fontWeight="900" fill={judgeColor}>
          余裕 {fmtSigned(margin, 1)}dB
        </text>
      </g>
    </svg>
  );
}

/** =====================================================================
 *  PER曲線（リンクマージン → パケット誤り率）＋動作点
 *  ===================================================================== */
export function PerCurve({ marginDb }) {
  const W = 520, H = 220;
  const M = { l: 52, r: 16, t: 14, b: 40 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;
  const mLo = -5, mHi = 25;
  const x = (m) => M.l + ((m - mLo) / (mHi - mLo)) * PW;
  const y = (p) => M.t + (1 - p) * PH;
  const pts = [];
  for (let m = mLo; m <= mHi; m += 0.5) pts.push(`${x(m).toFixed(1)},${y(perFromMargin(m)).toFixed(1)}`);
  const mOp = clamp(marginDb, mLo, mHi);
  const pOp = perFromMargin(mOp);
  const opColor = marginDb >= 10 ? C.ok : marginDb >= 0 ? C.warn : C.ng;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} aria-label="マージンとパケット誤り率の関係">
      {/* ゾーン背景 */}
      <rect x={M.l} y={M.t} width={x(0) - M.l} height={PH} fill={C.ngBg} opacity="0.7" />
      <rect x={x(0)} y={M.t} width={x(10) - x(0)} height={PH} fill={C.warnBg} opacity="0.7" />
      <rect x={x(10)} y={M.t} width={W - M.r - x(10)} height={PH} fill={C.okBg} opacity="0.7" />
      <rect x={M.l} y={M.t} width={PW} height={PH} fill="none" stroke={C.line} />
      {[0, 25, 50, 75, 100].map((p) => (
        <g key={p}>
          <line x1={M.l} x2={W - M.r} y1={y(p / 100)} y2={y(p / 100)} stroke={C.grid} />
          <text x={M.l - 6} y={y(p / 100) + 4} textAnchor="end" fontSize="10.5" fill={C.sub} fontFamily="ui-monospace,monospace">{p}%</text>
        </g>
      ))}
      {[-5, 0, 5, 10, 15, 20, 25].map((m) => (
        <text key={m} x={x(m)} y={H - M.b + 16} textAnchor="middle" fontSize="10.5" fill={C.sub} fontFamily="ui-monospace,monospace">{m}</text>
      ))}
      <polyline points={pts.join(" ")} fill="none" stroke={C.ink} strokeWidth="2.6" strokeLinejoin="round" />
      {/* 動作点 */}
      <line x1={x(mOp)} x2={x(mOp)} y1={M.t} y2={H - M.b} stroke={opColor} strokeWidth="1.6" strokeDasharray="5 4" />
      <circle cx={x(mOp)} cy={y(pOp)} r="7" fill="#fff" stroke={opColor} strokeWidth="4" />
      <g transform={`translate(${clamp(x(mOp) + 10, M.l, W - 190)}, ${clamp(y(pOp) - 34, M.t + 2, H - M.b - 36)})`}>
        <rect width="180" height="32" rx="8" fill="#102330" opacity="0.92" />
        <text x="9" y="14" fontSize="10.5" fill="#D8E6EE">いまの条件: PER 約{fmt(pOp * 100, pOp < 0.1 ? 1 : 0)}%</text>
        <text x="9" y="26" fontSize="10" fill="#9FD8FF">失敗→再送→電池消費 ×{fmt(1 / (1 - pOp), 2)}</text>
      </g>
      <text x={M.l + PW / 2} y={H - 6} textAnchor="middle" fontSize="11" fill={C.ink}>リンクマージン (dB)</text>
      <text x="14" y={M.t + PH / 2} textAnchor="middle" fontSize="11" fill={C.ink} transform={`rotate(-90 14 ${M.t + PH / 2})`}>パケット誤り率</text>
    </svg>
  );
}

/** =====================================================================
 *  無指向性アンテナのドーナツ放射パターン（疑似3D）
 *  ===================================================================== */
export function Donut3D({ horizontal = false }) {
  const W = 360, H = 250;
  const cx = 170, cy = 120;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 400, display: "block", margin: "0 auto" }} aria-label={horizontal ? "横置き時の放射パターン" : "縦置き時の放射パターン"}>
      <defs>
        <radialGradient id={`dnt-tube-${horizontal}`} cx="0.5" cy="0.42" r="0.62">
          <stop offset="0%" stopColor="#9FD0F0" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#4D94CC" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#1B5A8E" stopOpacity="0.75" />
        </radialGradient>
        <linearGradient id={`dnt-ant-${horizontal}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E0995C" /><stop offset="50%" stopColor="#C77B3A" /><stop offset="100%" stopColor="#8A4F1D" />
        </linearGradient>
      </defs>
      {/* 地面の影 */}
      <ellipse cx={cx} cy={208} rx={horizontal ? 100 : 118} ry="13" fill="#102330" opacity="0.12" />

      {!horizontal ? (
        <g>
          {/* 水平ドーナツ（上から斜め見下ろし）: 外輪-内輪 */}
          <path d={`M ${cx - 118} ${cy} a 118 44 0 1 0 236 0 a 118 44 0 1 0 -236 0 Z M ${cx - 34} ${cy} a 34 13 0 1 1 68 0 a 34 13 0 1 1 -68 0 Z`} fillRule="evenodd" fill={`url(#dnt-tube-${horizontal})`} stroke="#1B5A8E" strokeWidth="1.6" opacity="0.9" />
          <ellipse cx={cx} cy={cy - 7} rx="100" ry="32" fill="none" stroke="#CFE8F8" strokeWidth="2.2" opacity="0.8" />
          {/* アンテナ縦棒 */}
          <rect x={cx - 7} y={cy - 64} width="14" height="118" rx="6" fill={`url(#dnt-ant-${horizontal})`} stroke="#6E3D14" strokeWidth="1.6" />
          <text x={cx} y={cy - 72} textAnchor="middle" fontSize="11" fontWeight="800" fill={C.ink}>アンテナ（縦置き）</text>
          {/* 受信局方向 */}
          <line x1={cx + 122} y1={cy} x2={cx + 168} y2={cy} stroke={C.ok} strokeWidth="3" markerEnd="" />
          <polygon points={`${cx + 168},${cy} ${cx + 156},${cy - 6} ${cx + 156},${cy + 6}`} fill={C.ok} />
          <text x={cx + 144} y={cy - 12} textAnchor="middle" fontSize="11.5" fontWeight="900" fill={C.ok}>受信局へ 強い</text>
          {/* 真上が弱い */}
          <line x1={cx} y1={cy - 70} x2={cx} y2={cy - 100} stroke={C.ng} strokeWidth="2" strokeDasharray="4 4" />
          <text x={cx + 6} y={cy - 96} fontSize="10.5" fontWeight="800" fill={C.ng}>真上・真下は弱い</text>
        </g>
      ) : (
        <g>
          {/* 縦ドーナツ（アンテナが水平＝倒れた状態）。受信局方向＝ドーナツの穴 */}
          <path d={`M ${cx} ${cy - 104} a 44 104 0 1 0 0 208 a 44 104 0 1 0 0 -208 Z M ${cx} ${cy - 30} a 13 30 0 1 1 0 60 a 13 30 0 1 1 0 -60 Z`} fillRule="evenodd" fill={`url(#dnt-tube-${horizontal})`} stroke="#1B5A8E" strokeWidth="1.6" opacity="0.9" transform={`translate(0,4)`} />
          <ellipse cx={cx - 6} cy={cy + 4} rx="32" ry="88" fill="none" stroke="#CFE8F8" strokeWidth="2" opacity="0.75" />
          {/* アンテナ横棒（受信局方向に倒した） */}
          <rect x={cx - 58} y={cy - 3} width="118" height="14" rx="6" fill={`url(#dnt-ant-${horizontal})`} stroke="#6E3D14" strokeWidth="1.6" />
          <text x={cx} y={cy + 32} textAnchor="middle" fontSize="11" fontWeight="800" fill={C.ink}>アンテナ（横置き＝倒した）</text>
          {/* 受信局方向 = 穴（ヌル） */}
          <line x1={cx + 66} y1={cy + 4} x2={cx + 168} y2={cy + 4} stroke={C.ng} strokeWidth="2.4" strokeDasharray="6 5" />
          <polygon points={`${cx + 168},${cy + 4} ${cx + 156},${cy - 2} ${cx + 156},${cy + 10}`} fill={C.ng} />
          <text x={cx + 122} y={cy - 10} textAnchor="middle" fontSize="11.5" fontWeight="900" fill={C.ng}>受信局方向は穴＝弱い!</text>
          <text x={cx - 2} y={cy - 112} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={C.blue}>強いのは上下方向</text>
        </g>
      )}
      <text x="10" y={H - 8} fontSize="10" fill={C.sub}>ドーナツ＝電波の強い方向のイメージ（無指向性アンテナ）</text>
    </svg>
  );
}
