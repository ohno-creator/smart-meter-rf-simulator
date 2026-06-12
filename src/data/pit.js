/** =====================================================================
 *  水道メーターピット（量水器ボックス）モデル
 *  920MHz帯の代表的透過損失。机上概算用の代表値（実測で要確認）。
 *  ===================================================================== */

/** 蓋材（920MHz透過損失） */
export const LIDS = [
  { key: "resin", label: "樹脂・FRP蓋", icon: "🟦", loss: 2, lossMax: 4, desc: "電波をよく通す。戸建て向け樹脂製量水器ボックスで一般的。強度の制約で車道には使いにくい。" },
  { key: "rescon", label: "レジンコンクリート蓋", icon: "⬜", loss: 6, lossMax: 10, desc: "樹脂+骨材の複合材（鉄筋なし）。鋳鉄より軽く電波も通しやすい。スマートメーター向けに置き換えが進む。雨で濡れると数dB悪化。" },
  { key: "concrete", label: "コンクリート蓋", icon: "🔲", loss: 12, lossMax: 20, desc: "無筋でも厚みがあると減衰大。湿っているとさらに悪化。" },
  { key: "iron", label: "鋳鉄蓋", icon: "⛓", loss: 30, lossMax: 50, outage: true, desc: "金属はほぼ遮蔽（透過は実質ゼロ）。蓋と枠の隙間からの漏れ電波頼みで、隙間が泥で塞がると50dB級。車道・歩道で標準的。" },
  { key: "steel", label: "鋼板蓋（密閉）", icon: "🔩", loss: 45, lossMax: 70, outage: true, desc: "密閉度が高いほど深刻。通信不能シナリオを併記すべき条件。" },
];
export const lidOf = (k) => LIDS.find((l) => l.key === k) || LIDS[0];

/** ボックス本体材質 */
export const BOXES = [
  { key: "resin_box", label: "樹脂ボックス", icon: "📦", loss: 0.5, desc: "戸建てで一般的。本体は電波の妨げになりにくい。" },
  { key: "concrete_box", label: "コンクリート枡", icon: "🧱", loss: 2, desc: "側面がコンクリート。蓋方向以外の漏れは少なくなる。" },
  { key: "metal_box", label: "金属枡", icon: "🗄", loss: 6, desc: "内部で反射を繰り返し、蓋が開いていても出にくい。" },
];
export const boxOf = (k) => BOXES.find((b) => b.key === k) || BOXES[0];

/** アンテナ位置 */
export const ANT_POS = [
  { key: "meter", label: "メーター直付け", icon: "⌚", desc: "無線ユニット一体型。最も施工が楽だが、深さ・浸水・蓋の影響をすべて受ける。", depthFactor: 1, floodExposed: true, lidApplies: true, extraLoss: 0 },
  { key: "lid_under", label: "蓋の裏に設置", icon: "🔼", desc: "無線部だけ蓋裏へ。浸水リスクを大きく回避できるが、蓋材の影響は受ける。", depthFactor: 0.15, floodExposed: false, lidApplies: true, extraLoss: 0.5 },
  { key: "lid_top", label: "蓋上・地上突出", icon: "📡", desc: "アンテナを蓋の上（樹脂窓付き蓋・地上小型ポール等）へ。蓋・深さ・浸水をすべて回避。", depthFactor: 0, floodExposed: false, lidApplies: false, extraLoss: 1 },
  { key: "remote", label: "地上分離ユニット", icon: "📦", desc: "無線ユニットを壁面・ポールに分離設置し、メーターとは有線接続。最も確実だが施工コスト大。", depthFactor: 0, floodExposed: false, lidApplies: false, extraLoss: 0.5 },
];
export const antPosOf = (k) => ANT_POS.find((a) => a.key === k) || ANT_POS[0];

/** 検針スタイル（リンクの相手） */
export const READOUTS = [
  { key: "fixed", label: "固定基地局網", icon: "🗼", dM: 500, hr: 15, desc: "基地局・コンセントレータで常時収集。最も省人化できるが、リンクは最も厳しい。" },
  { key: "drive", label: "車載検針（ドライブバイ）", icon: "🚐", dM: 30, hr: 2, desc: "検針車が巡回して路上から収集。リンクは中程度。" },
  { key: "handy", label: "ハンディ検針", icon: "🚶", dM: 5, hr: 1.2, desc: "検針員が近づいて無線で読む。リンクは楽だが省人化効果は小さい。" },
];
export const readoutOf = (k) => READOUTS.find((r) => r.key === k) || READOUTS[0];

/** 浸水状態（水位%とアンテナ露出から損失を決める） */
export function floodLoss(waterPct, antExposed) {
  if (waterPct <= 0) return { loss: 0, label: "乾燥", desc: "" };
  if (!antExposed) {
    if (waterPct >= 90) return { loss: 8, label: "満水近く（アンテナ周辺まで水）", desc: "蓋裏でも水面反射・湿気で悪化します。" };
    return { loss: 2, label: "底に滞水", desc: "アンテナは水上にあり影響は限定的。湿気・泥はね分を見込みます。" };
  }
  if (waterPct >= 70) return { loss: 35, label: "アンテナ完全水没", desc: "920MHzは水に強く吸収されます。通信不能級の悪化です。" };
  if (waterPct >= 40) return { loss: 18, label: "アンテナ一部水没", desc: "水面がアンテナにかかり、吸収+整合悪化が重なります。" };
  return { loss: 4, label: "底に滞水（アンテナ近傍）", desc: "アンテナ直下まで水。湿気と反射で数dB悪化します。" };
}

/** 深さによる追加損失（地面の縁での回折+低位置、目安） */
export const depthLoss = (depthCm, factor = 1) => Math.max(0, (depthCm - 10) * 0.07) * factor + (factor > 0.5 ? 3 : factor > 0 ? 1 : 0);

/** ピット向け解決策（PitLabで動的にマージン再計算） */
export const PIT_SOLUTIONS = [
  {
    key: "rescon_lid",
    label: "蓋をレジンコンクリート化",
    apply: (s) => ({ ...s, lidKey: s.lidKey === "iron" || s.lidKey === "steel" || s.lidKey === "concrete" ? "rescon" : s.lidKey }),
    note: "鋳鉄蓋→レジコン蓋で20dB級の回収。自治体・管理者との調整が必要だが、スマート化では王道の対策。",
  },
  {
    key: "lid_under",
    label: "無線部を蓋裏へ移設",
    apply: (s) => ({ ...s, antPosKey: "lid_under" }),
    note: "深さ・浸水の影響を回避。メーター交換サイクルに合わせて導入しやすい。",
  },
  {
    key: "lid_top",
    label: "アンテナを蓋上へ（樹脂窓/突出）",
    apply: (s) => ({ ...s, antPosKey: "lid_top" }),
    note: "蓋・深さ・浸水をすべて回避する最強の対策。蓋の改造または専用蓋が必要。",
  },
  {
    key: "high_eff",
    label: "高効率アンテナ+筐体込み最適化",
    apply: (s) => ({ ...s, antNetDb: s.antNetDb + 3.5 }),
    note: "アンテナ静特性の改善で+3〜4dB。スタッフ社の得意領域——基板GND設計+OTA測定で実装悪化を防ぐ。",
  },
  {
    key: "drive_by",
    label: "運用変更: ドライブバイ検針",
    apply: (s) => ({ ...s, readoutKey: "drive" }),
    note: "リンク距離を短くする運用側の解。固定網ほどの省人化はできないが現実解として多い。",
  },
];
