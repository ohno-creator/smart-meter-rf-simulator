import React, { useMemo, useState } from "react";
import { C, clamp, fmt, fmtSigned, fmtDistance, fmtArea, mulberry32, powerRatioText, round } from "../theme.js";
import { marginAt, radiusFor } from "../engine/rf.js";
import { BANDS, ENVS, SITES, ANT_STATES, bandOf, envOf, siteOf, antStateOf } from "../data/core.js";
import { Card, PickGrid, NoviceNote, Term, useReducedMotion } from "./common.jsx";

/** ===== 町の生成（決定論的） ===== */
const HOUSE_COUNT = 180;
function makeTown(seed = 42) {
  const rng = mulberry32(seed);
  const houses = [];
  for (let i = 0; i < HOUSE_COUNT; i++) {
    // 一様配置 + 端を少し避ける
    const x = (rng() * 2 - 1) * 0.94;
    const y = (rng() * 2 - 1) * 0.94;
    // 疑似ガウス（シャドウイング用、平均0・±1程度）
    const u = (rng() + rng() + rng() - 1.5) / 1.2;
    if (Math.hypot(x, y) < 0.045) continue; // 受信局の真上は除外
    houses.push({ x, y, u });
  }
  return houses;
}
const TOWN = makeTown();

const niceStep = (raw) => {
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) if (raw <= m * p) return m * p;
  return 10 * p;
};

const QUICK_PAIRS = [
  { a: "catalog", b: "sandwich", label: "カタログ vs 基板サンドイッチ" },
  { a: "catalog", b: "metal_near", label: "カタログ vs 金属近接" },
  { a: "good_layout", b: "battery", label: "良配置 vs バッテリー密着" },
  { a: "metal_near", b: "tuned", label: "金属近接 vs 筐体込み最適化" },
];

/** 1つの構成の評価結果 */
function useConfigEval(antKey, customDb, base, prop, target) {
  return useMemo(() => {
    const st = antStateOf(antKey);
    const netDb = antKey === "custom" ? -customDb : st.netDb;
    const link = { ...base, txAntNetDb: base.txAntNetDb + netDb };
    const rStable = radiusFor(target, link, prop);
    const rEdge = radiusFor(0, link, prop);
    return { antKey, st, netDb, link, rStable, rEdge };
  }, [antKey, customDb, base, prop, target]);
}

function TownMap({ title, sub, conf, worldM, sigma, target, prop, selected, onSelect, reduced, tone }) {
  const S = 480;
  const cx = S / 2;
  const mPerUnit = worldM / 2; // x∈[-1,1] → worldM/2 m
  const toPx = (m) => (m / mPerUnit) * (S / 2);
  const rStablePx = toPx(conf.rStable);
  const rEdgePx = toPx(conf.rEdge);
  const step = niceStep(mPerUnit / 2.4);
  const rings = [];
  for (let m = step; m <= mPerUnit * 1.35; m += step) rings.push(m);

  const houses = useMemo(
    () =>
      TOWN.map((h, i) => {
        const dM = Math.hypot(h.x, h.y) * mPerUnit;
        const m = marginAt(dM, conf.link, prop) + h.u * sigma * 0.7;
        const status = m >= target ? "ok" : m >= 0 ? "warn" : "ng";
        return { ...h, i, dM, m, status };
      }),
    [conf.link, prop, mPerUnit, sigma, target]
  );
  const counts = useMemo(() => {
    const c = { ok: 0, warn: 0, ng: 0 };
    houses.forEach((h) => c[h.status]++);
    return c;
  }, [houses]);

  const col = { ok: C.ok, warn: C.warn, ng: C.ng };
  return (
    <div className="mapPane" style={{ borderTop: `4px solid ${tone}` }}>
      <div className="mapHead">
        <div>
          <b>{title}</b>
          <span className="mapSub">{sub}</span>
        </div>
        <div className="mapStat">
          設置可能 <b style={{ color: counts.ok > houses.length * 0.6 ? C.ok : counts.ok > houses.length * 0.3 ? C.warn : C.ng }}>{counts.ok}</b>
          <span> / {houses.length} 軒（{Math.round((100 * counts.ok) / houses.length)}%）</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${S} ${S}`} style={{ width: "100%", display: "block", borderRadius: 10, background: "#F4F8FA", border: `1px solid ${C.line}` }} aria-label={`${title}の通信エリアマップ`}>
        {/* 距離リング */}
        {rings.map((m) => (
          <g key={m}>
            <circle cx={cx} cy={cx} r={toPx(m)} fill="none" stroke="#C9D8E0" strokeWidth="1" strokeDasharray="3 5" />
            <text x={cx + toPx(m) - 4} y={cx - 5} fontSize="10" fill={C.sub} textAnchor="end">{m >= 1000 ? `${m / 1000}km` : `${m}m`}</text>
          </g>
        ))}
        {/* 通信ゾーン */}
        {rEdgePx > 0.5 && <circle cx={cx} cy={cx} r={Math.min(rEdgePx, S)} fill={C.warn} opacity="0.13" stroke={C.warn} strokeWidth="1.4" strokeDasharray="6 5" />}
        {rStablePx > 0.5 && <circle cx={cx} cy={cx} r={Math.min(rStablePx, S)} fill={C.ok} opacity="0.16" stroke={C.ok} strokeWidth="1.8" />}
        {/* 家 */}
        {houses.map((h) => {
          const px = cx + h.x * (S / 2) * 0.96;
          const py = cx + h.y * (S / 2) * 0.96;
          const sel = selected === h.i;
          return (
            <g key={h.i} onClick={() => onSelect(sel ? null : h.i)} style={{ cursor: "pointer" }}>
              <rect x={px - 4.4} y={py - 4.4} width="8.8" height="8.8" rx="1.6" fill={col[h.status]} opacity={h.status === "ng" ? 0.5 : 0.92} stroke={sel ? C.ink : "#fff"} strokeWidth={sel ? 2.4 : 0.9} />
              {h.status === "ng" && <line x1={px - 3} y1={py - 3} x2={px + 3} y2={py + 3} stroke="#fff" strokeWidth="1.4" />}
            </g>
          );
        })}
        {/* 受信局 */}
        <g>
          {[0, 1, 2].map((k) => (
            <circle key={k} cx={cx} cy={cx - 14} r="6" fill="none" stroke={C.blue} strokeWidth="1.6" opacity="0">
              {!reduced && (
                <>
                  <animate attributeName="r" values="5;46" dur="2.6s" begin={`${k * 0.85}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="2.6s" begin={`${k * 0.85}s`} repeatCount="indefinite" />
                </>
              )}
            </circle>
          ))}
          <line x1={cx} y1={cx + 10} x2={cx} y2={cx - 14} stroke={C.ink} strokeWidth="3" />
          <line x1={cx - 9} y1={cx + 10} x2={cx + 9} y2={cx + 10} stroke={C.ink} strokeWidth="2.4" />
          <line x1={cx - 6} y1={cx - 6} x2={cx + 6} y2={cx - 14} stroke={C.ink} strokeWidth="1.6" />
          <line x1={cx + 6} y1={cx - 6} x2={cx - 6} y2={cx - 14} stroke={C.ink} strokeWidth="1.6" />
          <circle cx={cx} cy={cx - 16} r="2.6" fill={C.blue} />
          <text x={cx} y={cx + 26} textAnchor="middle" fontSize="11" fontWeight="700" fill={C.ink}>受信局</text>
        </g>
      </svg>
      <div className="mapKpis">
        <div><span>安定通信半径</span><b style={{ color: C.ok }}>{fmtDistance(conf.rStable)}</b></div>
        <div><span>限界半径(余裕0)</span><b style={{ color: C.warn }}>{fmtDistance(conf.rEdge)}</b></div>
        <div><span>安定エリア面積</span><b>{fmtArea(Math.PI * conf.rStable ** 2)}</b></div>
        <div><span>アンテナ実効</span><b style={{ color: conf.netDb < -3 ? C.ng : C.ink }}>{fmtSigned(conf.netDb, 1)} dB</b></div>
      </div>
    </div>
  );
}

export default function CoverageMap() {
  const reduced = useReducedMotion();
  const [bandKey, setBandKey] = useState("wisun");
  const [envKey, setEnvKey] = useState("suburb");
  const [siteKey, setSiteKey] = useState("wall");
  const [antA, setAntA] = useState("catalog");
  const [antB, setAntB] = useState("sandwich");
  const [customDbA, setCustomDbA] = useState(5);
  const [customDbB, setCustomDbB] = useState(5);
  const [target, setTarget] = useState(10);
  const [selected, setSelected] = useState(null);

  const band = bandOf(bandKey);
  const env = envOf(envKey);
  const site = siteOf(siteKey);

  const prop = useMemo(() => ({ model: "CI", fMHz: band.freq, n: env.n, ht: 1.5, hr: 10 }), [band.freq, env.n]);
  const base = useMemo(
    () => ({ txPdBm: band.txP, txAntNetDb: -2, rxGdBi: 2, rxLossDb: 0, sensDbm: band.sens, siteLossDb: site.loss, envLossDb: env.loss, polLossDb: 0, extraLossDb: 0 }),
    [band, site.loss, env.loss]
  );

  const ANT_OPTIONS = useMemo(
    () => [...ANT_STATES.map((a) => ({ ...a, sub: `${a.netDb >= 0 ? "+" : ""}${a.netDb}dB` })), { key: "custom", label: "カスタム", icon: "🎛", sub: "スライダーで設定" }],
    []
  );

  const confA = useConfigEval(antA, customDbA, base, prop, target);
  const confB = useConfigEval(antB, customDbB, base, prop, target);

  // 表示ワールドサイズは基準構成Aの安定半径に合わせる
  const worldM = clamp(Math.max(confA.rStable, confB.rStable) * 2.6, 60, 40000);
  const deltaDb = confA.netDb - confB.netDb;
  const rRatio = confA.rStable > 0 ? confB.rStable / confA.rStable : 0;
  const aRatio = rRatio * rRatio;

  const selHouse = selected != null ? TOWN[selected] : null;
  const selInfo = useMemo(() => {
    if (!selHouse) return null;
    const dM = Math.hypot(selHouse.x, selHouse.y) * (worldM / 2);
    const mk = (conf) => {
      const m = marginAt(dM, conf.link, prop) + selHouse.u * env.sigma * 0.7;
      return { m, status: m >= target ? "ok" : m >= 0 ? "warn" : "ng" };
    };
    return { dM, a: mk(confA), b: mk(confB) };
  }, [selHouse, worldM, prop, env.sigma, target, confA, confB]);

  const statusText = { ok: "安定して設置可能", warn: "不安定（時々途切れる恐れ）", ng: "圏外（設置不可）" };
  const statusColor = { ok: C.ok, warn: C.warn, ng: C.ng };

  return (
    <div>
      <NoviceNote icon="🗺" title="このマップの見方">
        中央の<b>受信局</b>に向かって、町中のスマートメーター（■=家）が電波を送ります。緑の円の中なら<b>安定して設置できる</b>、黄色は不安定、その外は圏外。
        左右で<b>アンテナの実装状態だけ</b>を変えて比較すると——アンテナの静特性が「設置できるエリア」をそのまま決めることがわかります。家をクリックすると個別の判定が見られます。
      </NoviceNote>

      <div className="mapLayout">
        <Card title="条件設定">
          <div className="step"><span className="stepNo">1</span>通信方式</div>
          <select className="bandSel" value={bandKey} onChange={(e) => setBandKey(e.target.value)}>
            {BANDS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
          </select>
          <div className="small">{band.use}／送信 {band.txP}dBm・<Term k="受信感度">感度</Term> {band.sens}dBm</div>

          <div className="step"><span className="stepNo">2</span>周辺環境</div>
          <PickGrid options={ENVS} value={envKey} onChange={setEnvKey} cols={2} />
          <div className="small">{env.desc}（<Term k="パスロス指数">n</Term>={env.n}）</div>

          <div className="step"><span className="stepNo">3</span>メーター設置条件</div>
          <PickGrid options={SITES.map((s) => ({ ...s, sub: s.loss ? `+${s.loss}dB損失` : "基準" }))} value={siteKey} onChange={setSiteKey} cols={2} />
          <div className="small">{site.desc}</div>

          <div className="step"><span className="stepNo">4</span>判定の厳しさ（目標<Term k="マージン">マージン</Term>）</div>
          <div className="segRow">
            {[6, 10, 15, 20].map((t) => (
              <button key={t} className={`chip ${target === t ? "chipOn" : ""}`} onClick={() => setTarget(t)}>{t} dB</button>
            ))}
          </div>
          <div className="small">講演でも「下限値より10〜20dBの余裕を持つ」ことを推奨しています。</div>
        </Card>

        <div>
          <Card title="アンテナ実装状態の比較（A vs B）">
            <div className="segRow" style={{ marginBottom: 10 }}>
              {QUICK_PAIRS.map((q) => (
                <button key={q.label} className="chip" onClick={() => { setAntA(q.a); setAntB(q.b); }}>{q.label}</button>
              ))}
            </div>
            <div className="abGrid">
              <div>
                <div className="abLabel" style={{ color: C.blue }}>構成A（基準）</div>
                <PickGrid options={ANT_OPTIONS} value={antA} onChange={setAntA} cols={2} />
                {antA === "custom" && (
                  <div className="sliderRow"><span className="small">実装悪化</span>
                    <input className="slider" type="range" min="0" max="20" step="0.5" value={customDbA} onChange={(e) => setCustomDbA(parseFloat(e.target.value))} />
                    <b>-{customDbA}dB</b>
                  </div>
                )}
                <div className="small">{antStateOf(antA).desc}</div>
              </div>
              <div>
                <div className="abLabel" style={{ color: C.accent }}>構成B（比較）</div>
                <PickGrid options={ANT_OPTIONS} value={antB} onChange={setAntB} cols={2} />
                {antB === "custom" && (
                  <div className="sliderRow"><span className="small">実装悪化</span>
                    <input className="slider" type="range" min="0" max="20" step="0.5" value={customDbB} onChange={(e) => setCustomDbB(parseFloat(e.target.value))} />
                    <b>-{customDbB}dB</b>
                  </div>
                )}
                <div className="small">{antStateOf(antB).desc}</div>
              </div>
            </div>
          </Card>

          <div className="mapsGrid">
            <TownMap title={`A: ${antA === "custom" ? "カスタム" : antStateOf(antA).label}`} sub={band.short} conf={confA} worldM={worldM} sigma={env.sigma} target={target} prop={prop} selected={selected} onSelect={setSelected} reduced={reduced} tone={C.blue} />
            <TownMap title={`B: ${antB === "custom" ? "カスタム" : antStateOf(antB).label}`} sub={band.short} conf={confB} worldM={worldM} sigma={env.sigma} target={target} prop={prop} selected={selected} onSelect={setSelected} reduced={reduced} tone={C.accent} />
          </div>

          {deltaDb > 0.01 && (
            <div className="compareBox">
              <b>アンテナ実装の差 {fmt(deltaDb, 1)}dB</b> が、この環境（n={env.n}）では——
              通信半径 <b>{fmtDistance(confA.rStable)} → {fmtDistance(confB.rStable)}</b>（約{rRatio > 0 ? `${round(rRatio * 100, 0)}%` : "—"}）、
              カバー<b>面積は{aRatio > 0.005 ? `約${round(aRatio * 100, 0)}%` : "ほぼゼロ"}</b>に。
              送信電力に換算すると<b>{powerRatioText(deltaDb)}</b>です。
              {antStateOf(antB).lecture && <div className="small" style={{ marginTop: 6 }}>📖 {antStateOf(antB).lecture}</div>}
            </div>
          )}
          {deltaDb < -0.01 && (
            <div className="compareBox" style={{ borderColor: C.ok }}>
              <b>構成Bの方が {fmt(-deltaDb, 1)}dB 有利</b>。通信半径は <b>{fmtDistance(confA.rStable)} → {fmtDistance(confB.rStable)}</b>、
              面積は<b>約{round((1 / (aRatio || 1)) <= 1 ? aRatio * 100 : aRatio * 100, 0)}%</b>（{round(aRatio, 1)}倍）。
              アンテナと実装の最適化は、受信局や中継器を増やさずにエリアを広げる最も安価な手段です。
            </div>
          )}

          {selInfo && (
            <Card title={`選択した家（受信局から ${fmtDistance(selInfo.dM)}）`}>
              <div className="selGrid">
                <div>
                  <div className="abLabel" style={{ color: C.blue }}>構成A</div>
                  <b style={{ color: statusColor[selInfo.a.status], fontSize: 15 }}>{statusText[selInfo.a.status]}</b>
                  <div className="small">マージン {fmtSigned(selInfo.a.m, 1)} dB</div>
                </div>
                <div>
                  <div className="abLabel" style={{ color: C.accent }}>構成B</div>
                  <b style={{ color: statusColor[selInfo.b.status], fontSize: 15 }}>{statusText[selInfo.b.status]}</b>
                  <div className="small">マージン {fmtSigned(selInfo.b.m, 1)} dB</div>
                </div>
              </div>
              {selInfo.a.status === "ok" && selInfo.b.status !== "ok" && (
                <div className="small" style={{ marginTop: 8 }}>
                  この家は構成Aなら設置できますが、構成Bでは{selInfo.b.status === "ng" ? "圏外" : "不安定"}になります。「アンテナの作り込みの差」が、現場では「設置できる／できない」の差になって現れます。
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      <div className="legend" style={{ marginTop: 10 }}>
        <span><span className="swBox" style={{ background: C.ok }} />安定設置可（マージン≧{target}dB）</span>
        <span><span className="swBox" style={{ background: C.warn }} />不安定（0〜{target}dB）</span>
        <span><span className="swBox" style={{ background: C.ng, opacity: 0.6 }} />圏外（マージン&lt;0）</span>
        <span className="small">伝搬: CIモデル n={env.n}＋シャドウイングσ={env.sigma}dB（家ごとのばらつき）／机上概算であり実際の通信を保証しません</span>
      </div>
    </div>
  );
}
