import type {
  NormalYakuId
} from "../mahjong/yaku";
import type {
  YakumanId,
  YakumanResult
} from "../mahjong/yakuman";

export interface AkuukanNormalYakuDefinition {
  readonly id: NormalYakuId;
  readonly name: string;
  readonly closedHan: number;
  readonly openHan: number | null;
}

export interface AkuukanYakumanDefinition {
  readonly id: YakumanId;
  readonly name: string;
  readonly multiplier:
    YakumanResult["multiplier"];
  readonly closedOnly: boolean;
}

function defineNormalYaku(
  id: NormalYakuId,
  name: string,
  closedHan: number,
  openHan: number | null
): AkuukanNormalYakuDefinition {
  return {
    id,
    name,
    closedHan,
    openHan
  };
}

function defineYakuman(
  id: YakumanId,
  name: string,
  multiplier:
    YakumanResult["multiplier"],
  closedOnly: boolean
): AkuukanYakumanDefinition {
  return {
    id,
    name,
    multiplier,
    closedOnly
  };
}

export const AKUUKAN_NORMAL_YAKU_DEFINITIONS:
  readonly AkuukanNormalYakuDefinition[] = [
    defineNormalYaku(
      "riichi",
      "立直",
      1,
      null
    ),
    defineNormalYaku(
      "doubleRiichi",
      "ダブル立直",
      2,
      null
    ),
    defineNormalYaku(
      "ippatsu",
      "一発",
      1,
      null
    ),
    defineNormalYaku(
      "menzenTsumo",
      "門前清自摸和",
      1,
      null
    ),
    defineNormalYaku(
      "tanyao",
      "断么九",
      1,
      1
    ),
    defineNormalYaku(
      "pinfu",
      "平和",
      1,
      null
    ),
    defineNormalYaku(
      "iipeikou",
      "一盃口",
      1,
      null
    ),
    defineNormalYaku(
      "yakuhaiWhite",
      "役牌・白",
      1,
      1
    ),
    defineNormalYaku(
      "yakuhaiGreen",
      "役牌・發",
      1,
      1
    ),
    defineNormalYaku(
      "yakuhaiRed",
      "役牌・中",
      1,
      1
    ),
    defineNormalYaku(
      "seatWind",
      "自風牌",
      1,
      1
    ),
    defineNormalYaku(
      "prevailingWind",
      "場風牌",
      1,
      1
    ),
    defineNormalYaku(
      "rinshan",
      "嶺上開花",
      1,
      1
    ),
    defineNormalYaku(
      "chankan",
      "槍槓",
      1,
      1
    ),
    defineNormalYaku(
      "haitei",
      "海底摸月",
      1,
      1
    ),
    defineNormalYaku(
      "houtei",
      "河底撈魚",
      1,
      1
    ),
    defineNormalYaku(
      "sevenPairs",
      "七対子",
      2,
      null
    ),
    defineNormalYaku(
      "toitoi",
      "対々和",
      2,
      2
    ),
    defineNormalYaku(
      "sanankou",
      "三暗刻",
      2,
      2
    ),
    defineNormalYaku(
      "sankantsu",
      "三槓子",
      2,
      2
    ),
    defineNormalYaku(
      "sanshokuDoukou",
      "三色同刻",
      2,
      2
    ),
    defineNormalYaku(
      "shousangen",
      "小三元",
      2,
      2
    ),
    defineNormalYaku(
      "honroutou",
      "混老頭",
      2,
      2
    ),
    defineNormalYaku(
      "sanshokuDoujun",
      "三色同順",
      2,
      1
    ),
    defineNormalYaku(
      "ittsuu",
      "一気通貫",
      2,
      1
    ),
    defineNormalYaku(
      "chanta",
      "混全帯么九",
      2,
      1
    ),
    defineNormalYaku(
      "ryanpeikou",
      "二盃口",
      3,
      null
    ),
    defineNormalYaku(
      "junchan",
      "純全帯么九",
      3,
      2
    ),
    defineNormalYaku(
      "honitsu",
      "混一色",
      3,
      2
    ),
    defineNormalYaku(
      "chinitsu",
      "清一色",
      6,
      5
    )
  ];

export const AKUUKAN_YAKUMAN_DEFINITIONS:
  readonly AkuukanYakumanDefinition[] = [
    defineYakuman(
      "tenhou",
      "天和",
      1,
      true
    ),
    defineYakuman(
      "chiihou",
      "地和",
      1,
      true
    ),
    defineYakuman(
      "thirteenOrphans",
      "国士無双",
      1,
      true
    ),
    defineYakuman(
      "thirteenOrphansThirteenSided",
      "国士無双十三面待ち",
      2,
      true
    ),
    defineYakuman(
      "fourConcealedTriplets",
      "四暗刻",
      1,
      true
    ),
    defineYakuman(
      "fourConcealedTripletsSingleWait",
      "四暗刻単騎",
      2,
      true
    ),
    defineYakuman(
      "bigThreeDragons",
      "大三元",
      1,
      false
    ),
    defineYakuman(
      "littleFourWinds",
      "小四喜",
      1,
      false
    ),
    defineYakuman(
      "bigFourWinds",
      "大四喜",
      2,
      false
    ),
    defineYakuman(
      "allHonors",
      "字一色",
      1,
      false
    ),
    defineYakuman(
      "allGreen",
      "緑一色",
      1,
      false
    ),
    defineYakuman(
      "allTerminals",
      "清老頭",
      1,
      false
    ),
    defineYakuman(
      "nineGates",
      "九蓮宝燈",
      1,
      true
    ),
    defineYakuman(
      "pureNineGates",
      "純正九蓮宝燈",
      2,
      true
    ),
    defineYakuman(
      "fourKans",
      "四槓子",
      1,
      false
    )
  ];

const NORMAL_YAKU_DEFINITION_BY_ID =
  new Map<
    NormalYakuId,
    AkuukanNormalYakuDefinition
  >(
    AKUUKAN_NORMAL_YAKU_DEFINITIONS.map(
      (definition) => [
        definition.id,
        definition
      ]
    )
  );

const YAKUMAN_DEFINITION_BY_ID =
  new Map<
    YakumanId,
    AkuukanYakumanDefinition
  >(
    AKUUKAN_YAKUMAN_DEFINITIONS.map(
      (definition) => [
        definition.id,
        definition
      ]
    )
  );

export function getAkuukanNormalYakuDefinition(
  id: NormalYakuId
): AkuukanNormalYakuDefinition {
  const definition =
    NORMAL_YAKU_DEFINITION_BY_ID.get(id);

  if (!definition) {
    throw new Error(
      `未定義の通常役IDです: ${id}`
    );
  }

  return definition;
}

export function getAkuukanNormalYakuStandardHan(
  id: NormalYakuId,
  isClosed: boolean
): number {
  const definition =
    getAkuukanNormalYakuDefinition(id);

  return isClosed
    ? definition.closedHan
    : definition.openHan ?? 0;
}

export function getAkuukanYakumanDefinition(
  id: YakumanId
): AkuukanYakumanDefinition {
  const definition =
    YAKUMAN_DEFINITION_BY_ID.get(id);

  if (!definition) {
    throw new Error(
      `未定義の役満IDです: ${id}`
    );
  }

  return definition;
}

export function isAkuukanYakumanAllowedByClosedState(
  id: YakumanId,
  isClosed: boolean
): boolean {
  const definition =
    getAkuukanYakumanDefinition(id);

  return !definition.closedOnly || isClosed;
}
