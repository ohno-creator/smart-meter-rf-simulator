import React, { useEffect, useState } from "react";
import { C } from "../theme.js";

/** 選択グリッド */
export function PickGrid({ options, value, onChange, cols = 3, big = false }) {
  return (
    <div className="pick" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button
          key={o.key}
          className={`pk ${big ? "pkBig" : ""} ${value === o.key ? "on" : ""}`}
          onClick={() => onChange(o.key)}
          aria-pressed={value === o.key}
          type="button"
        >
          <span className="pkIcon">{o.icon}</span>
          <span className="pkLabel">{o.label}</span>
          {o.sub ? <span className="pkSub">{o.sub}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** セクション見出し */
export function Step({ no, children }) {
  return (
    <div className="step">
      {no != null ? <span className="stepNo">{no}</span> : null}
      {children}
    </div>
  );
}

/** カード */
export function Card({ title, children, style }) {
  return (
    <div className="card" style={style}>
      {title ? <div className="ct">{title}</div> : null}
      {children}
    </div>
  );
}

/** 初心者向け解説ボックス */
export function NoviceNote({ icon = "💡", title, children }) {
  return (
    <div className="novice">
      <div className="noviceHead">
        <span>{icon}</span>
        <b>{title}</b>
      </div>
      <div className="noviceBody">{children}</div>
    </div>
  );
}

/** 用語ツールチップ（タップ/ホバーで開く簡易辞書） */
const GLOSSARY = {
  dB: "デシベル。電波の強さの「倍率」を表す単位。-3dBで半分、-10dBで1/10、-20dBで1/100。掛け算を足し算で扱えるので無線の世界では必須。",
  dBm: "1mW（ミリワット）を基準にした電波の絶対的な強さ。0dBm=1mW、-105dBmは1mWの約300億分の1というかすかな電波。",
  RSSI: "受信した電波の強さ（Received Signal Strength Indicator）。dBmで表す。数字が0に近いほど強い。",
  受信感度: "受信機が「ここまで弱い電波なら受け取れる」という限界値。これを下回ると通信できない。",
  マージン: "受信電波の強さと受信感度の差＝余裕。雨・人・車などで電波は日々変動するので、10〜20dBの余裕が必要。",
  VSWR: "アンテナと無線機の「接続の良さ」。1に近いほど良い。悪いと送った電力が反射して戻ってしまう。",
  放射効率: "アンテナに入れた電力のうち、実際に電波として飛んでいく割合。周囲の金属や人体で大きく下がる。",
  偏波: "電波の振動の向き。送信と受信で向き（縦・横）が合わないと、電波は強くても受け取れない。",
  EIRP: "アンテナ込みの実効的な送信電力。送信機の出力＋アンテナの利得−損失。",
  パスロス指数: "距離が2倍になったとき電波がどれだけ弱くなるかの指標n。自由空間でn=2（-6dB）、都市部はn=3〜4。",
};
export function Term({ k, children }) {
  const [open, setOpen] = useState(false);
  const text = GLOSSARY[k];
  if (!text) return <>{children || k}</>;
  return (
    <span className="term" tabIndex={0} role="button" aria-label={`用語: ${k}`}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}>
      {children || k}
      {open ? (
        <span className="termPop" role="tooltip">
          <b>{k}</b>
          {text}
        </span>
      ) : null}
    </span>
  );
}

/** 判定バッジ */
export function JudgeBadge({ level, label }) {
  const map = {
    ok: { color: C.ok, bg: C.okBg },
    warn: { color: C.warn, bg: C.warnBg },
    ng: { color: C.ng, bg: C.ngBg },
    bad: { color: C.bad, bg: C.badBg },
  };
  const t = map[level] || map.warn;
  return (
    <span className="badge" style={{ color: t.color, background: t.bg }}>
      <span className="dot" style={{ background: t.color }} />
      {label}
    </span>
  );
}

/** reduced-motion検出 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setReduced(mq.matches);
    const fn = (e) => setReduced(e.matches);
    mq.addEventListener?.("change", fn);
    return () => mq.removeEventListener?.("change", fn);
  }, []);
  return reduced;
}

/** 通信方式の詳細スペックカード（ローカル5G RU仕様など） */
export function SpecCard({ spec }) {
  if (!spec) return null;
  return (
    <div className="specCard">
      <div className="specHead">{spec.title}</div>
      {spec.lines?.map((l) => <div key={l} className="specLine">{l}</div>)}
      {[spec.dl, spec.ul].filter(Boolean).map((d) => (
        <div key={d.label} className="specRate">
          <div className="specRateLab">{d.label}</div>
          <div className="specRateVals">
            <span><b>同期</b> {d.sync}</span>
            <span><b>準同期</b> {d.semisync}</span>
          </div>
        </div>
      ))}
      {spec.note ? <div className="specNote">※ {spec.note}</div> : null}
    </div>
  );
}

/** 損失の内訳バー */
export function LossBar({ items, totalLabel }) {
  const total = items.reduce((s, x) => s + Math.max(0, x.value), 0);
  if (total <= 0) return null;
  const palette = [C.blue, C.warn, C.ng, C.cyan, C.sub, C.bad, "#7B5EA7", "#3E7C4F"];
  return (
    <div className="lossBar">
      <div className="lossBarTrack">
        {items.filter((x) => x.value > 0).map((x, i) => (
          <div key={x.label} className="lossBarSeg" style={{ flex: x.value, background: palette[i % palette.length] }} title={`${x.label}: ${Math.round(x.value)}dB`} />
        ))}
      </div>
      <div className="lossBarLegend">
        {items.filter((x) => x.value > 0).map((x, i) => (
          <span key={x.label}>
            <span className="sw" style={{ background: palette[i % palette.length] }} />
            {x.label} {Math.round(x.value)}dB
          </span>
        ))}
        {totalLabel ? <b style={{ marginLeft: "auto" }}>{totalLabel}</b> : null}
      </div>
    </div>
  );
}
