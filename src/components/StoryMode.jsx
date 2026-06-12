import React, { useMemo, useState } from "react";
import { C, clamp, fmt, fmtSigned, fmtDistance } from "../theme.js";
import { marginAt, distanceRatio } from "../engine/rf.js";
import { bandOf, envOf } from "../data/core.js";
import { STORY_UTILITIES, STORY_SCENARIOS } from "../data/scenarios.js";
import { Card, NoviceNote, Term, JudgeBadge, LossBar } from "./common.jsx";

const CAT_ICON = { antenna: "📡", placement: "📐", cable: "🔌", infrastructure: "🗼", design: "🛠" };

/** マージンゲージ */
function MarginGauge({ baseline, current, target = 10 }) {
  const lo = -30, hi = 30;
  const pct = (v) => clamp(((v - lo) / (hi - lo)) * 100, 0, 100);
  const col = current >= target ? C.ok : current >= 0 ? C.warn : C.ng;
  return (
    <div className="gauge">
      <div className="gaugeTrack">
        <div className="gaugeZone" style={{ left: 0, width: `${pct(0)}%`, background: C.ngBg }} />
        <div className="gaugeZone" style={{ left: `${pct(0)}%`, width: `${pct(target) - pct(0)}%`, background: C.warnBg }} />
        <div className="gaugeZone" style={{ left: `${pct(target)}%`, width: `${100 - pct(target)}%`, background: C.okBg }} />
        <div className="gaugeMark" style={{ left: `${pct(baseline)}%`, borderColor: C.sub }} title="対策前" />
        <div className="gaugeNeedle" style={{ left: `${pct(current)}%`, background: col }} />
      </div>
      <div className="gaugeLabels">
        <span>-30dB</span>
        <span style={{ color: C.ng }}>0=受信限界</span>
        <span style={{ color: C.ok }}>目標+{target}dB</span>
        <span>+30dB</span>
      </div>
    </div>
  );
}

function ScenarioDetail({ utility, sc, onBack }) {
  const [solSel, setSolSel] = useState({});
  const band = bandOf(sc.sim?.bandKey || utility.defaultSim.bandKey);
  const env = envOf(sc.sim?.envKey || utility.defaultSim.envKey);
  const dM = sc.sim?.dM || utility.defaultSim.dM;

  const totalLoss = sc.physics.reduce((s, p) => s + p.dbTyp, 0);
  const recovered = sc.solutions.reduce((s, x, i) => s + (solSel[i] ? x.recoversDbTyp : 0), 0);
  const effRecovered = Math.min(recovered, totalLoss + 6); // 過剰回収の目安キャップ

  const { mBase, mProblem, mNow } = useMemo(() => {
    const link = { txPdBm: band.txP, txAntNetDb: -2, rxGdBi: 2, rxLossDb: 0, sensDbm: band.sens, siteLossDb: 0, envLossDb: env.loss, polLossDb: 0, extraLossDb: 0 };
    const prop = { model: "CI", fMHz: band.freq, n: env.n, ht: 1.5, hr: 10 };
    const mBase = marginAt(dM, link, prop);
    return { mBase, mProblem: mBase - totalLoss, mNow: mBase - totalLoss + effRecovered };
  }, [band, env, dM, totalLoss, effRecovered]);

  const level = (m) => (m >= 10 ? "ok" : m >= 0 ? "warn" : "ng");
  const levelLabel = { ok: "安定", warn: "不安定", ng: "通信不可" };
  const distRatio = distanceRatio(totalLoss - effRecovered, env.n);

  return (
    <div>
      <button className="btn" onClick={onBack}>← シナリオ一覧へ戻る</button>
      <div className="scHead">
        <span className="scIcon">{sc.icon}</span>
        <div>
          <h2 className="scTitle">{sc.title}</h2>
          <div className="small">{utility.label}スマートメーター／{band.label}／{env.label}・受信局まで{fmtDistance(dM)}を想定</div>
        </div>
      </div>

      <Card title="① 課題を知る">
        <NoviceNote icon="🔰" title="まずはやさしく">{sc.noviceSummary}</NoviceNote>
        <p className="para">{sc.challenge}</p>
        {sc.background && <div className="small" style={{ background: "#F6F9FB", borderRadius: 9, padding: "8px 11px" }}>📍 <b>背景:</b> {sc.background}</div>}
      </Card>

      <Card title="② 何が起きているか（問題のシミュレーション）">
        <div className="physTable">
          {sc.physics.map((p) => (
            <div key={p.factor} className="physRow">
              <b>{p.factor}</b>
              <span className="physDb" style={{ color: p.dbTyp >= 15 ? C.ng : p.dbTyp >= 6 ? C.warn : C.ink }}>
                -{p.dbTyp}dB{Number.isFinite(p.dbMin) && Number.isFinite(p.dbMax) ? `（${p.dbMin}〜${p.dbMax}）` : ""}
              </span>
              <span className="small">{p.rationale}</span>
            </div>
          ))}
        </div>
        <LossBar items={sc.physics.map((p) => ({ label: p.factor, value: p.dbTyp }))} totalLabel={`合計 -${fmt(totalLoss, 0)}dB`} />
        <div className="row" style={{ gap: 14, marginTop: 10, alignItems: "center" }}>
          <JudgeBadge level={level(mProblem)} label={`この条件: ${levelLabel[level(mProblem)]}`} />
          <span className="small">理想配置なら<Term k="マージン">マージン</Term> {fmtSigned(mBase, 1)}dB → この課題条件では <b style={{ color: level(mProblem) === "ok" ? C.ok : level(mProblem) === "warn" ? C.warn : C.ng }}>{fmtSigned(mProblem, 1)}dB</b></span>
        </div>
        <MarginGauge baseline={mBase} current={mProblem} />
      </Card>

      <Card title="③ 解決策を試す（チェックして効果をシミュレーション）">
        <div className="solList">
          {sc.solutions.map((sol, i) => (
            <label key={sol.name} className={`solItem ${solSel[i] ? "solOn" : ""}`} style={{ cursor: "pointer" }}>
              <div className="solHead">
                <span>
                  <input type="checkbox" checked={!!solSel[i]} onChange={(e) => setSolSel((s) => ({ ...s, [i]: e.target.checked }))} style={{ marginRight: 8 }} />
                  {CAT_ICON[sol.category] || "🔧"} <b>{sol.name}</b>
                </span>
                <span style={{ color: C.ok, fontWeight: 800 }}>+{sol.recoversDbTyp}dB{sol.recoversDbMax ? `〜+${sol.recoversDbMax}dB` : ""}</span>
              </div>
              <div className="small">{sol.how}</div>
              {sol.tradeoff && <div className="small" style={{ color: C.warn }}>⚖ {sol.tradeoff}</div>}
            </label>
          ))}
        </div>
        <div className="compareBox" style={{ marginTop: 10 }}>
          <div className="row" style={{ gap: 14, alignItems: "center" }}>
            <JudgeBadge level={level(mNow)} label={levelLabel[level(mNow)]} />
            <b>対策後マージン {fmtSigned(mNow, 1)}dB</b>
            <span className="small">（{fmtSigned(effRecovered, 0)}dB回収{recovered > effRecovered ? "・重複効果は減衰" : ""}）</span>
          </div>
          <MarginGauge baseline={mProblem} current={mNow} />
          <div className="small">
            通信距離の目安: 課題発生時の{fmt(clamp(distanceRatio(totalLoss, env.n) * 100, 0, 100), 0)}% → 対策後 {fmt(clamp(distRatio * 100, 0, 999), 0)}%（理想配置=100%）
          </div>
        </div>
      </Card>

      <Card title="④ アンテナメーカー（スタッフ社）のサポート">
        <p className="para">{sc.stafSupport}</p>
        {sc.proNote && (
          <details className="proNote">
            <summary>🎓 プロ向け補足を読む</summary>
            <p className="para">{sc.proNote}</p>
          </details>
        )}
      </Card>
    </div>
  );
}

export default function StoryMode() {
  const [utilKey, setUtilKey] = useState("electric");
  const [scId, setScId] = useState(null);
  const utility = STORY_UTILITIES.find((u) => u.key === utilKey) || STORY_UTILITIES[0];
  const scenarios = STORY_SCENARIOS[utilKey] || [];
  const sc = scenarios.find((s) => s.id === scId);

  return (
    <div>
      <div className="utilTabs">
        {STORY_UTILITIES.map((u) => (
          <button key={u.key} className={`utilTab ${utilKey === u.key ? "on" : ""}`} style={utilKey === u.key ? { borderColor: u.tone, color: u.tone } : {}} onClick={() => { setUtilKey(u.key); setScId(null); }}>
            <span style={{ fontSize: 20 }}>{u.icon}</span> {u.label}
          </button>
        ))}
      </div>

      {sc ? (
        <ScenarioDetail utility={utility} sc={sc} onBack={() => setScId(null)} />
      ) : (
        <>
          <NoviceNote icon={utility.icon} title={`${utility.label}スマートメーターの通信`}>{utility.overview}</NoviceNote>
          {utility.standardsNote && (
            <details className="proNote" style={{ marginBottom: 12 }}>
              <summary>📋 使われている通信規格（詳しく）</summary>
              <p className="para">{utility.standardsNote}</p>
            </details>
          )}
          <div className="scGrid">
            {scenarios.map((s) => {
              const total = s.physics.reduce((sum, p) => sum + p.dbTyp, 0);
              return (
                <button key={s.id} className="scCard" onClick={() => setScId(s.id)}>
                  <div className="scCardHead">
                    <span className="scIcon">{s.icon}</span>
                    <b>{s.title}</b>
                  </div>
                  <div className="small" style={{ textAlign: "left" }}>{s.noviceSummary}</div>
                  <div className="scCardFoot">
                    <span style={{ color: total >= 25 ? C.ng : total >= 12 ? C.warn : C.sub, fontWeight: 800 }}>想定損失 -{fmt(total, 0)}dB</span>
                    <span className="small">{s.solutions.length}つの解決策 →</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
