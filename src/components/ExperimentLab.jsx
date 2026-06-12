import React, { useMemo, useState } from "react";
import { C, fmt, fmtSigned, round, clamp } from "../theme.js";
import { LECTURE_EXPERIMENTS } from "../data/core.js";
import { Card, NoviceNote, PickGrid, Term } from "./common.jsx";

/** RSSI測定器風の表示 */
function RssiMeter({ rssi, baseline = -55 }) {
  const delta = rssi - baseline;
  const frac = clamp((rssi + 90) / 60, 0, 1); // -90..-30 を 0..1 に
  return (
    <div className="rssiMeter">
      <div className="rssiScreen">
        <div className="rssiLabel">RSSI</div>
        <div className="rssiValue">{rssi}<span> dBm</span></div>
        <div className="rssiDelta" style={{ color: delta < 0 ? "#FF8E8E" : "#7BE3C5" }}>
          {delta === 0 ? "基準" : `基準から ${fmtSigned(delta, 0)} dB`}
        </div>
      </div>
      <div className="rssiBarTrack">
        <div className="rssiBarFill" style={{ width: `${frac * 100}%`, background: frac > 0.5 ? C.ok : frac > 0.3 ? C.warn : C.ng }} />
        <div className="rssiBarBase" style={{ left: `${clamp((baseline + 90) / 60, 0, 1) * 100}%` }} title="基準 -55dBm" />
      </div>
      <div className="rssiTicks"><span>-90</span><span>-75</span><span>-60</span><span>-45</span><span>-30</span></div>
    </div>
  );
}

/** 実験対象デバイスのイラスト */
function DeviceIllust({ condition }) {
  return (
    <svg viewBox="0 0 300 190" style={{ width: "100%", maxWidth: 340, display: "block", margin: "0 auto" }} aria-label="実験条件のイラスト">
      {/* 基板 */}
      <rect x="90" y="60" width="120" height="70" rx="6" fill="#1E5C46" stroke="#0F2E2A" strokeWidth="2" />
      <rect x="100" y="70" width="36" height="24" rx="3" fill="#14252F" />
      <circle cx="170" cy="82" r="6" fill="#C9A227" />
      <rect x="150" y="100" width="44" height="16" rx="2" fill="#14252F" />
      {/* アンテナ */}
      <rect x="210" y="52" width="14" height="86" rx="4" fill="#C77B3A" stroke="#8A4F1D" strokeWidth="2" />
      <text x="217" y="46" textAnchor="middle" fontSize="10" fill={C.sub}>アンテナ</text>
      {/* 電波 */}
      {condition !== "sandwich" && [0, 1, 2].map((k) => (
        <path key={k} d={`M ${232 + k * 14} ${95 - k * 4} a ${14 + k * 10} ${14 + k * 10} 0 0 1 0 ${k * 8 + 1}`} fill="none" stroke={C.blue} strokeWidth="2.2" opacity={condition === "baseline" ? 0.9 - k * 0.18 : 0.45 - k * 0.12} strokeLinecap="round" transform={`rotate(${-8 + k * 4} 240 95)`} />
      ))}
      {/* 条件別の重ね描き */}
      {condition === "pocket" && (
        <g>
          <path d="M 60 30 q 60 -22 180 0 l 14 140 q -104 18 -208 0 z" fill="#3E5466" opacity="0.78" />
          <path d="M 95 30 q 55 36 110 0" fill="none" stroke="#22323E" strokeWidth="4" />
          <text x="150" y="170" textAnchor="middle" fontSize="12" fill="#fff" fontWeight="700">ポケット（人体に接触）</text>
        </g>
      )}
      {condition === "battery" && (
        <g>
          <rect x="206" y="48" width="42" height="94" rx="6" fill="#3C4854" stroke="#22303B" strokeWidth="2" />
          <rect x="218" y="42" width="18" height="8" rx="2" fill="#22303B" />
          <text x="227" y="100" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700" transform="rotate(90 227 100)">バッテリー</text>
        </g>
      )}
      {condition === "sandwich" && (
        <g>
          <rect x="196" y="30" width="44" height="56" rx="4" fill="#1E5C46" stroke="#0F2E2A" strokeWidth="2" />
          <rect x="196" y="104" width="44" height="56" rx="4" fill="#1E5C46" stroke="#0F2E2A" strokeWidth="2" />
          <text x="218" y="24" textAnchor="middle" fontSize="10" fill={C.sub}>基板で挟む</text>
          <path d="M 250 86 l 16 0" stroke={C.ng} strokeWidth="3" strokeLinecap="round" />
          <path d="M 258 78 l 0 16" stroke={C.ng} strokeWidth="3" strokeLinecap="round" transform="rotate(45 258 86)" />
        </g>
      )}
    </svg>
  );
}

/** 金属からの距離による悪化（定性モデル: 30cmルールの体感用） */
const metalDegradation = (cm) => -round(12 * Math.exp(-cm / 7.5), 1);

function MetalDistanceSim() {
  const [cm, setCm] = useState(2);
  const deg = metalDegradation(cm);
  const level = deg <= -8 ? "ng" : deg <= -3 ? "warn" : "ok";
  const col = { ok: C.ok, warn: C.warn, ng: C.ng }[level];
  return (
    <Card title="② 「金属・ノイズから30cm」を体感する">
      <div className="expGrid">
        <div>
          <svg viewBox="0 0 320 150" style={{ width: "100%" }} aria-label="金属からの距離">
            <rect x="10" y="20" width="26" height="110" fill="#8A9BA8" stroke="#5B6E79" strokeWidth="2" />
            <text x="23" y="78" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700" transform="rotate(90 23 75)">金属板</text>
            <rect x={46 + (cm / 50) * 200} y="50" width="12" height="64" rx="4" fill="#C77B3A" stroke="#8A4F1D" strokeWidth="2" />
            <line x1="36" y1="135" x2={46 + (cm / 50) * 200} y2="135" stroke={C.ink} strokeWidth="1.6" markerEnd="" />
            <text x={(36 + 46 + (cm / 50) * 200) / 2} y="148" textAnchor="middle" fontSize="11" fill={C.ink} fontWeight="700">{cm} cm</text>
            {[0, 1, 2].map((k) => (
              <path key={k} d={`M ${70 + (cm / 50) * 200 + k * 13} ${78 - k * 3} a ${12 + k * 9} ${12 + k * 9} 0 0 1 0 ${k * 7 + 2}`} fill="none" stroke={col} strokeWidth="2" opacity={0.8 - k * 0.2} strokeLinecap="round" />
            ))}
          </svg>
          <div className="sliderRow">
            <span className="small">距離</span>
            <input className="slider" type="range" min="0" max="50" step="1" value={cm} onChange={(e) => setCm(parseInt(e.target.value, 10))} />
            <b style={{ minWidth: 56, textAlign: "right" }}>{cm} cm</b>
          </div>
        </div>
        <div>
          <div className="kpi" style={{ background: level === "ok" ? C.okBg : level === "warn" ? C.warnBg : C.ngBg }}>
            <div className="kpik">アンテナ性能への影響（目安）</div>
            <div className="kpiv" style={{ color: col }}>{deg} <span className="unit">dB</span></div>
            <div className="small">
              {cm < 5 && "金属密着圏。共振がズレて効率も落ち、放射パターンも変形します。"}
              {cm >= 5 && cm < 15 && "まだ影響圏内。あと10〜20cm離すと大きく改善します。"}
              {cm >= 15 && cm < 30 && "影響は小さくなってきました。講演の目安は30cmです。"}
              {cm >= 30 && "講演の推奨どおり。金属の影響はほぼ無視できる距離です。"}
            </div>
          </div>
          <div className="small" style={{ marginTop: 8 }}>
            📖 講演より: 「金属・ノイズを離す——30cm離す/30cmずらす（最小コストで効く）」。困ったときは30cmを目安にアンテナを移動してみる。
            ※曲線は体感用の定性モデルです。実際は周波数・金属形状で変わります。
          </div>
        </div>
      </div>
    </Card>
  );
}

/** 縦置き/横置きの放射パターン */
function OrientationSim() {
  const [horizontal, setHorizontal] = useState(false);
  return (
    <Card title="③ 「基本は縦置き」——アンテナの向きと電波の出方">
      <div className="expGrid">
        <div style={{ textAlign: "center" }}>
          <svg viewBox="0 0 320 190" style={{ width: "100%", maxWidth: 360 }} aria-label="放射パターン">
            {/* 地面 */}
            <line x1="10" y1="160" x2="310" y2="160" stroke={C.ink} strokeWidth="2" />
            {/* アンテナ */}
            {horizontal ? (
              <rect x="125" y="86" width="70" height="12" rx="4" fill="#C77B3A" stroke="#8A4F1D" strokeWidth="2" />
            ) : (
              <rect x="154" y="56" width="12" height="70" rx="4" fill="#C77B3A" stroke="#8A4F1D" strokeWidth="2" />
            )}
            {/* ドーナツパターン（断面）: 縦置き→水平に強い8の字、横置き→上下に8の字 */}
            {horizontal ? (
              <g opacity="0.85">
                <ellipse cx="160" cy="52" rx="26" ry="38" fill="none" stroke={C.blue} strokeWidth="2.4" />
                <ellipse cx="160" cy="132" rx="26" ry="38" fill="none" stroke={C.blue} strokeWidth="2.4" />
                <text x="262" y="95" fontSize="11" fill={C.ng} fontWeight="700" textAnchor="middle">受信局方向は弱い!</text>
                <path d="M 200 92 l 40 0" stroke={C.ng} strokeWidth="2" strokeDasharray="4 4" />
              </g>
            ) : (
              <g opacity="0.85">
                <ellipse cx="104" cy="91" rx="44" ry="24" fill="none" stroke={C.blue} strokeWidth="2.4" />
                <ellipse cx="216" cy="91" rx="44" ry="24" fill="none" stroke={C.blue} strokeWidth="2.4" />
                <text x="268" y="80" fontSize="11" fill={C.ok} fontWeight="700" textAnchor="middle">水平方向に強い</text>
              </g>
            )}
            {/* 受信局 */}
            <line x1="290" y1="160" x2="290" y2="110" stroke="#6B5B45" strokeWidth="3" />
            <circle cx="290" cy="106" r="3" fill={C.ink} />
            <text x="290" y="178" textAnchor="middle" fontSize="10" fill={C.sub}>受信局</text>
          </svg>
          <div className="segRow" style={{ justifyContent: "center" }}>
            <button className={`chip ${!horizontal ? "chipOn" : ""}`} onClick={() => setHorizontal(false)}>縦置き（推奨）</button>
            <button className={`chip ${horizontal ? "chipOn" : ""}`} onClick={() => setHorizontal(true)}>横置き（倒す）</button>
          </div>
        </div>
        <div>
          <div className="kpi" style={{ background: horizontal ? C.warnBg : C.okBg }}>
            <div className="kpik">受信局方向（水平）の電波</div>
            <div className="kpiv" style={{ color: horizontal ? C.warn : C.ok }}>{horizontal ? "-10〜-20" : "基準"} <span className="unit">dB</span></div>
            <div className="small">
              {horizontal
                ? "アンテナを倒すと、ドーナツ状の放射が縦回転し、受信局のある水平方向がパターンのヌル（弱い方向）に当たります。さらに偏波も90°ズレるため二重に不利です。"
                : "無指向性アンテナは縦置きで水平方向にドーナツ状に電波を放射します。スマートメーターの受信局はほぼ水平方向にあるため、縦置きが基本です。"}
            </div>
          </div>
          <div className="small" style={{ marginTop: 8 }}>
            📖 講演より: 「無指向性アンテナは、水平方向に電波を放射する。上下方向は極端に弱くなります！」「ダメなら倒して横向き＝良い方を採用——最後は実験で確かめる」。
            <Term k="偏波">偏波</Term>のズレは送受で向きが合わないと大きな損失になります。
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function ExperimentLab() {
  const [cond, setCond] = useState("baseline");
  const exp = useMemo(() => LECTURE_EXPERIMENTS.find((e) => e.key === cond) || LECTURE_EXPERIMENTS[0], [cond]);

  return (
    <div>
      <NoviceNote icon="🧪" title="講演で行った実機実験を、ここで再現できます">
        Leafony（LoRa通信ボード）＋ 1018-521Aアンテナ ＋ RSSI測定器を使った公開実験と同じ条件を選んで、<Term k="RSSI">RSSI</Term>がどう変わるかを見てみましょう。
        「わずかな配置の違い」が通信距離を半分以下にすることが、実測値で確認されています。
      </NoviceNote>

      <Card title="① 実機実験: アンテナの周囲で何が起きるか（実測値で再現）">
        <PickGrid
          options={LECTURE_EXPERIMENTS.map((e) => ({ key: e.key, icon: e.icon, label: e.label, sub: e.deltaDb ? `-${e.deltaDb}dB` : "基準 -55dBm" }))}
          value={cond}
          onChange={setCond}
          cols={4}
        />
        <div className="expGrid" style={{ marginTop: 12 }}>
          <div>
            <DeviceIllust condition={cond} />
            <RssiMeter rssi={exp.rssi} />
          </div>
          <div>
            <div className="kpis" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="kpi">
                <div className="kpik">電力換算</div>
                <div className="kpiv" style={{ color: exp.deltaDb >= 10 ? C.ng : exp.deltaDb >= 6 ? C.warn : C.ok }}>{exp.powerText}</div>
                <div className="small">送信電力がこの比率に減ったのと同じ</div>
              </div>
              <div className="kpi">
                <div className="kpik">通信距離への影響</div>
                <div className="kpiv" style={{ color: exp.deltaDb >= 10 ? C.ng : exp.deltaDb >= 6 ? C.warn : C.ok }}>{exp.distText}</div>
                <div className="small">同じ受信感度で届く距離の目安</div>
              </div>
            </div>
            <div className="uNote" style={{ marginTop: 10 }}>
              <b>{exp.label}</b><br />
              {exp.desc}<br />
              <span style={{ color: C.sub }}>{exp.physics}</span>
            </div>
            {cond !== "baseline" && (
              <div className="small" style={{ marginTop: 8 }}>
                💡 この悪化は「通信エリアマップ」タブで同じ条件を選ぶと、町全体への影響として見られます。
              </div>
            )}
          </div>
        </div>
      </Card>

      <MetalDistanceSim />
      <OrientationSim />

      <Card title="④ なぜ「事前の予測」が難しいのか">
        <div className="threeCol">
          <div className="factorBox">
            <b>01 金属の近接</b>
            <p>アンテナ近くの金属が<b>共振条件</b>を変え、設計した周波数からズレてしまう。→ 周波数がズレる</p>
          </div>
          <div className="factorBox">
            <b>02 ケーブル電流</b>
            <p>ケーブルの這わせ方ひとつで電流の流れ方が変わり、<b>放射パターン</b>が変わる。→ 飛ぶ方向が変わる</p>
          </div>
          <div className="factorBox">
            <b>03 基板GND</b>
            <p>GNDの大きさ・形がアンテナの一部として働き、<b>アンテナ特性</b>そのものが変わる。→ 効率が変わる</p>
          </div>
        </div>
        <div className="uNote">
          だから、シミュレーションだけでは追いきれず、<b>実機での検証が不可欠</b>。スタッフ株式会社は試作段階でのOTA測定・アンテナ+GND設計・測定調整を一体で提供し、量産後の「つながらない」を設計段階で防ぎます。
        </div>
      </Card>
    </div>
  );
}
