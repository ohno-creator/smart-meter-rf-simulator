import React, { useState } from "react";
import { C, CONTACT_URL } from "../theme.js";
import { RESEARCH_TOPICS, RESEARCH_INTRO } from "../data/research.js";
import { Card, NoviceNote } from "./common.jsx";

export default function ResearchLab() {
  const [openId, setOpenId] = useState(null);

  return (
    <div>
      <NoviceNote icon="🔬" title="アンテナの観点で、最新の研究でわかってきたこと">
        {RESEARCH_INTRO}
      </NoviceNote>

      <div className="scGrid">
        {RESEARCH_TOPICS.map((t) => {
          const open = openId === t.id;
          return (
            <div key={t.id} className="scCard" style={{ cursor: "default", gridColumn: open ? "1 / -1" : "auto" }}>
              <button
                onClick={() => setOpenId(open ? null : t.id)}
                style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}
                aria-expanded={open}
              >
                <div className="scCardHead">
                  <span className="scIcon">{t.icon}</span>
                  <div>
                    <b>{t.title}</b>
                    {t.year ? <span className="small" style={{ marginLeft: 8 }}>{t.year}</span> : null}
                  </div>
                  <span style={{ marginLeft: "auto", color: C.blue, fontWeight: 800 }}>{open ? "閉じる ▲" : "詳しく ▼"}</span>
                </div>
                <div className="para" style={{ margin: "8px 0 0" }}><b style={{ color: C.blue }}>わかってきたこと:</b> {t.finding}</div>
                {t.noviceAnalogy && <div className="small">💡 たとえるなら: {t.noviceAnalogy}</div>}
              </button>
              {open && (
                <div style={{ borderTop: `1px dashed ${C.line}`, paddingTop: 10, marginTop: 6 }}>
                  <div className="para">{t.detail}</div>
                  <div className="uNote">
                    <b>🏭 スマートメーター実務への示唆</b><br />{t.implication}
                  </div>
                  <div className="uNote" style={{ borderLeftColor: C.cyan }}>
                    <b>🛠 設計の現場では（スタッフ社の視点）</b><br />{t.stafLink}
                    {" "}<a href={CONTACT_URL} target="_blank" rel="noopener">→ この観点で相談する</a>
                  </div>
                  {t.sources?.length ? (
                    <details className="proNote" style={{ marginTop: 8 }}>
                      <summary>📚 出典・参考文献</summary>
                      <ul className="small" style={{ lineHeight: 1.8 }}>
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

      <div className="uNote" style={{ marginTop: 14 }}>
        ここで挙げた研究動向はすべて「<b>アンテナは周囲込みの系として設計・実測すべき</b>」という一点に収れんします。
        カタログ値の比較から一歩進んで、筐体・基板・設置環境を含めた評価を設計工程に組み込むことが、スマートメーターの通信品質と電池寿命を両立させる近道です。
        <div style={{ marginTop: 8 }}>
          <a className="btn btnP" style={{ textDecoration: "none", display: "inline-block" }} href={CONTACT_URL} target="_blank" rel="noopener">📩 最新の設計手法について問い合わせる</a>
        </div>
      </div>
    </div>
  );
}
