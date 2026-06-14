import React, { useMemo, useState } from "react";
import { C, CONTACT_URL } from "../theme.js";
import { RESEARCH_TOPICS, RESEARCH_INTRO } from "../data/research.js";
import { Card, NoviceNote } from "./common.jsx";

const CATS = ["すべて", "物理の制約", "基板設計", "整合・実装", "評価・測定", "設置環境", "電波環境", "材料・構造", "設計手法"];

export default function ResearchLab() {
  const [openId, setOpenId] = useState(null);
  const [cat, setCat] = useState("すべて");

  const topics = useMemo(
    () => (cat === "すべて" ? RESEARCH_TOPICS : RESEARCH_TOPICS.filter((t) => t.cat === cat)),
    [cat]
  );

  return (
    <div>
      <NoviceNote icon="🔬" title="アンテナの観点で、最新の研究でわかってきたこと">
        {RESEARCH_INTRO}
      </NoviceNote>

      {/* この章の結論を最初に提示（SEO/要点先出し） */}
      <div className="card" style={{ background: "linear-gradient(135deg,#0F2B45,#1B5A74)", border: "none", color: "#EAF4FB" }}>
        <div style={{ fontSize: 11, letterSpacing: ".2em", color: "#7BC8E8", fontWeight: 800 }}>研究が示す結論</div>
        <div style={{ fontSize: "clamp(16px,2.4vw,21px)", fontWeight: 800, lineHeight: 1.55, margin: "8px 0 4px" }}>
          アンテナの性能は「部品の数値」ではなく<br />
          <span style={{ background: "rgba(255,255,255,.14)", padding: "0 6px", borderRadius: 6 }}>基板・筐体・設置環境を含む“系”</span>で決まる。
        </div>
        <div style={{ fontSize: 13, color: "#C9E2F0", lineHeight: 1.7 }}>
          だから「カタログでは良いアンテナ」が「組み込むと飛ばない」が起きる——これは個別の失敗ではなく、最新研究が共通して指し示す構造的な事実です。設置できるエリア・電池寿命・検針成功率は、この“系”の作り込みで決まります。
        </div>
      </div>

      {/* カテゴリフィルタ */}
      <div className="row" style={{ gap: 6, margin: "4px 0 12px" }}>
        {CATS.map((c) => (
          <button key={c} className={`chip ${cat === c ? "chipOn" : ""}`} onClick={() => { setCat(c); setOpenId(null); }}>{c}</button>
        ))}
      </div>

      <div className="scGrid">
        {topics.map((t) => {
          const open = openId === t.id;
          return (
            <div key={t.id} className="researchCard" style={{ gridColumn: open ? "1 / -1" : "auto" }}>
              <button
                onClick={() => setOpenId(open ? null : t.id)}
                style={{ all: "unset", cursor: "pointer", display: "block", width: "100%", boxSizing: "border-box", padding: 14 }}
                aria-expanded={open}
              >
                <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div className="scCardHead" style={{ marginBottom: 0 }}>
                    <span className="scIcon">{t.icon}</span>
                    <div>
                      <b style={{ fontSize: 14 }}>{t.title}</b>
                      {t.cat ? <div className="catTag">{t.cat}{t.year ? ` ・ ${t.year}` : ""}</div> : null}
                    </div>
                  </div>
                  <span style={{ color: C.blue, fontWeight: 800, whiteSpace: "nowrap", fontSize: 12 }}>{open ? "閉じる ▲" : "詳しく ▼"}</span>
                </div>
                {t.keyFig ? (
                  <div className="keyFig">
                    <span className="keyFigVal">{t.keyFig.value}</span>
                    <span className="keyFigLab">{t.keyFig.label}</span>
                  </div>
                ) : null}
                <div className="para" style={{ margin: "2px 0 0", fontSize: 13 }}>{t.finding}</div>
                {t.noviceAnalogy && !open && <div className="small">💡 {t.noviceAnalogy}</div>}
              </button>
              {open && (
                <div style={{ padding: "0 14px 14px" }}>
                  {t.noviceAnalogy && <div className="small" style={{ marginBottom: 8 }}>💡 たとえるなら: {t.noviceAnalogy}</div>}
                  <div className="para">{t.detail}</div>

                  {t.takeaways?.length ? (
                    <>
                      <div className="ct" style={{ margin: "12px 0 4px" }}>設計でおさえる要点</div>
                      <ul className="checkList">
                        {t.takeaways.map((x) => <li key={x}>{x}</li>)}
                      </ul>
                    </>
                  ) : null}

                  <div className="uNote">
                    <b>🏭 スマートメーター実務への示唆</b><br />{t.implication}
                  </div>
                  <div className="uNote" style={{ borderLeftColor: C.cyan }}>
                    <b>🛠 設計の現場では（スタッフ社の視点）</b><br />{t.stafLink}
                    {" "}<a href={CONTACT_URL} target="_blank" rel="noopener">→ この観点で相談する</a>
                  </div>
                  {t.sources?.length ? (
                    <details className="proNote" style={{ marginTop: 8 }}>
                      <summary>📚 出典・参考文献（{t.sources.length}件）</summary>
                      <ul className="small" style={{ lineHeight: 1.8, margin: "6px 0 0", paddingLeft: 18 }}>
                        {t.sources.map((s) => <li key={s} style={{ overflowWrap: "anywhere" }}>{s}</li>)}
                      </ul>
                    </details>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ background: "linear-gradient(135deg,#F2F8F4,#EAF4FB)", border: `1.5px solid ${C.cyan}`, marginTop: 14 }}>
        <div className="ct">研究の結論を、自社製品の設計に落とすには</div>
        <p className="para" style={{ marginTop: 0 }}>
          ここで挙げた研究はすべて「<b>アンテナは周囲込みの系として設計・実測すべき</b>」に収れんします。
          カタログ値の比較から一歩進めて、筐体・基板GND・設置環境を含めた評価を設計工程に組み込むことが、通信品質と電池寿命を両立させる近道です。
          試作段階のOTA測定（TRP/TIS）、基板GND・整合の設計支援、設置環境込みの実測まで、基板設計の段階からご相談いただけます。
        </p>
        <a className="btn btnP" style={{ textDecoration: "none", display: "inline-block", fontSize: 14, padding: "10px 18px" }} href={CONTACT_URL} target="_blank" rel="noopener">
          📩 アンテナ設計について問い合わせる（スタッフ株式会社）
        </a>
      </div>
    </div>
  );
}
