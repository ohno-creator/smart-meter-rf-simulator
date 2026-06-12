import React, { useMemo, useState } from "react";
import { C, clamp, fmt, fmtSigned, fmtDistance } from "../theme.js";
import { marginAt } from "../engine/rf.js";
import { BANDS, bandOf, ENVS, envOf } from "../data/core.js";
import { LIDS, lidOf, BOXES, boxOf, ANT_POS, antPosOf, READOUTS, readoutOf, floodLoss, depthLoss, PIT_SOLUTIONS } from "../data/pit.js";
import { Card, PickGrid, NoviceNote, Term, JudgeBadge, LossBar, useReducedMotion } from "./common.jsx";

/** 状態→リンク評価 */
function evalPit(s) {
  const band = bandOf(s.bandKey);
  const env = envOf(s.envKey);
  const lid = lidOf(s.lidKey);
  const box = boxOf(s.boxKey);
  const pos = antPosOf(s.antPosKey);
  const ro = readoutOf(s.readoutKey);

  const antExposed = pos.floodExposed;
  const fl = floodLoss(s.waterPct, antExposed);
  const dLoss = depthLoss(s.depthCm, pos.depthFactor);
  const lidLoss = pos.lidApplies ? lid.loss : 0;
  const boxLoss = pos.lidApplies ? box.loss : 0;

  const link = {
    txPdBm: band.txP,
    txAntNetDb: s.antNetDb,
    rxGdBi: 2,
    rxLossDb: 0,
    sensDbm: band.sens,
    siteLossDb: lidLoss + boxLoss + dLoss + fl.loss + pos.extraLoss,
    envLossDb: env.loss,
    polLossDb: 0,
    extraLossDb: 0,
  };
  const prop = { model: "CI", fMHz: band.freq, n: env.n, ht: 0.3, hr: ro.hr };
  const m = marginAt(ro.dM, link, prop);
  const outage = (lid.outage && pos.lidApplies) || (antExposed && s.waterPct >= 70);
  const level = outage && m < 10 ? (m < 0 ? "bad" : "warn") : m >= 10 ? "ok" : m >= 0 ? "warn" : "ng";
  return { band, env, lid, box, pos, ro, fl, dLoss, lidLoss, boxLoss, m, level, link, prop };
}

const LEVEL_TEXT = {
  ok: { label: "安定通信", desc: "目標マージン10dBを満たします" },
  warn: { label: "不安定", desc: "通信はできるが、雨・泥・経年で途切れる恐れ" },
  ng: { label: "通信不可", desc: "受信感度を下回ります。対策が必要" },
  bad: { label: "通信不能リスク大", desc: "遮蔽・水没で予測自体が困難。対策前提で設計を" },
};

/** ピット断面図 */
function PitCrossSection({ s, ev, reduced }) {
  const W = 560, H = 320;
  const gndY = 110;
  const pitX = 150, pitW = 150;
  const pitDepthPx = clamp(s.depthCm, 20, 100) * 1.6;
  const pitBottom = gndY + pitDepthPx;
  const waterH = (s.waterPct / 100) * (pitDepthPx - 14);
  const waterY = pitBottom - 6 - waterH;
  const lidCol = { resin: "#5B8DB8", rescon: "#9AA6AD", concrete: "#8C9499", iron: "#3C4854", steel: "#2C3840" }[s.lidKey] || "#888";
  // アンテナ位置
  const pos = ev.pos.key;
  const antX = pitX + pitW / 2 + 28;
  const antY = pos === "meter" ? pitBottom - 36 : pos === "lid_under" ? gndY + 16 : pos === "lid_top" ? gndY - 18 : gndY - 46;
  const antOutside = pos === "lid_top" || pos === "remote";
  const remoteX = pos === "remote" ? pitX + pitW + 80 : antX;
  const ax = pos === "remote" ? remoteX : antX;
  // 受信側
  const roX = 506;
  const roTopY = ev.ro.key === "fixed" ? 28 : ev.ro.key === "drive" ? 78 : 66;
  const sigCol = ev.level === "ok" ? C.ok : ev.level === "warn" ? C.warn : C.ng;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} aria-label="水道メーターピットの断面図">
      <defs>
        <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#B59B72" /><stop offset="1" stopColor="#8F7A55" /></linearGradient>
        <linearGradient id="skyP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EAF4FA" /><stop offset="1" stopColor="#D9EAF3" /></linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={gndY} fill="url(#skyP)" />
      <rect x="0" y={gndY} width={W} height={H - gndY} fill="url(#soil)" />
      <line x1="0" y1={gndY} x2={W} y2={gndY} stroke="#5D4F36" strokeWidth="3" />

      {/* ピット */}
      <rect x={pitX} y={gndY + 4} width={pitW} height={pitDepthPx} fill={s.boxKey === "metal_box" ? "#9FB0BC" : s.boxKey === "concrete_box" ? "#C9CFCC" : "#E8EDF0"} stroke="#55616B" strokeWidth="2.5" />
      {/* 水 */}
      {s.waterPct > 0 && (
        <g>
          <rect x={pitX + 3} y={waterY} width={pitW - 6} height={waterH + 2} fill="#4D9CC9" opacity="0.7" />
          {!reduced && <rect x={pitX + 3} y={waterY} width={pitW - 6} height="3" fill="#BFE2F2" opacity="0.9"><animate attributeName="y" values={`${waterY};${waterY - 2};${waterY}`} dur="2.2s" repeatCount="indefinite" /></rect>}
        </g>
      )}
      {/* メーター本体 */}
      <rect x={pitX + 26} y={pitBottom - 38} width={56} height={26} rx="5" fill="#FBFDFE" stroke={C.ink} strokeWidth="2" />
      <circle cx={pitX + 54} cy={pitBottom - 25} r="9" fill="#fff" stroke={C.ink} strokeWidth="1.5" />
      <text x={pitX + 54} y={pitBottom - 21.5} textAnchor="middle" fontSize="8" fill={C.ink}>💧</text>
      <text x={pitX + 54} y={pitBottom + 14} textAnchor="middle" fontSize="10" fill="#FFF" fontWeight="700">水道メーター</text>
      {/* 配管 */}
      <line x1={pitX - 30} y1={pitBottom - 25} x2={pitX + 26} y2={pitBottom - 25} stroke="#7E8C96" strokeWidth="7" />
      <line x1={pitX + 82} y1={pitBottom - 25} x2={pitX + pitW + 30} y2={pitBottom - 25} stroke="#7E8C96" strokeWidth="7" />

      {/* 蓋 */}
      <rect x={pitX - 8} y={gndY - 7} width={pitW + 16} height={11} rx="3" fill={lidCol} stroke="#2A333B" strokeWidth="2" />
      <text x={pitX + pitW / 2} y={gndY - 14} textAnchor="middle" fontSize="11" fontWeight="800" fill={C.ink}>{ev.lid.label}{ev.lidLoss ? `（-${Math.round(ev.lidLoss)}dB）` : "（通過OK）"}</text>

      {/* アンテナ */}
      {pos === "remote" ? (
        <g>
          <line x1={pitX + pitW - 20} y1={pitBottom - 30} x2={remoteX} y2={gndY - 8} stroke="#444" strokeWidth="2" strokeDasharray="5 4" />
          <rect x={remoteX - 12} y={gndY - 58} width={24} height={52} rx="4" fill="#E9EEF2" stroke={C.ink} strokeWidth="2" />
          <rect x={remoteX - 3} y={gndY - 78} width={6} height={22} rx="3" fill="#C77B3A" stroke="#8A4F1D" strokeWidth="1.5" />
          <text x={remoteX} y={gndY + 14} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="700">分離ユニット</text>
        </g>
      ) : (
        <g>
          <rect x={ax - 5} y={antY - 16} width={10} height={32} rx="4" fill="#C77B3A" stroke="#8A4F1D" strokeWidth="1.8" />
          {pos !== "lid_top" && <line x1={pitX + 82} y1={pitBottom - 28} x2={ax} y2={antY + 14} stroke="#555" strokeWidth="1.6" strokeDasharray="3 3" />}
        </g>
      )}
      <text x={ax + 10} y={antY - 18} fontSize="10.5" fill={antOutside ? C.ok : C.ink} fontWeight="800">アンテナ</text>

      {/* 電波 */}
      {[0, 1, 2].map((k) => (
        <circle key={k} cx={ax} cy={antY} r="8" fill="none" stroke={sigCol} strokeWidth="1.8" opacity="0">
          {!reduced && (
            <>
              <animate attributeName="r" values="6;52" dur="2.4s" begin={`${k * 0.8}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.85;0" dur="2.4s" begin={`${k * 0.8}s`} repeatCount="indefinite" />
            </>
          )}
        </circle>
      ))}
      <path d={`M ${ax + 14} ${Math.min(antY, gndY - 4) - 6} Q ${(ax + roX) / 2} ${Math.min(antY, roTopY) - 36} ${roX - 16} ${roTopY + 10}`} fill="none" stroke={sigCol} strokeWidth="2.4" strokeDasharray={ev.level === "ng" || ev.level === "bad" ? "4 7" : "none"} opacity="0.85" />
      {(ev.level === "ng" || ev.level === "bad") && <text x={(ax + roX) / 2} y={Math.min(antY, roTopY) - 16} textAnchor="middle" fontSize="13" fontWeight="900" fill={C.ng}>✕ 届かない</text>}

      {/* 受信側 */}
      {ev.ro.key === "fixed" && (
        <g>
          <line x1={roX} y1={gndY} x2={roX} y2={roTopY} stroke="#6B5B45" strokeWidth="5" />
          <line x1={roX - 14} y1={roTopY + 12} x2={roX + 14} y2={roTopY + 12} stroke={C.ink} strokeWidth="2.4" />
          <circle cx={roX} cy={roTopY + 4} r="3.4" fill={C.blue} />
          <text x={roX} y={gndY + 16} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#fff">基地局 {fmtDistance(ev.ro.dM)}</text>
        </g>
      )}
      {ev.ro.key === "drive" && (
        <g>
          <rect x={roX - 34} y={gndY - 30} width={62} height={24} rx="6" fill="#3E6FA5" stroke="#22405F" strokeWidth="2" />
          <circle cx={roX - 18} cy={gndY - 4} r="7" fill="#22303B" /><circle cx={roX + 12} cy={gndY - 4} r="7" fill="#22303B" />
          <rect x={roX - 6} y={gndY - 44} width={4} height={14} fill="#22405F" />
          <text x={roX - 3} y={gndY + 16} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#fff">検針車 {fmtDistance(ev.ro.dM)}</text>
        </g>
      )}
      {ev.ro.key === "handy" && (
        <g>
          <circle cx={roX} cy={gndY - 42} r="8" fill="#E8B98A" stroke="#9C6F3F" strokeWidth="1.6" />
          <line x1={roX} y1={gndY - 34} x2={roX} y2={gndY - 10} stroke="#3E5466" strokeWidth="5" />
          <rect x={roX - 16} y={gndY - 30} width={10} height={16} rx="3" fill="#22303B" />
          <text x={roX} y={gndY + 16} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#fff">検針員 {fmtDistance(ev.ro.dM)}</text>
        </g>
      )}
    </svg>
  );
}

export default function PitLab() {
  const reduced = useReducedMotion();
  const [state, setState] = useState({
    bandKey: "lpwa920",
    envKey: "suburb",
    lidKey: "iron",
    boxKey: "concrete_box",
    antPosKey: "meter",
    depthCm: 45,
    waterPct: 0,
    readoutKey: "fixed",
    antNetDb: -2,
  });
  const set = (patch) => setState((s) => ({ ...s, ...patch }));
  const ev = useMemo(() => evalPit(state), [state]);
  const lt = LEVEL_TEXT[ev.level];
  const judgeColor = { ok: C.ok, warn: C.warn, ng: C.ng, bad: C.bad }[ev.level];

  const solutions = useMemo(
    () =>
      PIT_SOLUTIONS.map((sol) => {
        const after = evalPit(sol.apply(state));
        return { ...sol, after, gain: after.m - ev.m };
      })
        .filter((x) => x.gain > 0.5 || x.after.level === "ok")
        .sort((a, b) => b.after.m - a.after.m),
    [state, ev.m]
  );

  const lossItems = [
    { label: "蓋材", value: ev.lidLoss },
    { label: "枡本体", value: ev.boxLoss },
    { label: "深さ・低位置", value: ev.dLoss },
    { label: "浸水", value: ev.fl.loss },
    { label: "周辺環境", value: ev.env.loss },
    { label: "実装その他", value: ev.pos.extraLoss },
  ];

  return (
    <div>
      <NoviceNote icon="🚰" title="なぜ水道スマートメーターは一番むずかしいのか">
        日本の水道メーターの多くは<b>地中の量水器ボックス（ピット）</b>に入っています。電波の苦手な「低い位置」「金属蓋」「水」の三重苦。
        ここでは日本の実際のピット構造（蓋材・枡材質・深さ・浸水）を模擬して、どうすれば通信できるかを試せます。
      </NoviceNote>

      <div className="mapLayout">
        <Card title="ピット条件の設定">
          <div className="step"><span className="stepNo">1</span>蓋の材質</div>
          <PickGrid options={LIDS.map((l) => ({ ...l, sub: `-${l.loss}dB` }))} value={state.lidKey} onChange={(k) => set({ lidKey: k })} cols={2} />
          <div className="small">{ev.lid.desc}</div>

          <div className="step"><span className="stepNo">2</span>枡（ボックス）本体</div>
          <PickGrid options={BOXES.map((b) => ({ ...b, sub: `-${b.loss}dB` }))} value={state.boxKey} onChange={(k) => set({ boxKey: k })} cols={3} />

          <div className="step"><span className="stepNo">3</span>深さ・浸水</div>
          <div className="sliderRow">
            <span className="small" style={{ minWidth: 64 }}>深さ</span>
            <input className="slider" type="range" min="20" max="100" step="5" value={state.depthCm} onChange={(e) => set({ depthCm: parseInt(e.target.value, 10) })} />
            <b style={{ minWidth: 56, textAlign: "right" }}>{state.depthCm} cm</b>
          </div>
          <div className="small">標準は30〜60cm。寒冷地は凍結深度より深く埋めるため不利になります。</div>
          <div className="sliderRow">
            <span className="small" style={{ minWidth: 64 }}>水位</span>
            <input className="slider" type="range" min="0" max="100" step="5" value={state.waterPct} onChange={(e) => set({ waterPct: parseInt(e.target.value, 10) })} />
            <b style={{ minWidth: 56, textAlign: "right" }}>{state.waterPct} %</b>
          </div>
          {state.waterPct > 0 && <div className="small" style={{ color: ev.fl.loss >= 15 ? C.ng : C.sub }}><b>{ev.fl.label}</b>（-{ev.fl.loss}dB）{ev.fl.desc}</div>}

          <div className="step"><span className="stepNo">4</span>無線アンテナの位置</div>
          <PickGrid options={ANT_POS} value={state.antPosKey} onChange={(k) => set({ antPosKey: k })} cols={2} />
          <div className="small">{ev.pos.desc}</div>

          <div className="step"><span className="stepNo">5</span>通信方式と検針スタイル</div>
          <select className="bandSel" value={state.bandKey} onChange={(e) => set({ bandKey: e.target.value })}>
            {BANDS.filter((b) => ["wisun", "lpwa920", "ltem", "nbiot"].includes(b.key)).map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
          </select>
          <PickGrid options={READOUTS} value={state.readoutKey} onChange={(k) => set({ readoutKey: k })} cols={3} />
          <div className="small">{ev.ro.desc}</div>

          <div className="step"><span className="stepNo">6</span>周辺環境</div>
          <PickGrid options={ENVS} value={state.envKey} onChange={(k) => set({ envKey: k })} cols={2} />
        </Card>

        <div>
          <Card>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
              <div className="ct" style={{ margin: 0 }}>断面シミュレーション</div>
              <JudgeBadge level={ev.level === "bad" ? "bad" : ev.level} label={lt.label} />
            </div>
            <PitCrossSection s={state} ev={ev} reduced={reduced} />
            <div className="kpis" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))", marginTop: 10 }}>
              <div className="kpi"><div className="kpik">リンクマージン</div><div className="kpiv" style={{ color: judgeColor }}>{fmtSigned(ev.m, 1)}<span className="unit">dB</span></div><div className="small">{lt.desc}</div></div>
              <div className="kpi"><div className="kpik">ピット起因の損失合計</div><div className="kpiv">{fmt(ev.lidLoss + ev.boxLoss + ev.dLoss + ev.fl.loss, 0)}<span className="unit">dB</span></div><div className="small">蓋+枡+深さ+浸水</div></div>
              <div className="kpi"><div className="kpik">通信方式 / 検針</div><div className="kpiv" style={{ fontSize: 15 }}>{ev.band.short}</div><div className="small">{ev.ro.label}・{fmtDistance(ev.ro.dM)}</div></div>
            </div>
            <LossBar items={lossItems} totalLabel={`合計 ${fmt(lossItems.reduce((s, x) => s + x.value, 0), 0)}dB`} />
            {(ev.lid.outage && ev.pos.lidApplies) && (
              <div className="uNote" style={{ borderLeftColor: C.ng }}>
                ⚠ <b>金属蓋の中からの通信は「dB計算」を超えるリスクがあります。</b>蓋の隙間・周囲の土の状態で実測がばらつき、机上で「ギリギリ通る」計算でも現場では不通が出ます。講演の推奨どおり、下限より10〜20dBの余裕を確保するか、アンテナを蓋の外に出す設計を検討してください。
              </div>
            )}
          </Card>

          <Card title="解決策を試す（クリックで適用シミュレーション）">
            {solutions.length === 0 && <div className="small">現在の条件は十分良好です。蓋材や水位を変えて、悪条件での解決策を試してみてください。</div>}
            <div className="solList">
              {solutions.map((sol) => {
                const lv = sol.after.level;
                const col = { ok: C.ok, warn: C.warn, ng: C.ng, bad: C.bad }[lv];
                return (
                  <button key={sol.key} className="solItem" onClick={() => setState(sol.apply(state))}>
                    <div className="solHead">
                      <b>{sol.label}</b>
                      <span style={{ color: sol.gain > 0 ? C.ok : C.sub, fontWeight: 800 }}>{fmtSigned(sol.gain, 1)}dB</span>
                    </div>
                    <div className="solMeta">
                      適用後マージン <b style={{ color: col }}>{fmtSigned(sol.after.m, 1)}dB（{LEVEL_TEXT[lv].label}）</b>
                    </div>
                    <div className="small">{sol.note}</div>
                  </button>
                );
              })}
            </div>
            <div className="uNote" style={{ marginTop: 10 }}>
              <b>🏭 アンテナメーカー（スタッフ社）にできること</b><br />
              ピット内は「アンテナ単体の性能」より「<b>蓋・水・金属込みでどう振る舞うか</b>」が支配的です。
              筐体・蓋材込みのアンテナ設計（共振の事前調整）、防水構造の外部アンテナ、試作段階のOTA測定による実装悪化の見える化、低損失ケーブル（1702-013A: 10mで約-3dB）による分離設置まで、基板設計の段階からサポートできます。
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
