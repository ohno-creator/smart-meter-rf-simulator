import React, { useMemo, useState } from "react";
import { C, CONTACT_URL, readUrlParams } from "./theme.js";
import Home from "./components/Home.jsx";
import CoverageMap from "./components/CoverageMap.jsx";
import StoryMode from "./components/StoryMode.jsx";
import PitLab from "./components/PitLab.jsx";
import ExperimentLab from "./components/ExperimentLab.jsx";
import ResearchLab from "./components/ResearchLab.jsx";
import ProSimulator from "./components/ProSimulator.jsx";

const TABS = [
  { key: "home", icon: "🏠", label: "はじめに" },
  { key: "map", icon: "🗺", label: "通信エリアマップ" },
  { key: "story", icon: "📖", label: "課題と解決" },
  { key: "pit", icon: "🚰", label: "水道ピット研究室" },
  { key: "lab", icon: "🧪", label: "実験ラボ" },
  { key: "research", icon: "🔬", label: "最新研究" },
  { key: "pro", icon: "📐", label: "プロモード" },
];

export default function App() {
  const [tab, setTab] = useState(() => {
    const t = readUrlParams().get("tab");
    return TABS.some((x) => x.key === t) ? t : "home";
  });
  const go = (k) => { setTab(k); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const css = useMemo(() => `
    .shellRoot{--ink:${C.ink};--sub:${C.sub};--line:${C.line};font-family:"Hiragino Kaku Gothic ProN","Hiragino Sans","Yu Gothic UI","Noto Sans JP",system-ui,sans-serif;background:repeating-linear-gradient(0deg,transparent 0 31px,rgba(43,93,168,.05) 31px 32px),repeating-linear-gradient(90deg,transparent 0 31px,rgba(43,93,168,.05) 31px 32px),${C.paper};color:${C.ink};min-height:100vh}
    .shellWrap{max-width:1320px;margin:0 auto;padding:14px 16px 44px}
    .shellHead{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;border-bottom:2px solid ${C.ink};padding-bottom:10px}
    .shellEyebrow{font-size:11px;letter-spacing:.22em;color:${C.blue};font-weight:700}
    .shellTitle{font-size:22px;font-weight:800;margin:2px 0 0;letter-spacing:.02em}
    .shellSub{font-size:12px;color:${C.sub};margin-top:3px}
    .tabsNav{display:flex;gap:6px;overflow-x:auto;padding:10px 2px 12px;-webkit-overflow-scrolling:touch;position:sticky;top:0;z-index:30;background:linear-gradient(${C.paper}f2,${C.paper}e6);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);margin:0 -4px}
    .tabBtn{flex:0 0 auto;display:flex;align-items:center;gap:7px;border:1.5px solid ${C.line};background:#fff;border-radius:999px;padding:8px 15px;font-size:13px;font-weight:700;color:${C.ink};cursor:pointer;white-space:nowrap;transition:border-color .15s,box-shadow .15s,transform .12s}
    .tabBtn:hover{border-color:${C.blue};box-shadow:0 2px 8px rgba(43,93,168,.18);transform:translateY(-1px)}
    .tabBtnOn{background:${C.ink};color:#fff;border-color:${C.ink};box-shadow:0 3px 10px rgba(16,35,48,.25)}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    main>*{animation:fadeUp .32s ease}
    @media(prefers-reduced-motion:reduce){main>*{animation:none}.tabBtn{transition:none}}
    .shellFooter{margin-top:22px;font-size:11px;color:${C.sub};border-top:1px solid ${C.line};padding-top:10px;line-height:1.7}

    .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .btn{border:1px solid ${C.line};background:#fff;border-radius:9px;padding:7px 12px;font-size:12px;cursor:pointer;color:${C.ink}}
    .btn:hover{border-color:${C.blue}}
    .btnP{background:${C.ink};color:#fff;border-color:${C.ink}}
    .card{background:#fff;border:1px solid ${C.line};border-radius:13px;padding:14px;box-shadow:0 1px 2px rgba(16,35,48,.05);margin-bottom:14px}
    .ct{font-size:13px;font-weight:800;letter-spacing:.12em;color:${C.blue};margin-bottom:10px;border-left:3.5px solid ${C.blue};padding-left:9px;line-height:1.3}
    .step{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800;margin:14px 0 8px}
    .step:first-of-type{margin-top:0}
    .stepNo{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;background:${C.ink};color:#fff;font-size:12px;font-weight:800;flex:0 0 auto}
    .small{font-size:11.5px;color:${C.sub};margin-top:3px;line-height:1.5}
    .para{font-size:13px;line-height:1.75;margin:6px 0;color:#22343F}
    .pick{display:grid;gap:8px}
    .pk{display:flex;flex-direction:column;align-items:center;gap:2px;border:1.5px solid ${C.line};background:#fff;border-radius:11px;padding:9px 6px;cursor:pointer;color:${C.ink}}
    .pk:hover{border-color:${C.blue}}
    .pk.on{border-color:${C.ink};box-shadow:inset 0 0 0 1.5px ${C.ink};background:#F6F9FB}
    .pkIcon{font-size:20px;line-height:1}
    .pkBig .pkIcon{font-size:26px}
    .pkLabel{font-size:12px;font-weight:800;text-align:center;line-height:1.25}
    .pkSub{font-size:10.5px;color:${C.sub};text-align:center;line-height:1.2}
    .bandSel{width:100%;border:1px solid ${C.line};border-radius:9px;padding:8px 10px;font-size:13px;background:#fff;color:${C.ink};font-family:inherit;box-sizing:border-box;margin-bottom:4px}
    .sliderRow{display:flex;align-items:center;gap:12px;margin:6px 0}
    .slider{flex:1;accent-color:${C.ink};height:26px}
    .chips,.segRow{display:flex;gap:6px;flex-wrap:wrap}
    .chip{border:1px solid ${C.line};background:#fff;border-radius:999px;padding:5px 12px;font-size:11.5px;cursor:pointer;color:${C.ink}}
    .chip:hover{border-color:${C.blue}}
    .chipOn{background:${C.ink};color:#fff;border-color:${C.ink};font-weight:700}
    .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
    .kpi{background:#F6F9FB;border:1px solid ${C.line};border-radius:11px;padding:11px 12px}
    .kpik{font-size:11px;color:${C.sub};letter-spacing:.06em}
    .kpiv{font-size:20px;font-weight:800;margin-top:3px;font-family:ui-monospace,"SF Mono",Consolas,monospace;letter-spacing:-.01em}
    .unit{font-size:12px;font-weight:600;color:${C.sub};margin-left:3px}
    .badge{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:5px 12px;font-size:13.5px;font-weight:800}
    .dot{width:9px;height:9px;border-radius:999px}
    .legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11.5px;color:${C.sub};align-items:center}
    .legend .sw,.lossBarLegend .sw{display:inline-block;width:14px;height:4px;border-radius:2px;margin-right:5px;vertical-align:middle}
    .swBox{display:inline-block;width:11px;height:11px;border-radius:2.5px;margin-right:5px;vertical-align:middle}
    .uNote{font-size:12.5px;line-height:1.65;background:#F6F9FB;border-left:3px solid ${C.ink};padding:9px 12px;border-radius:0 9px 9px 0;margin-top:8px}
    .novice{background:linear-gradient(135deg,#EAF4FB,#F2F8F4);border:1px solid #BFD8E8;border-radius:13px;padding:13px 15px;margin-bottom:14px}
    .noviceHead{display:flex;align-items:center;gap:8px;font-size:13.5px;margin-bottom:5px}
    .noviceBody{font-size:13px;line-height:1.75;color:#22343F}
    .term{border-bottom:1.5px dotted ${C.blue};color:${C.blue};cursor:help;position:relative;font-weight:600}
    .termPop{position:absolute;left:0;top:1.5em;z-index:40;width:min(290px,72vw);background:#102330;color:#D8E6EE;border-radius:10px;padding:10px 12px;font-size:11.5px;line-height:1.6;font-weight:400;box-shadow:0 6px 20px rgba(16,35,48,.35)}
    .termPop b{display:block;color:#9FD8FF;margin-bottom:3px}
    .lossBar{margin-top:10px}
    .lossBarTrack{display:flex;height:14px;border-radius:7px;overflow:hidden;border:1px solid ${C.line}}
    .lossBarSeg{min-width:3px}
    .lossBarLegend{display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:${C.sub};margin-top:6px;align-items:center}

    .mapLayout{display:grid;grid-template-columns:340px 1fr;gap:14px;align-items:start}
    .mapsGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
    .mapPane{background:#fff;border:1px solid ${C.line};border-radius:12px;padding:10px}
    .mapHead{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:7px;font-size:13px}
    .mapSub{font-size:11px;color:${C.sub};margin-left:7px}
    .mapStat{font-size:12px}
    .mapStat b{font-size:16px;font-family:ui-monospace,monospace}
    .mapKpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:6px;margin-top:8px}
    .mapKpis>div{border-left:3px solid ${C.line};padding:1px 0 1px 7px}
    .mapKpis span{display:block;font-size:10px;color:${C.sub}}
    .mapKpis b{font-size:13px;font-family:ui-monospace,monospace}
    .abGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .abLabel{font-size:12px;font-weight:800;letter-spacing:.08em;margin-bottom:6px}
    .compareBox{background:#fff;border:1.5px solid ${C.accent};border-radius:12px;padding:12px 14px;font-size:13.5px;line-height:1.7;margin-bottom:12px}
    .selGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}

    .rssiMeter{max-width:340px;margin:10px auto 0}
    .rssiScreen{background:#10241C;border:2px solid #0A1812;border-radius:10px;padding:10px 14px;text-align:center}
    .rssiLabel{font-size:10px;letter-spacing:.3em;color:#5E8F7C}
    .rssiValue{font-size:34px;font-weight:800;color:#7BE3C5;font-family:ui-monospace,monospace;transition:color .3s}
    .rssiValue span{font-size:14px;color:#5E8F7C}
    .rssiDelta{font-size:12px;font-weight:700;font-family:ui-monospace,monospace}
    .rssiBarTrack{position:relative;height:12px;background:#E4EDF2;border-radius:6px;margin-top:8px;overflow:visible}
    .rssiBarFill{height:100%;border-radius:6px;transition:width .5s ease,background .5s ease}
    .rssiBarBase{position:absolute;top:-3px;width:2.5px;height:18px;background:${C.ink};border-radius:2px}
    .rssiTicks{display:flex;justify-content:space-between;font-size:10px;color:${C.sub};font-family:ui-monospace,monospace;margin-top:3px}
    .expGrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
    .threeCol{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:10px}
    .factorBox{background:#F6F9FB;border:1px solid ${C.line};border-radius:11px;padding:11px 12px}
    .factorBox b{font-size:13px}
    .factorBox p{font-size:12px;line-height:1.6;color:#33454F;margin:6px 0 0}

    .solList{display:grid;gap:8px}
    .solItem{display:block;text-align:left;background:#fff;border:1.5px solid ${C.line};border-radius:11px;padding:10px 12px;cursor:pointer;color:${C.ink};font-family:inherit}
    .solItem:hover{border-color:${C.blue}}
    .solOn{border-color:${C.ok};box-shadow:inset 0 0 0 1.5px ${C.ok};background:#F4FAF8}
    .solHead{display:flex;justify-content:space-between;gap:8px;font-size:13px;align-items:baseline}
    .solMeta{font-size:12px;margin:3px 0}

    .utilTabs{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
    .utilTab{display:flex;align-items:center;gap:8px;border:2px solid ${C.line};background:#fff;border-radius:12px;padding:10px 22px;font-size:15px;font-weight:800;color:${C.sub};cursor:pointer}
    .utilTab.on{background:#fff;box-shadow:0 2px 6px rgba(16,35,48,.08)}
    .scGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
    .scCard{display:flex;flex-direction:column;gap:8px;text-align:left;background:#fff;border:1.5px solid ${C.line};border-radius:13px;padding:12px;cursor:pointer;color:${C.ink};font-family:inherit;box-shadow:0 1px 2px rgba(16,35,48,.05);transition:border-color .15s,transform .15s,box-shadow .15s}
    .scCard:hover{border-color:${C.blue};transform:translateY(-2px);box-shadow:0 6px 18px rgba(16,35,48,.12)}
    .scThumb{margin:-12px -12px 2px;border-radius:11px 11px 0 0;overflow:hidden;border-bottom:1px solid ${C.line};pointer-events:none;background:#F4F8FA}
    .keyFig{display:flex;align-items:baseline;gap:8px;background:#F0F6FB;border:1px solid #C9DCEC;border-radius:10px;padding:8px 12px;margin:6px 0}
    .keyFigVal{font-size:24px;font-weight:900;color:${C.blue};font-family:ui-monospace,monospace;letter-spacing:-.02em}
    .keyFigLab{font-size:11.5px;color:${C.sub};font-weight:700}
    .checkList{margin:8px 0 0;padding:0;list-style:none}
    .checkList li{position:relative;padding:5px 0 5px 26px;font-size:12.5px;line-height:1.55;border-bottom:1px dashed ${C.grid}}
    .checkList li:before{content:"✓";position:absolute;left:4px;top:4px;color:${C.ok};font-weight:900}
    .faqItem{background:#fff;border:1px solid ${C.line};border-radius:11px;padding:3px 14px;margin-bottom:8px}
    .faqItem summary{cursor:pointer;font-size:13.5px;font-weight:800;padding:9px 0;color:${C.ink};list-style:none;display:flex;gap:9px;align-items:baseline}
    .faqItem summary:before{content:"Q.";color:${C.blue};font-weight:900;flex:0 0 auto}
    .faqItem[open] summary{border-bottom:1px dashed ${C.grid}}
    .faqA{font-size:13px;line-height:1.8;color:#22343F;padding:9px 0 11px 24px;position:relative}
    .faqA:before{content:"A.";position:absolute;left:0;color:${C.accent};font-weight:900}
    .researchCard{background:#fff;border:1.5px solid ${C.line};border-radius:13px;box-shadow:0 1px 2px rgba(16,35,48,.05);transition:border-color .15s,transform .15s,box-shadow .15s;align-self:start}
    .researchCard:hover{border-color:${C.blue};transform:translateY(-2px);box-shadow:0 6px 18px rgba(16,35,48,.12)}
    .catTag{display:inline-block;font-size:10.5px;font-weight:700;color:${C.cyan};background:#E7F2F6;border-radius:999px;padding:2px 9px;margin-top:4px}
    .specCard{border:1.5px solid #9FC0DB;background:linear-gradient(180deg,#F2F8FC,#E8F1F8);border-radius:11px;padding:10px 12px;margin-top:8px}
    .specHead{display:inline-block;font-size:12px;font-weight:800;color:#fff;background:${C.blue};border-radius:6px;padding:2px 12px;margin-bottom:7px;letter-spacing:.05em}
    .specLine{font-size:13px;font-weight:700;color:${C.ink};line-height:1.7}
    .specRate{margin-top:6px}
    .specRateLab{font-size:12px;font-weight:800;color:${C.ink};display:flex;align-items:center;gap:6px}
    .specRateLab:before{content:"●";color:${C.blue};font-size:10px}
    .specRateVals{display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 0 16px;font-size:12px;font-family:ui-monospace,monospace}
    .specRateVals span{background:#fff;border:1px solid ${C.line};border-radius:6px;padding:2px 8px}
    .specRateVals b{color:${C.sub};font-weight:700;margin-right:3px}
    .specNote{font-size:10.5px;color:${C.sub};margin-top:7px;line-height:1.5}
    .scCardHead{display:flex;align-items:center;gap:9px;font-size:14px}
    .scCardFoot{display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:6px;border-top:1px dashed ${C.line};font-size:12px}
    .scHead{display:flex;align-items:center;gap:12px;margin:12px 0}
    .scTitle{font-size:19px;font-weight:800;margin:0}
    .scIcon{font-size:26px}
    .physTable{display:grid;gap:7px;margin-bottom:6px}
    .physRow{display:grid;grid-template-columns:minmax(130px,1fr) auto;gap:2px 12px;background:#F6F9FB;border:1px solid ${C.line};border-radius:9px;padding:8px 11px;font-size:12.5px;align-items:baseline}
    .physRow .small{grid-column:1/-1}
    .physDb{font-family:ui-monospace,monospace;font-weight:800;text-align:right}
    .gauge{margin:10px 0 2px}
    .gaugeTrack{position:relative;height:18px;border-radius:9px;border:1px solid ${C.line};overflow:hidden;background:#fff}
    .gaugeZone{position:absolute;top:0;height:100%}
    .gaugeMark{position:absolute;top:0;height:100%;width:0;border-left:2.5px dashed ${C.sub}}
    .gaugeNeedle{position:absolute;top:-2px;height:22px;width:5px;border-radius:3px;transition:left .45s ease,background .45s ease;box-shadow:0 1px 3px rgba(16,35,48,.4)}
    .gaugeLabels{display:flex;justify-content:space-between;font-size:10px;color:${C.sub};margin-top:3px}
    .proNote{background:#F6F9FB;border:1px dashed ${C.line};border-radius:10px;padding:9px 12px;font-size:12.5px}
    .proNote summary{cursor:pointer;font-weight:700;color:${C.blue}}

    .hero{background:linear-gradient(135deg,#0F2B45,#173E5E 55%,#1B5A74);border-radius:16px;padding:30px 28px;color:#EAF4FB;margin-bottom:14px}
    .heroEyebrow{font-size:11.5px;letter-spacing:.25em;color:#7BC8E8;font-weight:700}
    .heroTitle{font-size:clamp(21px,3.4vw,32px);line-height:1.45;margin:10px 0 12px;font-weight:800}
    .heroTitle span{color:#fff;background:rgba(255,255,255,.13);padding:0 6px;border-radius:6px}
    .heroLead{font-size:13.5px;line-height:1.85;max-width:780px;color:#C9E2F0}
    .heroCtas{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
    .heroCtas .btn{border-color:rgba(255,255,255,.4);background:transparent;color:#EAF4FB}
    .heroCtas .btnP{background:#fff;color:#0F2B45;border-color:#fff;font-weight:800}
    .statGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:14px}
    .statCard{background:#fff;border:1px solid ${C.line};border-radius:13px;padding:14px 16px}
    .statValue{font-size:24px;font-weight:800;color:${C.blue};font-family:ui-monospace,monospace}
    .statLabel{font-size:13px;font-weight:700;margin:3px 0}
    .issueGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:10px}
    .tabGuide{display:grid;gap:8px}
    .tabGuideItem{display:flex;align-items:center;gap:13px;text-align:left;background:#F6F9FB;border:1px solid ${C.line};border-radius:11px;padding:11px 14px;cursor:pointer;color:${C.ink};font-family:inherit;font-size:13px}
    .tabGuideItem:hover{border-color:${C.blue};background:#EEF5FB}
    .tabGuideIcon{font-size:23px}
    .tabGuideArrow{margin-left:auto;color:${C.blue};font-weight:800;font-size:16px}
    .who{font-size:10.5px;color:#fff;background:${C.cyan};border-radius:999px;padding:2px 8px;margin-left:6px;font-weight:700}
    .aboutBox{font-size:12px;color:${C.sub};line-height:1.8;background:#fff;border:1px solid ${C.line};border-radius:12px;padding:13px 16px}

    @media(max-width:1000px){.mapLayout{grid-template-columns:1fr}.expGrid{grid-template-columns:1fr}}
    @media(max-width:760px){
      .mapsGrid,.abGrid,.selGrid{grid-template-columns:1fr}
      .threeCol,.statGrid{grid-template-columns:1fr}
      .mapKpis{grid-template-columns:repeat(2,minmax(0,1fr))}
      .shellTitle{font-size:18px}
      .pick{grid-template-columns:repeat(2,minmax(0,1fr)) !important}
    }
  `, []);

  return (
    <div className="shellRoot">
      <style>{css}</style>
      <div className="shellWrap">
        <header className="shellHead">
          <div>
            <div className="shellEyebrow">STAF × SMART METER RF SIMULATOR</div>
            <h1 className="shellTitle">スマートメーター 電波とアンテナ シミュレーター</h1>
            <div className="shellSub">アンテナの静特性が「設置できるエリア」を決める——電気・ガス・水道の現場を体感する</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div className="small">講演連動コンテンツ</div>
            <a className="btn btnP" style={{ textDecoration: "none" }} href={CONTACT_URL} target="_blank" rel="noopener">📩 アンテナのご相談・お問い合わせ</a>
          </div>
        </header>

        <nav className="tabsNav" aria-label="モード切替">
          {TABS.map((t) => (
            <button key={t.key} className={`tabBtn ${tab === t.key ? "tabBtnOn" : ""}`} onClick={() => go(t.key)} aria-current={tab === t.key}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>

        <main>
          {tab === "home" && <Home onNavigate={go} />}
          {tab === "map" && <CoverageMap />}
          {tab === "story" && <StoryMode />}
          {tab === "pit" && <PitLab />}
          {tab === "lab" && <ExperimentLab />}
          {tab === "research" && <ResearchLab />}
          {tab === "pro" && <ProSimulator />}
        </main>

        <footer className="shellFooter">
          本ツールは机上概算用であり、通信性能・到達距離を保証するものではありません。数値は公開情報・文献値・講演実測に基づく代表値で、実機仕様・法令・ARIB規格・現地測定に基づく確認が必要です。
          ／ アンテナ・無線実装のご相談は「基板設計」の段階から——スタッフ株式会社（新横浜）
          ／ <a href={CONTACT_URL} target="_blank" rel="noopener" style={{ color: C.blue, fontWeight: 700 }}>スマートメーター・IoT機器のアンテナ設計のお問い合わせはこちら</a>
        </footer>
      </div>
    </div>
  );
}
