import React from "react";
import { C } from "../theme.js";
import { INDUSTRY_STATS, INDUSTRY_ISSUES } from "../data/industry.js";
import { Card, NoviceNote } from "./common.jsx";

const TAB_GUIDE = [
  { key: "map", icon: "🗺", title: "通信エリアマップ", desc: "アンテナの作り込みの差が「設置できる軒数」をどう変えるか、町の地図で体感", who: "まずはここ！" },
  { key: "story", icon: "📖", title: "課題と解決", desc: "電気・ガス・水道それぞれの現場課題→問題→解決策をストーリーで理解", who: "事業者・企画の方に" },
  { key: "pit", icon: "🚰", title: "水道ピット研究室", desc: "日本の量水器ボックス（蓋材・深さ・浸水）を模擬した断面シミュレーション", who: "水道スマメ検討者に" },
  { key: "lab", icon: "🧪", title: "実験ラボ", desc: "講演で行った実機実験（-6dB/-10dB/-14dB）をインタラクティブに再現", who: "講演を聴いた方に" },
  { key: "pro", icon: "📐", title: "プロモード", desc: "リンクバジェット・伝搬モデル・偏波・実測RSSI照合までの詳細評価", who: "無線設計者に" },
];

export default function Home({ onNavigate }) {
  return (
    <div>
      <div className="hero">
        <div className="heroEyebrow">スマートメーターにも貢献する「つながる無線」</div>
        <h2 className="heroTitle">
          アンテナの<span style={{ color: C.blue }}>静特性</span>が、<br />
          スマートメーターを<span style={{ color: C.accent }}>設置できるエリア</span>を決める。
        </h2>
        <p className="heroLead">
          同じ無線機・同じ受信局でも、アンテナの効率・整合・パターン——そして<b>組み込み方・設置のしかた</b>で、
          通信できる範囲は<b>何倍も</b>変わります。このシミュレーターで、日本の電気・ガス・水道スマートメーターの
          リアルな設置環境を再現しながら、その理由と解決策を体感してください。
        </p>
        <div className="heroCtas">
          <button className="btn btnP" style={{ fontSize: 14, padding: "10px 18px" }} onClick={() => onNavigate("map")}>🗺 まずはエリアの変化を見る</button>
          <button className="btn" style={{ fontSize: 14, padding: "10px 18px" }} onClick={() => onNavigate("lab")}>🧪 講演の実験を再現する</button>
        </div>
      </div>

      <div className="statGrid">
        {INDUSTRY_STATS.map((s) => (
          <div key={s.label} className="statCard">
            <div className="statValue">{s.value}</div>
            <div className="statLabel">{s.label}</div>
            <div className="small">{s.note}</div>
          </div>
        ))}
      </div>

      <Card title="いま、スマートメーターで何が課題なのか">
        <div className="issueGrid">
          {INDUSTRY_ISSUES.map((i) => (
            <div key={i.title} className="factorBox">
              <b>{i.icon} {i.title}</b>
              <p>{i.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <NoviceNote icon="📡" title="“静特性”ってなに？（30秒でわかる）">
        アンテナのカタログに載っている基本性能——<b>効率</b>（入れた電力のうち電波になる割合）、<b>VSWR</b>（無線機との接続の良さ）、
        <b>放射パターン</b>（どの方向に強く飛ぶか）、<b>偏波</b>（電波の振動の向き）のこと。
        ポイントは、これらが<b>周囲の金属・水・人体・基板で大きく変わってしまう</b>こと。
        「カタログでは良いアンテナ」が「組み込んだら飛ばない」——これがスマートメーター無線の最大の落とし穴です。
      </NoviceNote>

      <Card title="このアプリの歩き方">
        <div className="tabGuide">
          {TAB_GUIDE.map((t) => (
            <button key={t.key} className="tabGuideItem" onClick={() => onNavigate(t.key)}>
              <span className="tabGuideIcon">{t.icon}</span>
              <div>
                <b>{t.title}</b> <span className="who">{t.who}</span>
                <div className="small">{t.desc}</div>
              </div>
              <span className="tabGuideArrow">→</span>
            </button>
          ))}
        </div>
      </Card>

      <div className="aboutBox">
        <b>本シミュレーターについて</b><br />
        講演「『つながる無線』のアンテナ設計事例——小型IoT機器で『アンテナの配置』が通信性能を変える理由」（スタッフ株式会社）の連動コンテンツです。
        講演で実施した実機実験の数値（-6dB/-10dB/-14dB）をそのままシミュレーションに使用しています。
        数値は机上概算用の代表値であり、通信性能を保証するものではありません。実機・現地での検証を推奨します。
      </div>
    </div>
  );
}
