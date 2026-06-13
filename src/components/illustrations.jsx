import React from "react";
import { C } from "../theme.js";

/** =====================================================================
 *  シナリオ図解（読まなくても伝わる1枚絵）
 *  既存の断面図スタイル（空/土/メーター/茶色アンテナ/同心円弧）に統一
 *  ===================================================================== */

const SKY_TOP = "#EAF4FA", SKY_BTM = "#D9EAF3", SOIL_TOP = "#B59B72", SOIL_BTM = "#8F7A55", GND = "#5D4F36";
const ANT = "#C77B3A", ANT_EDGE = "#8A4F1D", METAL = "#3C4854", METAL_LT = "#8A9BA8";

/** 電波の弧（dir: 1=右向き, -1=左向き） */
function Waves({ x, y, dir = 1, n = 3, gap = 13, strength = 1, color = C.blue, blockedAt = null }) {
  const arcs = [];
  for (let k = 0; k < n; k++) {
    const r = 10 + k * gap;
    if (blockedAt != null && r > blockedAt) break;
    arcs.push(
      <path key={k}
        d={`M ${x + dir * r} ${y - r * 0.75} A ${r} ${r} 0 0 ${dir > 0 ? 1 : 0} ${x + dir * r} ${y + r * 0.75}`}
        fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round"
        opacity={Math.max(0.12, strength * (0.95 - k * 0.22))} />
    );
  }
  return <g>{arcs}</g>;
}

function Cross({ x, y, label = "届かない" }) {
  return (
    <g>
      <line x1={x - 9} y1={y - 9} x2={x + 9} y2={y + 9} stroke={C.ng} strokeWidth="3.6" strokeLinecap="round" />
      <line x1={x + 9} y1={y - 9} x2={x - 9} y2={y + 9} stroke={C.ng} strokeWidth="3.6" strokeLinecap="round" />
      {label && <text x={x} y={y - 15} textAnchor="middle" fontSize="11" fontWeight="900" fill={C.ng}>✕ {label}</text>}
    </g>
  );
}

function WeakPath({ x1, y1, x2, y2, ok = false, label }) {
  const col = ok ? C.ok : C.warn;
  return (
    <g>
      <path d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - 34} ${x2} ${y2}`} fill="none" stroke={col} strokeWidth="2.2" strokeDasharray={ok ? "none" : "5 5"} opacity="0.85" />
      {label && <text x={(x1 + x2) / 2} y={Math.min(y1, y2) - 40} textAnchor="middle" fontSize="10.5" fontWeight="800" fill={col}>{label}</text>}
    </g>
  );
}

function Tower({ x, gy, h = 56, label = "受信局" }) {
  return (
    <g>
      <line x1={x} y1={gy} x2={x} y2={gy - h} stroke="#6B5B45" strokeWidth="4" />
      <line x1={x - 11} y1={gy - h + 10} x2={x + 11} y2={gy - h + 10} stroke={C.ink} strokeWidth="2.2" />
      <circle cx={x} cy={gy - h + 2} r="3" fill={C.blue} />
      <text x={x} y={gy + 15} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={C.ink}>{label}</text>
    </g>
  );
}

function MeterBox({ x, y, w = 40, h = 28, label }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="4" fill="#FBFDFE" stroke={C.ink} strokeWidth="1.8" />
      <rect x={x + 6} y={y + 6} width={w - 16} height={8} rx="1.5" fill="#10241C" />
      <text x={x + w / 2 - 2} y={y + 12.5} textAnchor="middle" fontSize="6" fill="#7BE3C5" fontFamily="ui-monospace,monospace">888</text>
      {label && <text x={x + w / 2} y={y + h + 12} textAnchor="middle" fontSize="10" fontWeight="700" fill={C.ink}>{label}</text>}
    </g>
  );
}

function Antenna({ x, y, h = 26, horizontal = false }) {
  return horizontal
    ? <rect x={x - h / 2} y={y - 4} width={h} height={8} rx="3.5" fill={ANT} stroke={ANT_EDGE} strokeWidth="1.5" />
    : <rect x={x - 4} y={y - h} width={8} height={h} rx="3.5" fill={ANT} stroke={ANT_EDGE} strokeWidth="1.5" />;
}

function RcWall({ x, y, w, h, id }) {
  return (
    <g>
      <defs>
        <pattern id={`rc-${id}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="#CFDCE5" />
          <line x1="0" y1="0" x2="0" y2="7" stroke="#9FB4C2" strokeWidth="1.6" />
        </pattern>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#rc-${id})`} stroke="#7E92A0" strokeWidth="1.6" />
    </g>
  );
}

function House({ x, gy, w = 34, h = 26, dead = false }) {
  const col = dead ? "#B9C2C8" : "#C6D4DD";
  return (
    <g opacity={dead ? 0.55 : 1}>
      <rect x={x} y={gy - h} width={w} height={h} fill={col} stroke="#9FB4C2" strokeWidth="1.4" />
      <polygon points={`${x - 3},${gy - h} ${x + w / 2},${gy - h - 12} ${x + w + 3},${gy - h}`} fill={dead ? "#9AA6AD" : "#8FA8B8"} />
      <rect x={x + w / 2 - 5} y={gy - 11} width="10" height="11" fill="#5B6E79" />
    </g>
  );
}

/** 場面: 空+地面（地中断面オプション） */
function Scene({ children, soil = false, gy = 170, id }) {
  return (
    <svg viewBox="0 0 560 240" style={{ width: "100%", display: "block" }} aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={SKY_TOP} /><stop offset="1" stopColor={SKY_BTM} /></linearGradient>
        <linearGradient id={`soil-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={SOIL_TOP} /><stop offset="1" stopColor={SOIL_BTM} /></linearGradient>
      </defs>
      <rect x="0" y="0" width="560" height={gy} fill={`url(#sky-${id})`} />
      {soil ? <rect x="0" y={gy} width="560" height={240 - gy} fill={`url(#soil-${id})`} /> : <rect x="0" y={gy} width="560" height={240 - gy} fill="#E4E9EC" />}
      <line x1="0" y1={gy} x2="560" y2={gy} stroke={GND} strokeWidth="2.6" />
      {children}
    </svg>
  );
}

/* ============================ 各場面 ============================ */

const MetalPanel = () => (
  <Scene id="mp" gy={170}>
    {/* 建物外壁 */}
    <rect x="20" y="30" width="120" height="140" fill="#DCE6EC" stroke="#9FB4C2" strokeWidth="2" />
    {/* 金属計器箱 */}
    <rect x="60" y="74" width="70" height="62" rx="4" fill={METAL} stroke="#22303B" strokeWidth="2.5" />
    <MeterBox x="74" y="88" w={40} h={28} />
    <Antenna x={122} y={116} h={20} />
    {/* 箱の中で跳ね返る電波 */}
    <Waves x={122} y={106} dir={1} n={2} strength={0.9} blockedAt={14} />
    <text x="95" y="66" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#22303B">金属の箱</text>
    {/* 扉の隙間からの漏れ */}
    <rect x="128" y="74" width="3" height="62" fill="#D9EAF3" />
    <Waves x={134} y={106} dir={1} n={3} strength={0.32} />
    <text x="190" y="84" fontSize="10" fontWeight="700" fill={C.warn}>隙間からわずかに漏れる</text>
    <Tower x={470} gy={170} />
    <WeakPath x1={150} y1={100} x2={455} y2={120} label="弱い・不安定" />
  </Scene>
);

const Underground = () => (
  <Scene id="ug" gy={96} soil>
    <Tower x={480} gy={96} h={50} />
    {/* RCスラブ2枚 */}
    <RcWall x={60} y={96} w={300} h={14} id="ug1" />
    <RcWall x={60} y={150} w={300} h={14} id="ug2" />
    <text x="372" y="107" fontSize="10" fontWeight="700" fill="#55616B">RC床 -20dB</text>
    <text x="372" y="161" fontSize="10" fontWeight="700" fill="#55616B">RC床 -20dB</text>
    {/* 地下室+キュービクル */}
    <rect x="60" y="164" width="300" height="62" fill="#4A5660" />
    <rect x="100" y="176" width="86" height="44" fill={METAL} stroke="#22303B" strokeWidth="2.5" />
    <MeterBox x={114} y={184} w={36} h={24} />
    <Antenna x={172} y={212} h={18} />
    <text x="143" y="236" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#fff">地下キュービクル</text>
    <Waves x={178} y={200} dir={1} n={2} strength={0.5} blockedAt={20} />
    <Cross x={300} y={70} />
    <WeakPath x1={186} y1={190} x2={300} y2={84} ok={false} label="" />
  </Scene>
);

const PsShaft = () => (
  <Scene id="ps" gy={188}>
    {/* 廊下と壁 */}
    <rect x="0" y="30" width="560" height="158" fill="#E7EDF1" />
    <rect x="60" y="44" width="150" height="144" fill="#C9D4DC" stroke="#7E92A0" strokeWidth="2" />
    {/* PS金属扉（ルーバー付き） */}
    <rect x="80" y="58" width="110" height="130" fill={METAL_LT} stroke="#55616B" strokeWidth="2.5" />
    {[0, 1, 2, 3].map((i) => <rect key={i} x="95" y={70 + i * 9} width="80" height="3.5" rx="1.5" fill="#55616B" />)}
    <text x="135" y="206" textAnchor="middle" fontSize="10.5" fontWeight="800" fill={C.ink}>PS金属扉</text>
    {/* 扉内のメーター（透視） */}
    <g opacity="0.5">
      <MeterBox x={105} y={130} w={38} h={26} />
      <Antenna x={152} y={154} h={18} />
    </g>
    <line x1="84" y1="62" x2="186" y2="184" stroke="#55616B" strokeWidth="1" opacity="0.4" />
    {/* ルーバーから漏れる電波 */}
    <Waves x={192} y={86} dir={1} n={3} strength={0.4} />
    <text x="265" y="64" fontSize="10" fontWeight="700" fill={C.warn}>ルーバーの隙間から</text>
    <Tower x={480} gy={188} h={70} />
    <WeakPath x1={210} y1={86} x2={465} y2={120} label="弱い" />
  </Scene>
);

const Multihop = () => (
  <Scene id="mh" gy={176}>
    {[70, 160, 250, 340, 430].map((x, i) => <House key={x} x={x} gy={176} dead={i >= 3} />)}
    {/* メーターと弧 */}
    {[70, 160, 250, 340, 430].map((x, i) => <circle key={x} cx={x + 17} cy={146} r="4.5" fill={i === 2 ? C.ng : i >= 3 ? "#9AA6AD" : C.ok} />)}
    <WeakPath x1={87} y1={142} x2={172} y2={142} ok label="" />
    <WeakPath x1={177} y1={142} x2={262} y2={142} ok label="" />
    <Cross x={300} y={120} label="1台 不通" />
    <line x1={357} y1={142} x2={442} y2={142} stroke="#9AA6AD" strokeWidth="2" strokeDasharray="4 5" />
    <text x={395} y={200} textAnchor="middle" fontSize="10.5" fontWeight="800" fill={C.ng}>その先も連鎖で検針不能に</text>
    <Tower x={515} gy={176} h={80} label="収集局" />
    <text x="160" y="216" textAnchor="middle" fontSize="10.5" fontWeight="700" fill={C.ink}>メーター同士のバケツリレー（マルチホップ）</text>
  </Scene>
);

const Urban = () => (
  <Scene id="ub" gy={186}>
    <rect x="120" y="26" width="84" height="160" fill="#AEC0CC" stroke="#7E92A0" strokeWidth="2" />
    <rect x="320" y="40" width="84" height="146" fill="#AEC0CC" stroke="#7E92A0" strokeWidth="2" />
    {[...Array(5)].map((_, r) => [...Array(2)].map((_, c) => <rect key={`${r}${c}`} x={132 + c * 34} y={40 + r * 28} width="22" height="14" fill="#E7F0F6" />))}
    {[...Array(4)].map((_, r) => [...Array(2)].map((_, c) => <rect key={`b${r}${c}`} x={332 + c * 34} y={54 + r * 28} width="22" height="14" fill="#E7F0F6" />))}
    <MeterBox x={238} y={150} w={38} h={26} label="ビル谷間のメーター" />
    <Antenna x={284} y={174} h={20} />
    <Waves x={286} y={162} dir={1} n={2} strength={0.5} blockedAt={26} />
    {/* 回折経路 */}
    <path d="M 286 158 Q 320 30 404 36 Q 470 42 500 96" fill="none" stroke={C.warn} strokeWidth="2.2" strokeDasharray="5 5" />
    <text x="392" y="24" textAnchor="middle" fontSize="10.5" fontWeight="800" fill={C.warn}>屋上を回り込む（大きく減衰）</text>
    <Tower x={508} gy={186} h={84} />
  </Scene>
);

const Joint = () => (
  <Scene id="jt" gy={170} soil>
    <rect x="200" y="60" width="140" height="110" fill="#DCE6EC" stroke="#9FB4C2" strokeWidth="2" />
    <MeterBox x={216} y={84} w={40} h={28} label="電気(親)" />
    <Antenna x={264} y={108} h={20} />
    {/* ガス */}
    <MeterBox x={296} y={120} w={34} h={24} label="ガス" />
    <WeakPath x1={300} y1={116} x2={262} y2={100} ok label="" />
    {/* 水道（地中） */}
    <rect x="120" y="178" width="56" height="34" fill="#E8EDF0" stroke="#55616B" strokeWidth="2" />
    <rect x="116" y="172" width="64" height="8" rx="2" fill={METAL} />
    <MeterBox x={132} y={186} w={32} h={20} />
    <text x="148" y="232" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">水道(地中)</text>
    <WeakPath x1={150} y1={168} x2={252} y2={104} label="一番弱い" />
    <Tower x={480} gy={170} h={76} label="電力網へ" />
    <WeakPath x1={272} y1={96} x2={466} y2={104} ok label="Wi-SUN網" />
    <text x="280" y="34" textAnchor="middle" fontSize="11" fontWeight="800" fill={C.ink}>電気メーター経由の共同検針（IoTルート）</text>
  </Scene>
);

const Hems = () => (
  <Scene id="hm" gy={186}>
    <rect x="120" y="60" width="330" height="126" fill="#F4F8FA" stroke="#9FB4C2" strokeWidth="2" />
    <polygon points="110,60 285,16 460,60" fill="#8FA8B8" />
    {/* RC壁 */}
    <RcWall x={268} y={60} w={14} h={126} id="hems" />
    <text x="275" y="54" textAnchor="middle" fontSize="10" fontWeight="700" fill="#55616B">壁 -10〜20dB</text>
    {/* 屋外メーター */}
    <MeterBox x={70} y={130} w={40} h={28} label="電力メーター" />
    <Antenna x={118} y={154} h={20} />
    <Waves x={120} y={142} dir={1} n={3} strength={0.8} />
    {/* 宅内GW */}
    <rect x="372" y="140" width="26" height="38" rx="5" fill="#E9EEF2" stroke={C.ink} strokeWidth="1.8" />
    <circle cx="385" cy="150" r="3" fill={C.warn} />
    <text x="385" y="196" textAnchor="middle" fontSize="10" fontWeight="700" fill={C.ink}>HEMS GW</text>
    <WeakPath x1={138} y1={138} x2={372} y2={150} label="Bルート（壁越しで弱い）" />
  </Scene>
);

const Pit = ({ lid = "iron", id = "pt" }) => {
  const lidCol = lid === "iron" ? METAL : "#9AA6AD";
  const leak = lid === "iron" ? 0.18 : 0.55;
  return (
    <Scene id={id} gy={120} soil>
      {/* ピット */}
      <rect x="170" y="128" width="130" height="84" fill="#E8EDF0" stroke="#55616B" strokeWidth="2.5" />
      <rect x="162" y="118" width="146" height="12" rx="3" fill={lidCol} stroke="#22303B" strokeWidth="2" />
      <text x="235" y="110" textAnchor="middle" fontSize="11" fontWeight="800" fill={C.ink}>{lid === "iron" ? "鋳鉄蓋 -30dB" : "レジコン蓋 -6dB"}</text>
      <MeterBox x={196} y={170} w={40} h={26} />
      <Antenna x={252} y={196} h={20} />
      {/* 蓋で跳ね返る/透過する電波 */}
      {lid === "iron"
        ? <g>
            <Waves x={252} y={170} dir={1} n={2} strength={0.7} blockedAt={24} />
            <path d="M 244 162 L 236 150 M 252 160 L 252 146 M 260 162 L 268 150" stroke={C.ng} strokeWidth="1.8" opacity="0.7" />
          </g>
        : <Waves x={252} y={150} dir={1} n={3} strength={leak} />}
      <Waves x={235} y={112} dir={1} n={3} strength={leak} color={lid === "iron" ? C.warn : C.blue} />
      {/* 検針車 */}
      <g>
        <rect x="420" y="92" width="64" height="22" rx="6" fill="#3E6FA5" stroke="#22405F" strokeWidth="2" />
        <circle cx="436" cy="118" r="7" fill="#22303B" /><circle cx="468" cy="118" r="7" fill="#22303B" />
        <text x="452" y="136" textAnchor="middle" fontSize="10" fontWeight="700" fill={C.ink}>検針車/基地局へ</text>
      </g>
      {lid === "iron" ? <Cross x={360} y={74} /> : <WeakPath x1={258} y1={104} x2={420} y2={96} ok label="減衰しつつ届く" />}
    </Scene>
  );
};

const GroundLevel = () => (
  <Scene id="gl" gy={150} soil>
    <rect x="150" y="142" width="110" height="50" fill="#D8E4D4" stroke="#55786B" strokeWidth="2" />
    <rect x="146" y="138" width="118" height="8" rx="3" fill="#7FA88E" stroke="#55786B" strokeWidth="1.5" />
    <text x="205" y="208" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#fff">樹脂ボックス（蓋は通す）</text>
    <MeterBox x={172} y={158} w={36} h={24} />
    <Antenna x={222} y={182} h={18} />
    <Waves x={205} y={132} dir={1} n={3} strength={0.65} />
    {/* 地面に吸われる */}
    <path d="M 220 140 q 20 8 36 16" stroke={SOIL_BTM} strokeWidth="2" strokeDasharray="3 4" fill="none" />
    <text x="300" y="170" fontSize="10" fontWeight="700" fill="#6E5B3C">半分は地面に吸われる</text>
    {/* 駐車車両（半透明） */}
    <g opacity="0.55">
      <rect x="140" y="106" width="130" height="28" rx="9" fill="#5B6E79" />
      <circle cx="168" cy="138" r="9" fill="#22303B" /><circle cx="242" cy="138" r="9" fill="#22303B" />
      <text x="205" y="100" textAnchor="middle" fontSize="10.5" fontWeight="800" fill={C.ng}>駐車されると金属の蓋に（-15dB）</text>
    </g>
    <Tower x={480} gy={150} h={66} />
    <WeakPath x1={240} y1={122} x2={466} y2={96} label="高さゼロで不利" />
  </Scene>
);

const DeepPit = () => (
  <Scene id="dp" gy={92} soil>
    {/* 凍結深度線 */}
    <line x1="0" y1="150" x2="560" y2="150" stroke="#7FB8D8" strokeWidth="2" strokeDasharray="8 6" />
    <text x="430" y="144" fontSize="10.5" fontWeight="800" fill="#2C6E96">❄ 凍結深度（この下に埋設）</text>
    {/* 細い縦坑 */}
    <rect x="200" y="100" width="60" height="124" fill="#E8EDF0" stroke="#55616B" strokeWidth="2.5" />
    <rect x="194" y="92" width="72" height="10" rx="3" fill={METAL} stroke="#22303B" strokeWidth="2" />
    <MeterBox x={212} y={188} w={36} h={24} />
    <Antenna x={230} y={184} h={16} />
    {/* 坑内で減衰して消える電波 */}
    <Waves x={230} y={168} dir={1} n={3} gap={10} strength={0.7} blockedAt={26} />
    <text x="330" y="186" fontSize="10.5" fontWeight="800" fill={C.ng}>細い縦坑では上に向かう途中で消える</text>
    <text x="330" y="202" fontSize="10" fill="#fff">（920MHzは内径19cm未満で伝搬できない）</text>
    <Cross x={230} y={74} label="" />
    <text x="230" y="60" textAnchor="middle" fontSize="10.5" fontWeight="900" fill={C.ng}>✕ 地上まで届かない</text>
  </Scene>
);

const Flood = () => (
  <Scene id="fl" gy={120} soil>
    {/* 雨 */}
    <ellipse cx="120" cy="38" rx="46" ry="17" fill="#7E92A0" />
    <ellipse cx="158" cy="32" rx="36" ry="14" fill="#8FA3B0" />
    {[100, 124, 148, 172].map((x) => <line key={x} x1={x} y1={52} x2={x - 6} y2={70} stroke="#5B8DB8" strokeWidth="2" strokeLinecap="round" />)}
    <rect x="190" y="128" width="130" height="84" fill="#E8EDF0" stroke="#55616B" strokeWidth="2.5" />
    <rect x="182" y="118" width="146" height="12" rx="3" fill="#9AA6AD" stroke="#22303B" strokeWidth="2" />
    {/* 水 */}
    <rect x="193" y="158" width="124" height="52" fill="#4D9CC9" opacity="0.75" />
    <path d="M 193 158 q 16 -5 31 0 t 31 0 t 31 0 t 31 0" stroke="#BFE2F2" strokeWidth="2.5" fill="none" />
    <MeterBox x={216} y={172} w={38} h={24} />
    <Antenna x={272} y={196} h={18} />
    {/* 水中で消える電波 */}
    <Waves x={272} y={180} dir={1} n={2} gap={9} strength={0.5} blockedAt={16} />
    <text x="262" y="232" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#fff">アンテナ水没 = 共振ズレ + 吸収で -30dB超</text>
    <Cross x={380} y={86} />
  </Scene>
);

const ApartmentPs = () => (
  <Scene id="ap" gy={196}>
    <rect x="80" y="20" width="180" height="176" fill="#DCE6EC" stroke="#7E92A0" strokeWidth="2.5" />
    {[0, 1, 2].map((f) => (
      <g key={f}>
        <line x1="80" y1={20 + (f + 1) * 58} x2="260" y2={20 + (f + 1) * 58} stroke="#7E92A0" strokeWidth="2" />
        <rect x="200" y={32 + f * 58} width="40" height="38" fill={METAL_LT} stroke="#55616B" strokeWidth="1.8" />
        <circle cx="220" cy={51 + f * 58} r="4" fill={f === 2 ? C.warn : C.ng} />
        <text x="220" y={28 + f * 58} textAnchor="middle" fontSize="8.5" fill="#55616B">PS</text>
      </g>
    ))}
    <text x="170" y="214" textAnchor="middle" fontSize="10.5" fontWeight="800" fill={C.ink}>各階PS内の水道メーター</text>
    <RcWall x={258} y={20} w={12} h={176} id="aps" />
    <Tower x={470} gy={196} h={90} label="基地局" />
    <WeakPath x1={272} y1={148} x2={456} y2={120} label="RC壁越しで階によりまだら" />
    <Cross x={330} y={186} label="低層階" />
  </Scene>
);

const Basement = () => (
  <Scene id="bs" gy={86} soil>
    <Tower x={490} gy={86} h={48} />
    <RcWall x={50} y={86} w={330} h={14} id="bs1" />
    <rect x="50" y="100" width="330" height="124" fill="#4A5660" />
    {/* ポンプとノイズ */}
    <rect x="80" y="160" width="64" height="50" rx="6" fill="#5B6E79" stroke="#33414C" strokeWidth="2" />
    <circle cx="112" cy="178" r="14" fill="#33414C" />
    <path d="M 84 148 l 8 -8 8 8 8 -8 8 8 8 -8 8 8" stroke={C.warn} strokeWidth="2.2" fill="none" />
    <text x="112" y="226" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">ポンプ（ノイズ源）</text>
    {/* 大型メーター */}
    <rect x="210" y="170" width="70" height="40" rx="5" fill="#FBFDFE" stroke={C.ink} strokeWidth="2" />
    <circle cx="245" cy="190" r="13" fill="#fff" stroke={C.ink} strokeWidth="1.6" />
    <text x="245" y="226" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">親メーター(大口径)</text>
    <Antenna x={292} y={206} h={20} />
    <Waves x={294} y={192} dir={1} n={2} strength={0.5} blockedAt={20} />
    <Cross x={300} y={62} />
  </Scene>
);

const LidUnit = () => (
  <Scene id="lu" gy={120} soil>
    <rect x="190" y="128" width="130" height="84" fill="#E8EDF0" stroke="#55616B" strokeWidth="2.5" />
    <rect x="182" y="118" width="146" height="12" rx="3" fill="#9AA6AD" stroke="#22303B" strokeWidth="2" />
    <MeterBox x={210} y={180} w={38} h={24} />
    {/* 蓋裏ユニット */}
    <rect x="262" y="134" width="34" height="20" rx="4" fill="#E9EEF2" stroke={C.ink} strokeWidth="1.8" />
    <Antenna x={279} y={132} h={12} />
    <line x1="248" y1="192" x2="272" y2="154" stroke="#444" strokeWidth="1.8" strokeDasharray="4 3" />
    <text x="255" y="232" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#fff">無線部だけ蓋裏へ分離（浸水・深さを回避）</text>
    <Waves x={279} y={122} dir={1} n={3} strength={0.5} />
    <Tower x={470} gy={120} h={62} />
    <WeakPath x1={300} y1={108} x2={456} y2={70} ok label="蓋の影響は残るが通る" />
  </Scene>
);

const BatteryEff = () => (
  <Scene id="be" gy={206}>
    {/* 筐体内部の拡大図 */}
    <rect x="110" y="36" width="340" height="160" rx="10" fill="#F4F8FA" stroke={C.ink} strokeWidth="2.5" />
    <text x="280" y="28" textAnchor="middle" fontSize="11" fontWeight="800" fill={C.ink}>メーター筐体の中身</text>
    {/* 基板 */}
    <rect x="140" y="70" width="180" height="100" rx="5" fill="#1E5C46" stroke="#0F2E2A" strokeWidth="2" />
    <rect x="156" y="84" width="42" height="28" rx="3" fill="#14252F" />
    <rect x="216" y="92" width="52" height="18" rx="2" fill="#14252F" />
    {/* 電池がアンテナに密着 */}
    <rect x="330" y="62" width="56" height="116" rx="8" fill="#3C4854" stroke="#22303B" strokeWidth="2.2" />
    <text x="358" y="124" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" transform="rotate(90 358 120)">電池</text>
    <Antenna x={324} y={150} h={70} />
    <text x="305" y="62" textAnchor="middle" fontSize="10" fontWeight="800" fill={C.ng}>密着!</text>
    <Waves x={330} y={110} dir={1} n={2} strength={0.35} blockedAt={22} />
    <text x="420" y="100" fontSize="12" fontWeight="900" fill={C.ng}>-10dB</text>
    <text x="402" y="118" fontSize="10" fill={C.ink}>電波1/10 →再送増</text>
    {/* 電池ゲージ */}
    <rect x="402" y="134" width="64" height="16" rx="4" fill="#fff" stroke={C.ink} strokeWidth="1.6" />
    <rect x="404" y="136" width="20" height="12" rx="2" fill={C.ng} />
    <text x="434" y="166" textAnchor="middle" fontSize="10" fontWeight="800" fill={C.ng}>10年もたない</text>
  </Scene>
);

const Generic = () => (
  <Scene id="gn" gy={170}>
    <MeterBox x={120} y={130} w={42} h={30} label="スマートメーター" />
    <Antenna x={172} y={158} h={22} />
    <Waves x={174} y={144} dir={1} n={4} strength={0.8} />
    <Tower x={460} gy={170} h={72} />
  </Scene>
);

const ART = {
  metal_panel: MetalPanel,
  underground: Underground,
  ps_shaft: PsShaft,
  multihop: Multihop,
  urban: Urban,
  joint: Joint,
  hems: Hems,
  pit_iron: () => <Pit lid="iron" id="pi" />,
  rescon_box: () => <Pit lid="rescon" id="pr" />,
  ground_level: GroundLevel,
  deep_pit: DeepPit,
  flood: Flood,
  apartment_ps: ApartmentPs,
  basement: Basement,
  lid_unit: LidUnit,
  battery_eff: BatteryEff,
};

export function ScenarioIllustration({ kind }) {
  const Cmp = ART[kind] || Generic;
  return <Cmp />;
}

/** シナリオID → 図解kind */
export const SCENARIO_ART = {
  metal_meter_panel: "metal_panel",
  cubicle_underground: "underground",
  mdf_pipe_shaft: "ps_shaft",
  multihop_cascade: "multihop",
  urban_canyon: "urban",
  joint_metering: "joint",
  broute_hems: "hems",
  ps_metal_door_apartment: "ps_shaft",
  metal_meter_box_detached: "metal_panel",
  battery_life_antenna_efficiency: "battery_eff",
  lpgas_429mhz_cylinder_shadow: "metal_panel",
  lpgas_ltem_mountain_fringe: "urban",
  ubus_air_mesh_vertical_null: "apartment_ps",
  cast_iron_pit_lid: "pit_iron",
  resin_concrete_box: "rescon_box",
  plastic_box_ground_level: "ground_level",
  cold_region_deep_pit: "deep_pit",
  flooded_pit: "flood",
  apartment_pipe_shaft: "apartment_ps",
  basement_bulk_meter_pit: "basement",
  separated_unit_under_lid: "lid_unit",
};
