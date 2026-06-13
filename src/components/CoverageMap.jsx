import React, { useMemo, useState } from "react";
import { C, clamp, fmt, fmtSigned, fmtDistance, fmtArea, mulberry32, powerRatioText, round, CONTACT_URL, buildShareUrl, copyText, readUrlParams } from "../theme.js";
import { marginAt, radiusFor, batteryDrainFactor } from "../engine/rf.js";
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
    // 疑似ガウス（シャドウイング用、平均0・標準偏差1に正規化）
    const u = (rng() + rng() + rng() - 1.5) / 0.5;
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
        const m = marginAt(dM, conf.link, prop) + h.u * sigma;
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
  // 通信可能な家の平均電池消費倍率（マージン低下→再送増→電池消費増、余裕20dB時比）
  const edgeDrain = useMemo(() => {
    const reachable = houses.filter((h) => h.m > 0);
    if (!reachable.length) return NaN;
    return reachable.reduce((s, h) => s + batteryDrainFactor(h.m), 0) / reachable.length;
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
        <div><span>電池消費(圏内平均)</span><b style={{ color: edgeDrain > 2 ? C.ng : edgeDrain > 1.3 ? C.warn : C.ok }}>×{fmt(edgeDrain, 2)}</b></div>
      </div>
    </div>
  );
}

/** URLクエリから初期値（共有リンク対応） */
function initFromUrl(key, fallback, valid) {
  const q = readUrlParams();
  if (q.get("tab") !== "map") return fallback;
  const v = q.get(key);
  return v != null && (!valid || valid(v)) ? v : fallback;
}

export default function CoverageMap() {
  const reduced = useReducedMotion();
  const antKeys = [...ANT_STATES.map((a) => a.key), "custom"];
  const [bandKey, setBandKey] = useState(() => initFromUrl("band", "wisun", (v) => BANDS.some((b) => b.key === v)));
  const [envKey, setEnvKey] = useState(() => initFromUrl("env", "suburb", (v) => ENVS.some((e) => e.key === v)));
  const [siteKey, setSiteKey] = useState(() => initFromUrl("site", "wall", (v) => SITES.some((s) => s.key === v)));
  const [antA, setAntA] = useState(() => initFromUrl("a", "catalog", (v) => antKeys.includes(v)));
  const [antB, setAntB] = useState(() => initFromUrl("b", "sandwich", (v) => antKeys.includes(v)));
  const [customDbA, setCustomDbA] = useState(5);
  const [customDbB, setCustomDbB] = useState(5);
  const [target, setTarget] = useState(() => parseInt(initFromUrl("tgt", "10", (v) => ["6", "10", "15", "20"].includes(v)), 10));
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState("");
  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

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

  // 町の縮尺は固定（A/B共通）。アンテナを変えても地図は動かず、円と色だけが変わる
  const TOWN_SCALES = [
    { key: "300", m: 300, label: "300m四方" },
    { key: "600", m: 600, label: "600m四方" },
    { key: "1200", m: 1200, label: "1.2km四方" },
    { key: "2500", m: 2500, label: "2.5km四方" },
    { key: "5000", m: 5000, label: "5km四方" },
    { key: "12000", m: 12000, label: "12km四方" },
  ];
  const ENV_DEFAULT_SCALE = { los: "5000", suburb: "1200", urban: "1200", dense: "600" };
  const [scaleKey, setScaleKey] = useState(() => initFromUrl("scale", "auto", (v) => v === "auto" || TOWN_SCALES.some((s) => s.key === v)));
  const worldM = scaleKey === "auto"
    ? (TOWN_SCALES.find((s) => s.key === ENV_DEFAULT_SCALE[envKey]) || TOWN_SCALES[2]).m
    : (TOWN_SCALES.find((s) => s.key === scaleKey) || TOWN_SCALES[2]).m;
  // 縮尺ガイダンス: 両構成とも全滅/全カバーなら縮尺変更を促す
  const rMax = Math.max(confA.rStable, confB.rStable);
  const scaleHint =
    rMax < worldM * 0.04 ? "両構成とも圏外がほとんどです。縮尺を小さく（拡大）すると差が見えます" :
    Math.min(confA.rStable, confB.rStable) > worldM * 0.75 ? "両構成とも町全体をカバーしています。縮尺を大きく（広域）にすると差が見えます" : "";
  const deltaDb = confA.netDb - confB.netDb;
  const rRatio = confA.rStable > 0 ? confB.rStable / confA.rStable : 0;
  const aRatio = rRatio * rRatio;

  // レポート・比較文用のサマリ（家ごとの判定と電池消費）
  const summarize = (conf) => {
    const mPerUnit = worldM / 2;
    let ok = 0, drainSum = 0, reach = 0;
    for (const h of TOWN) {
      const m = marginAt(Math.hypot(h.x, h.y) * mPerUnit, conf.link, prop) + h.u * env.sigma;
      if (m >= target) ok++;
      if (m > 0) { reach++; drainSum += batteryDrainFactor(m); }
    }
    return { ok, total: TOWN.length, drain: reach ? drainSum / reach : NaN };
  };
  const sumA = useMemo(() => summarize(confA), [confA, worldM, prop, env.sigma, target]);
  const sumB = useMemo(() => summarize(confB), [confB, worldM, prop, env.sigma, target]);
  const gwMultiplier = aRatio > 0.0005 ? 1 / aRatio : Infinity;

  const shareUrl = () => buildShareUrl("map", { band: bandKey, env: envKey, site: siteKey, a: antA, b: antB, tgt: target, scale: scaleKey });
  const reportText = () => [
    "【通信エリアマップ シミュレーション結果】",
    `方式: ${band.label} / 環境: ${env.label}（n=${env.n}） / 設置: ${site.label} / 目標マージン: ${target}dB`,
    `構成A（${antStateOf(antA).label} ${fmtSigned(confA.netDb, 1)}dB）: 安定半径 ${fmtDistance(confA.rStable)} / 設置可能 ${sumA.ok}/${sumA.total}軒（${Math.round((100 * sumA.ok) / sumA.total)}%） / 電池消費 ×${fmt(sumA.drain, 2)}`,
    `構成B（${antStateOf(antB).label} ${fmtSigned(confB.netDb, 1)}dB）: 安定半径 ${fmtDistance(confB.rStable)} / 設置可能 ${sumB.ok}/${sumB.total}軒（${Math.round((100 * sumB.ok) / sumB.total)}%） / 電池消費 ×${fmt(sumB.drain, 2)}`,
    deltaDb > 0 ? `実装差 ${fmt(deltaDb, 1)}dB → 通信半径 約${round(rRatio * 100, 0)}% / カバー面積 約${round(aRatio * 100, 0)}% / 同等カバーに必要な受信局 約${Number.isFinite(gwMultiplier) ? round(gwMultiplier, 1) : "—"}倍` : "",
    `共有リンク: ${shareUrl()}`,
    "※机上概算（CIモデル+シャドウイング）。実環境での検証が必要です。",
  ].filter(Boolean).join("\n");

  const selHouse = selected != null ? TOWN[selected] : null;
  const selInfo = useMemo(() => {
    if (!selHouse) return null;
    const dM = Math.hypot(selHouse.x, selHouse.y) * (worldM / 2);
    const mk = (conf) => {
      const m = marginAt(dM, conf.link, prop) + selHouse.u * env.sigma;
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
              <span style={{ flex: 1 }} />
              <button className="chip" onClick={async () => { await copyText(shareUrl()); flash("この比較条件の共有リンクをコピーしました"); }}>🔗 条件を共有</button>
              <button className="chip" onClick={async () => { await copyText(reportText()); flash("結果レポートをコピーしました"); }}>📋 レポート</button>
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

          <div className="row" style={{ margin: "0 0 8px", gap: 8 }}>
            <span className="small" style={{ fontWeight: 800 }}>🗺 町の縮尺（A/B共通・固定）:</span>
            <button className={`chip ${scaleKey === "auto" ? "chipOn" : ""}`} onClick={() => setScaleKey("auto")}>自動</button>
            {TOWN_SCALES.map((s) => (
              <button key={s.key} className={`chip ${scaleKey === s.key ? "chipOn" : ""}`} onClick={() => setScaleKey(s.key)}>{s.label}</button>
            ))}
          </div>
          {scaleHint && <div className="small" style={{ marginBottom: 8, color: C.warn, fontWeight: 700 }}>💡 {scaleHint}</div>}
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
              <div style={{ marginTop: 6 }}>
                💰 <b>事業インパクト:</b> Bの性能で同じ町をカバーするには受信局・中継器がおよそ<b>{Number.isFinite(gwMultiplier) ? `${round(gwMultiplier, 1)}倍` : "計算不能なほど多数"}</b>必要。
                さらに圏内の家でも再送が増え、通信分の電池消費は平均<b>×{fmt(sumA.drain, 2)} → ×{fmt(sumB.drain, 2)}</b>に悪化します（電池10年要件に直結）。
              </div>
              {antStateOf(antB).lecture && <div className="small" style={{ marginTop: 6 }}>📖 {antStateOf(antB).lecture}</div>}
              <div className="small" style={{ marginTop: 6 }}>
                この「実装による悪化」は設計段階で防げます → <a href={CONTACT_URL} target="_blank" rel="noopener">アンテナ・GND設計の相談（スタッフ株式会社）</a>
              </div>
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
        <span className="small">伝搬: CIモデル n={env.n}＋シャドウイングσ={env.sigma}dB（家ごとのばらつき）／電池消費は再送込み簡易モデル（余裕20dB時比・通信分のみ）／机上概算であり実際の通信を保証しません</span>
      </div>
      {toast ? <div style={{ position: "fixed", right: 14, bottom: 14, background: "#102330", color: "#D8E6EE", borderRadius: 12, padding: "10px 14px", fontSize: 12, zIndex: 50 }}>{toast}</div> : null}
    </div>
  );
}
