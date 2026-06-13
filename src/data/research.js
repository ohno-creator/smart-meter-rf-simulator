/** 「最新研究でわかってきたこと」コンテンツ。Web調査+敵対的検証済み（出典は各トピックのsources）。 */

export const RESEARCH_INTRO =
  "アンテナ工学はこの10年で「単体部品の設計」から「機器・環境を含めた系の設計」へ大きく舵を切りました。ここでは、講演のメッセージ——アンテナ性能は周囲込みで決まる——を裏付ける最新の研究動向を、一次情報の出典つきで紹介します。各カードをタップすると、技術的な詳細とスマートメーター実務への示唆が読めます。";

export const RESEARCH_TOPICS = [
  {
    "id": "small_antenna_physical_limit",
    "title": "電気的小型アンテナの物理限界（Chu-Harrington限界）",
    "icon": "📏",
    "year": "理論は1948年〜、効率限界の精緻化は2010年代後半〜2020年代",
    "finding": "アンテナの小型化には物理法則で決まる限界があり、小さくするほど帯域と効率を必ず失うことが理論的に確定している。これは設計者の腕の問題ではなく、宇宙の法則の問題である。",
    "detail": "1948年のChuの論文に始まる理論で、アンテナを囲む最小の球の半径aと波数kの積「ka」で性能の下限が決まる。kaが小さい（＝波長に比べてアンテナが小さい）ほどQ値の下限が急上昇し、使える帯域幅が狭くなる。920MHz帯の波長は約33cmなので、メーター筐体内の数cm級のアンテナはka<1（おおむね0.3〜0.6）の「電気的小型アンテナ」領域に入る。効率面では2017年のPfeifferらの研究で、共振型の電気・磁気ダイポールは臨界サイズを下回ると放射効率が(ka)の4乗に比例して急落することが示され、帯域・指向性の限界も2024年の研究で更新されるなど、理論の精緻化がいまも続いている。つまり「小さくて広帯域で高効率」を同時に満たす魔法のアンテナは原理的に存在しない。",
    "implication": "小型筐体に収まるアンテナで全てを両立する解はないと割り切ることが設計の出発点になる。だからこそ基板GND全体を放射体積として使い「実効的なka」を稼ぐ設計や、限られた帯域をどの実装環境に合わせて使うかの判断が、性能を分ける本質的な工程になる。",
    "stafLink": "スタッフ株式会社のようなアンテナメーカーが「アンテナ単体でなく基板・筐体込みで設計する」のは、この物理限界の中で実効体積を最大化する唯一の現実解だからである。講演の「アンテナ性能は周囲込みで決まる」という主張の理論的な土台にあたる。",
    "noviceAnalogy": "小さな太鼓では低い音が物理的に出せないのと同じで、小さなアンテナには出せる性能の上限が法則として決まっている。",
    "sources": [
      "L. J. Chu, \"Physical Limitations of Omni-Directional Antennas,\" J. Appl. Phys., 1948",
      "C. Pfeiffer, \"Fundamental Efficiency Limits for Small Metallic Antennas,\" IEEE Trans. Antennas Propag., 2017 (arXiv:1612.07317)",
      "New Bounds on Spherical Antenna Bandwidth and Directivity: Updates to the Chu-Harrington Limits (arXiv:2408.07085, 2024) https://arxiv.org/abs/2408.07085",
      "https://en.wikipedia.org/wiki/Chu%E2%80%93Harrington_limit"
    ]
  },
  {
    "id": "characteristic_mode_analysis",
    "title": "特性モード解析（CMA）— 「基板GNDこそアンテナ」の理論化",
    "icon": "🧭",
    "year": "理論は1971年、設計実用化は2010年代〜",
    "finding": "「アンテナ素子ではなく基板GNDが実際の放射を担っている」という現場の経験則が、特性モード解析という理論で定量的に設計できるようになった。",
    "detail": "Garbaczが1965年に提唱し、1971年にHarringtonとMautzが行列理論として体系化した理論で、導体構造の形状だけで決まる固有の電流分布（特性モード）と固有値を計算し、どのモードがどの周波数で放射に寄与するかを可視化できる。2000年代にスペイン・バレンシア工科大のグループが携帯端末の基板GND設計へ応用して再注目され、商用電磁界ソルバーへの実装はFEKO（2012年・Suite 6.2）を皮切りに2010年代後半までにCST・HFSSなど主要ツールへ広がり、スマホ・IoT機器の実用設計ツールになった。基板上のアンテナ配置位置の良し悪しだけで総合効率が最大5.3dB変わるという解析報告もあり、「素子をどこに置き、GNDのどのモードを励振するか」が性能を支配することが定量的に示されている。",
    "implication": "スマートメーターの基板サイズ・形状・給電位置は「GNDのどの共振モードを使うか」の選択であり、通信距離に直結する。基板レイアウトが固まってからアンテナを「後付け」するのではなく、設計初期にCMAで基板全体を眺めることで、後工程での7dB級の手戻りを未然に防げる。",
    "stafLink": "金属近接で7dB劣化、ケーブル電流で性能が変わるといった実測知見を、CMAは「モードが乱された結果」として理論側から説明する。メーカーの実装評価とシミュレーションの解析が噛み合う領域であり、実測と理論の橋渡し役になる。",
    "noviceAnalogy": "バイオリンの音色が弦でなく胴の形で決まるように、電波の出方は基板の形で決まる——その「胴の鳴り方」を楽譜のように読めるようにしたのがCMA。",
    "sources": [
      "R. F. Harrington and J. R. Mautz, \"Theory of Characteristic Modes for Conducting Bodies,\" IEEE Trans. Antennas Propag., vol.19, no.5, 1971",
      "M. Cabedo-Fabrés et al., \"The Theory of Characteristic Modes Revisited,\" IEEE Antennas Propag. Magazine, 2007",
      "http://www.characteristicmodes.org/software/"
    ]
  },
  {
    "id": "underground_propagation_wusn",
    "title": "地中・構造物近傍の伝搬研究（WUSNとメーターボックスのアンテナ化）",
    "icon": "🕳️",
    "year": "概念提唱は2006年、フィールド実証の本格化は2010年代〜",
    "finding": "土中の電波減衰は土壌の水分量に支配されること、そして金属の蓋や箱そのものをアンテナ化すれば10dB以上の改善が可能なことが、実証研究でわかってきた。",
    "detail": "地中無線センサネットワーク（WUSN）の研究で、水の比誘電率（約80）と乾燥土（3〜5）の大差ゆえに、土壌含水率が電波減衰を支配することが定量化された。減衰が支配的すぎて、逆にRSSIの変化から土壌水分を推定できるほどで、23ノードのWUSNを半径530mの農地で2019年から連続運用した実証例もある。低い周波数ほど土中減衰が小さいことも確認されている。日本の水道スマートメーター向け研究では、鋳鉄製メーターボックスの利得が従来−15〜−20dBiと壊滅的だったのに対し、蓋にL字テーパー形のスリット構造を切って共振器化することで800〜920MHz帯で帯域内最小でも−3.3dBi（周波数によっては+9.5dBiのピーク）へと10dB以上の改善を達成し、車道設置に必要な耐荷重も満たした（2023年発表）。",
    "implication": "地下ピット設置の水道メーターを「電波の出ない場所」と諦めるのではなく、蓋や箱の構造自体を放射器として設計し直す発想が現実解になりつつある。また降雨・冠水で減衰が大きく変動する前提で、リンクバジェットに環境マージンを織り込む必要がある。",
    "stafLink": "金属と土壌という「周囲」が性能を桁で変える典型例であり、アンテナ単体のカタログ値が意味を失う世界。設置環境込みで実測・最適化するというメーカーの実務がそのまま勝負どころになる領域である。",
    "noviceAnalogy": "地下室から外へ声を届けるには、隙間を探して叫ぶより「扉そのものをスピーカーに作り替える」方が早い。",
    "sources": [
      "Study on Improvement of Radio Propagation Characteristics of Cast Iron Boxes for Water Smart Meters, Sensors, 2023 https://pmc.ncbi.nlm.nih.gov/articles/PMC10748203/",
      "A Wireless Underground Sensor Network Field Pilot for Agriculture and Ecology, Sensors, 2022 https://www.mdpi.com/1424-8220/22/10/3913",
      "Wireless Underground Sensor Networks: A Comprehensive Survey and Tutorial, ACM Computing Surveys, 2024 https://dl.acm.org/doi/10.1145/3625388"
    ]
  },
  {
    "id": "detuning_adaptive_matching",
    "title": "環境による離調（detuning）と自動整合技術",
    "icon": "🎛️",
    "year": "2010年代に実用化、2020年代に普及",
    "finding": "手や金属が近づくとアンテナの共振点がずれる「離調」を、チューナーICがリアルタイムで補正する技術がスマートフォンで実用化・標準化された。",
    "detail": "スマホでは手で握る・耳に当てる・机に置くだけでアンテナが離調する「head and hand効果」が古くから問題で、対策としてMOSFETスイッチ＋可変容量による小型アンテナチューナーICが普及した。方式は、給電点のインピーダンスを補正する「インピーダンスチューニング」と、アンテナ素子側の電気長を切り替える「アパーチャチューニング」の2系統で、中位機以上では併用が標準になっている。さらにクローズドループ方式では、送信電力と反射電力を比較するミスマッチセンサで整合状態を常時監視し、持ち方が変わるたびに自動で再整合する。5Gの多バンド化で1本のアンテナがカバーすべき帯域が広がったことが、チューナー搭載を一気に後押しした。",
    "implication": "スマートメーターも水没・金属盤近接・施工ばらつきで確実に離調する。チューナーICのコストが見合わない機種でも、「最悪条件側に整合点をあらかじめ寄せる」「実装状態で共振を確認してから量産する」という設計判断は今すぐ適用できる。マルチバンドのセルラー系メーターではチューナー採用も現実的な選択肢になる。",
    "stafLink": "実機実験で観測される−6/−10/−14dBの劣化の主要因の一つがこの離調である。どの設置環境を「定格」として整合を合わせ込むかは、アンテナメーカーと機器設計側の擦り合わせが最も効く工程になる。",
    "noviceAnalogy": "気温で音程がずれるギターを、弾いている間に自動でチューニングし直すペグのような仕組み。",
    "sources": [
      "Real-time adaptation of mobile antenna impedance matching, IEEE, 2010 https://ieeexplore.ieee.org/document/5666808",
      "Antenna Tuning Approach Aids Cellular Handsets, Microwaves & RF https://www.mwrf.com/markets/article/21842189/antenna-tuning-approach-aids-cellular-handsets",
      "Embedded digital-capacitor ICs enable antenna tuning, 5G Technology World https://www.5gtechnologyworld.com/embedded-digital-capacitor-ics-enable-antenna-tuning/"
    ]
  },
  {
    "id": "ota_measurement",
    "title": "OTA測定技術の進展 — TRP/TISという「実装込みの実力値」",
    "icon": "📡",
    "year": "携帯端末で2000年代に確立、2010年代後半〜IoT機器へ拡大",
    "finding": "アンテナ性能は端末まるごと電波で測る（OTA測定）のが業界標準となり、カタログの単体利得ではなくTRP/TISという実装込みの数値で評価する流れが確立した。",
    "detail": "TRP（全放射電力）は送信状態の端末の放射を全球面で積分した値、TIS（全等方感度）は受信感度を全球面で平均した値で、アンテナ・筐体・基板・ケーブルすべての影響が織り込まれる。測定法も進化し、電波暗室での全球面スキャンと近傍界-遠方界変換に加え、多数の反射波を攪拌して統計的に測るリバブレーションチャンバー法が業界認証試験として文書化された。寸法42cmを超える大型IoT機器や、人体を模擬したファントム込みの試験への適用も整備されている。ケーブル給電のパッシブ測定では決して見えない「筐体に組み込んだ瞬間に起きる劣化」が、TRP/TISには数値としてそのまま現れる。",
    "implication": "スマートメーターの通信距離を実際に決めるのは単体利得ではなくTRP/TISである。調達仕様に「利得◯dBi」ではなく「実装状態でのTRP/TIS」を書く流れが広がっており、事業者・端末メーカー双方にとって機器選定の物差しそのものが変わりつつある。",
    "stafLink": "スタッフ株式会社が実践する筐体込み・実機状態でのOTA評価はこの潮流の実務形である。カタログ値と実装値の乖離（金属近接での7dB劣化など）を定量化する手段として、講演の核心と最も直接につながるトピック。",
    "noviceAnalogy": "部品単体の体重測定ではなく、装備一式を着込んだ状態での総合健康診断のようなもの。",
    "sources": [
      "Test Methodology, SISO, Reverberation Chamber V4.0.0 (CTIA 01.21) https://ctiacertification.org/wp-content/uploads/2021/02/CTIA-01.21-Test-Methodology-SISO-Reverberation-Chamber-V4.0.0.pdf",
      "Test Plan for Wireless Large-Form-Factor Device Over-the-Air Performance V1.2 https://ctiacertification.org/wp-content/uploads/2021/02/CPWG_CTIA-Certification-Test-Plan-for-Wireless-Large-Form-Factor-Device-Over-the-Air-Performance-V1.2.pdf",
      "OTA Measurement for IoT Wireless Device Performance Evaluation https://toyotechus.com/wp-content/uploads/OTA-Measurement-for-IoT-Wireless-Device-Performance-Evaluation-Challenges-and-Solutions.pdf"
    ]
  },
  {
    "id": "metasurface_antennas",
    "title": "メタマテリアル／メタサーフェスによる小型高効率アンテナ",
    "icon": "🪞",
    "year": "2010年代に研究加速、2020年代に実用例",
    "finding": "電波に対して特殊な性質を持つ人工周期構造（メタサーフェス）を使い、薄く小さいまま利得と効率を稼ぐアンテナが実用段階に入ってきた。",
    "detail": "波長より十分小さい金属パターンを周期配列した板で、反射位相や表面波の振る舞いを人工的に設計する技術。最近の実証例では、4×4のメタサーフェス層をスロットアンテナに重ねて広帯域円偏波と高利得を両立した設計や、デュアルバンド機で約25%の小型化を達成し、シミュレーションで総合効率90%超、実測でも利得6.7〜7.1dBi（シミュレーション比1dB以内の劣化）を確認した報告がある。Sievenpiper型の人工磁気導体（AMC）を反射板に使うと、通常は性能が壊滅する金属面の直上でもアンテナを動作させられるため、金属体に貼るIoTタグへの応用が進む。一方で狭帯域化やコスト、そして「Chu限界そのものは超えられない（体積の使い方が上手くなっただけ）」という冷静な評価が研究コミュニティの共通認識である。",
    "implication": "金属筐体や金属検針盤に密着させざるを得ないスマートメーターでは、AMC的な構造を間に挟む解に検討価値がある。ただし920MHz帯では波長が長く構造が大型化しやすいため、サイズ・コスト・帯域の三すくみの中で現実解を見極める目利きが必要になる。",
    "stafLink": "金属近接7dB劣化への対策オプションの一つだが、効果は実装条件に強く依存する。「本当に効いているか」を筐体込みOTA測定で検証するプロセスこそ、アンテナメーカーの評価力が活きる場面になる。",
    "noviceAnalogy": "壁際の鏡を「電波にとって都合のいい特殊な鏡」に張り替えて、壁にぴったり付けてもよく飛ぶようにする技術。",
    "sources": [
      "A Low-Profile High Gain Circularly Polarized Metasurface Antenna for IoT Applications, Electronics, 2026 https://www.mdpi.com/2079-9292/15/4/822",
      "A High-Gain and Dual-Band Compact Metasurface Antenna for Wi-Fi/WLAN Applications https://pmc.ncbi.nlm.nih.gov/articles/PMC12155658/",
      "Design of a High-Gain Low-Profile Metasurface Antenna Using Direct Feeding of Sievenpiper's HIS (arXiv:2412.02502) https://arxiv.org/abs/2412.02502"
    ]
  },
  {
    "id": "ai_antenna_design",
    "title": "AI・機械学習によるアンテナ最適化設計",
    "icon": "🤖",
    "year": "2020年代前半〜",
    "finding": "機械学習が電磁界シミュレーションの「代理（サロゲート）」を務めることで設計の試行錯誤を肩代わりし、計算回数を大幅に減らす設計フローが確立しつつある。",
    "detail": "電磁界シミュレーションは1回ごとの計算が重く、最適化に数百〜数千回の反復が必要なことがボトルネックだった。近年は、学習済みニューラルネットが特性を瞬時に予測するサロゲートモデルが主流化している。例えば15万件のシミュレーションデータでCNNを学習させ、ピクセル分割したパターンからSパラメータを即時予測し、粒子群最適化と組み合わせて「所望特性→形状」の逆設計を自動化した研究（2025年）や、設計空間の次元を縮約したサロゲートにkrigingと粒子群最適化を組み合わせ、サロゲート構築コスト自体を下げる手法（Scientific Reports 2024）が報告されている。マルチバンドアンテナ最適化で従来比約40%の計算コスト削減例もあり、主要学会誌が機械学習特集号を組むなど分野として定着した。課題は学習データ生成のコストと、実装環境が変わると学び直しになる汎化性である。",
    "implication": "初期設計の探索は劇的に速くなるが、AIが学習したのはあくまで「シミュレーション空間」であり実環境ではない。筐体・基板込みの形状最適化にAIを使いつつ、最終判断は実装状態の実測で行うという原則は、むしろ重要性を増す。",
    "stafLink": "AIで設計候補を高速に絞り込み、OTA実測で答え合わせをする分業が現実的な姿。実測データを設計へ還流できる体制を持つアンテナメーカーほど、このループの価値を引き出せる構図にある。",
    "noviceAnalogy": "AIがレシピ候補を千通り考え、最後の味見（実測）だけは人間が責任を持つ料理開発のようなもの。",
    "sources": [
      "Antenna optimization using machine learning with reduced-dimensionality surrogates, Scientific Reports, 2024 https://www.nature.com/articles/s41598-024-72478-w",
      "Inverse Design of Microstrip Antennas Based on Deep Learning, Electronics, 2025 https://www.mdpi.com/2079-9292/14/13/2510",
      "IEEE TAP Special Issue on Machine Learning in Antenna Design, Modeling, and Measurements https://ieeeaps.org/ieee-tap/for-readers/special-issues/special-issue-on-machine-learning-in-antenna-design-modeling-and-measurements"
    ]
  },
  {
    "id": "920mhz_band_environment",
    "title": "920MHz帯の電波環境 — 混雑と共存の研究",
    "icon": "🚦",
    "year": "2012年に帯域整備、2010年代後半〜共存研究が本格化",
    "finding": "920MHz帯は「空いている帯域」から「スマートメーターとLPWAがひしめく帯域」へ変わり、異なる無線規格どうしの共存・干渉が実測研究のテーマになった。",
    "detail": "国内の920MHz帯はWi-SUN、LoRaWAN、Sigfoxなど複数のLPWA規格が同じ周波数を共用する。国内標準規格により、送信前に他局の電波を確認するキャリアセンスと、送信時間制限（送信休止時間の挿入、時間あたり総送信時間の上限）が課されており、これが多数機器共存の基盤になっている。電力スマートメーターの全国展開で数千万台規模のWi-SUN機器が面的に常時稼働するようになり、都市部や集合住宅ではキャリアセンスによる送信待ちの増加が懸念され、共存・干渉の評価研究が行われている。Wi-SUNとLoRaWANの相互干渉の影響を実測した研究（2018年、信学技報）もあり、IEEE 802.15.4gベースのマルチホップ中継で到達性を確保する設計も含め、「混雑下でどう確実に届けるか」が研究の主題に移っている。",
    "implication": "リンク設計は「電波が届くか」だけでなく「混雑時間帯に送信機会を得られるか」まで含めて考える時代になった。アンテナ性能の数dBの差は、再送回数・電池寿命・検針データ収集成功率の差として直接跳ね返る。",
    "stafLink": "混んだ帯域ほど、実装で失う−6〜−14dBは再送増加と電池消費として帯域全体の負荷になる。アンテナの実装最適化は自社製品の性能改善であると同時に、共有資源である電波環境への負荷を減らす公共的な意味も持つ。",
    "noviceAnalogy": "譲り合いルールで運用される一車線道路のようなもので、車が増えるほど一台一台の燃費（アンテナ効率）が道路全体の流れを左右する。",
    "sources": [
      "920MHz帯を利用する異種無線通信規格間の干渉の影響調査〜Wi-SUNとLoRaWAN間の相互干渉〜, 信学技報, 2018 https://www.ieice.org/ken/paper/20180302i1Di/",
      "標準規格 STD-T108（920MHz帯テレメータ用等特定小電力無線局）1.4版 https://www.arib.or.jp/image/kikaku/kikaku_sample/sample-std-t108-1.4.pdf",
      "920MHz vs 2.4GHz無線LAN：IoTシステムに最適な無線の選び方（OKI） https://www.oki.com/jp/dx/doc/2016/16vol_03.html"
    ]
  }
];
