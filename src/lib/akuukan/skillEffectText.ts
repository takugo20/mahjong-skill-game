import type {
  PlayerSkillEffectValues
} from "./playerSkillCatalogTypes";

const LABELS: Record<string, readonly [string, string]> = {
  drawWeightMultiplier: ["対象牌の抽選重み", "倍"],
  chancePercent: ["発動確率", "%"],
  detectionChancePercent: ["検知確率", "%"],
  doraDrawWeightMultiplier: ["ドラの抽選重み", "倍"],
  winningTileDrawWeightMultiplier: ["和了牌の抽選重み", "倍"],
  uraDoraIndicatorWeightMultiplier: ["裏ドラ表示牌の抽選重み", "倍"],
  kanDoraIndicatorWeightMultiplier: ["槓ドラ表示牌の抽選重み", "倍"],
  rinshanWinningTileWeightMultiplier: ["嶺上和了牌の抽選重み", "倍"],
  haiteiWinningTileWeightMultiplier: ["海底和了牌の抽選重み", "倍"],
  additionalDoraIndicators: ["追加ドラ表示牌", "枚"],
  additionalPaymentPoints: ["追加点数", "点"],
  paymentMultiplier: ["点数移動の倍率", "倍"],
  parentTsumoPaymentMultiplier: ["親かぶり支払い倍率", "倍"],
  notenPenaltyPaymentPercent: ["ノーテン罰符の支払い割合", "%"],
  bonusHan: ["加算翻数", "翻"],
  additionalYakuHan: ["追加役の翻数", "翻"],
  bonusHanAt40OrMore: ["40符以上の加算翻数", "翻"],
  fuFrom20: ["20符からの変更先", "符"],
  fuFrom25: ["25符からの変更先", "符"],
  fuFrom30: ["30符からの変更先", "符"],
  minimumHonorDiscards: ["必要な字牌の捨て牌", "枚"],
  honbaIncrease: ["本場の増加", "本"],
  durationTurns: ["効果期間", "巡"],
  ippatsuDurationTurns: ["一発の有効期間", "巡"],
  minimumPairCount: ["対子の最低数", "組"],
  minimumSuitTileCount: ["対象の色の最低枚数", "枚"],
  mpRecoveryPerYaku: ["対象役ごとのMP回復", " MP"],
  maximumExchangeTileCount: ["交換上限", "枚"],
  reservedConcealedTripletCount: ["予約する暗刻", "組"],
  reservedPairCount: ["予約する対子", "組"],
  reservedSequenceCount: ["予約する順子", "組"],
  protectedDiscardCount: ["保護する捨て牌", "枚"],
  removedWallTileCount: ["山から除く牌", "枚"],
  snapshotOpponentCount: ["確認する他家", "人"],
  visibleTilesPerOpponent: ["他家1人あたりの表示牌", "枚"],
  maximumHandBasePoints: ["対象和了の基本点上限", "点"],
  sanshokuDoujunOpenHan: ["副露時の三色同順", "翻"],
  ikkitsuukanOpenHan: ["副露時の一気通貫", "翻"],
  chantaOpenHan: ["副露時のチャンタ", "翻"],
  junchanOpenHan: ["副露時の純チャン", "翻"],
  honitsuOpenHan: ["副露時の混一色", "翻"],
  chinitsuOpenHan: ["副露時の清一色", "翻"],
  iipeikouOpenHan: ["副露時の一盃口", "翻"],
  ryanpeikouOpenHan: ["副露時の二盃口", "翻"],
  pinfuOpenHan: ["副露時の平和", "翻"],
  openRonFu: ["副露ロンの符", "符"]
};

const FLAGS: Record<string, string> = {
  blockCalls: "鳴き防止",
  blockRon: "ロン防止",
  chankanImmunity: "槍槓防止",
  ronImmunityUntilRoundEnd: "局終了までロン防止",
  openIppatsuAllowed: "副露時の一発",
  openMenzenTsumoAllowed: "副露時の門前清自摸和",
  openRiichiAllowed: "副露時の立直",
  openUraDoraAllowed: "副露時の裏ドラ"
};

export function formatSkillEffectValues(
  values: PlayerSkillEffectValues
): string[] {
  return Object.entries(values).map(([key, value]) => {
    if (FLAGS[key]) {
      return `${FLAGS[key]}：${value === 0 ? "なし" : "あり"}`;
    }

    const label = LABELS[key];

    if (!label) {
      throw new Error(
        `スキル効果の表示名が未定義です: ${key}`
      );
    }

    return `${label[0]}：${value}${label[1]}`;
  });
}
