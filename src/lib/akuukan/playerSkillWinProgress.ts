import type { WaitType } from "../mahjong/hand";
import type { NormalYakuId } from "../mahjong/yaku";
import type { YakumanId } from "../mahjong/yakuman";
import type {
  PlayerSkillGrowthState,
  PlayerSkillUnlockConditionId
} from "./playerSkillProgress";
import {
  tryAddPlayerSkillUnlockProgress
} from "./playerSkillUnlock";

type WinningYakuId = NormalYakuId | YakumanId;

const YAKU_CONDITIONS: readonly (
  readonly [
    PlayerSkillUnlockConditionId,
    readonly WinningYakuId[]
  ]
)[] = [
  ["tanyao-win-count", ["tanyao"]],
  ["pinfu-win-count", ["pinfu"]],
  ["ippatsu-win-count", ["ippatsu"]],
  ["sanshoku-doujun-win-count", ["sanshokuDoujun"]],
  ["ikkitsuukan-win-count", ["ittsuu"]],
  ["chanta-win-count", ["chanta"]],
  ["junchan-win-count", ["junchan"]],
  ["chanta-or-junchan-win-count", ["chanta", "junchan"]],
  ["honitsu-win-count", ["honitsu"]],
  ["chinitsu-win-count", ["chinitsu"]],
  ["honitsu-or-chinitsu-win-count", ["honitsu", "chinitsu"]],
  ["chiitoitsu-win-count", ["sevenPairs"]],
  [
    "iipeikou-or-ryanpeikou-win-count",
    ["iipeikou", "ryanpeikou"]
  ],
  [
    "toitoi-sanshoku-doukou-sanankou-or-sankantsu-win-count",
    ["toitoi", "sanshokuDoukou", "sanankou", "sankantsu"]
  ],
  [
    "rinshan-haitei-or-houtei-win-count",
    ["rinshan", "haitei", "houtei"]
  ],
  ["rinshan-kaihou-win-count", ["rinshan"]],
  ["haitei-win-count", ["haitei"]],
  [
    "suuankou-or-suuankou-tanki-win-count",
    ["fourConcealedTriplets", "fourConcealedTripletsSingleWait"]
  ],
  [
    "kokushi-or-thirteen-sided-win-count",
    ["thirteenOrphans", "thirteenOrphansThirteenSided"]
  ],
  ["daisangen-win-count", ["bigThreeDragons"]],
  [
    "shousuushii-or-daisuushii-win-count",
    ["littleFourWinds", "bigFourWinds"]
  ],
  ["tsuuiisou-win-count", ["allHonors"]],
  ["ryuuiisou-win-count", ["allGreen"]],
  [
    "chinroutou-or-honroutou-win-count",
    ["allTerminals", "honroutou"]
  ],
  [
    "chuuren-or-pure-nine-gates-win-count",
    ["nineGates", "pureNineGates"]
  ]
];

export interface PlayerSkillWinProgressInput {
  readonly winnerIsPlayer: boolean;
  readonly winIsValid: boolean;
  readonly isNagashiMangan: boolean;

  // 最終採用構成で有効な役のみ。
  // 役満時も記録対象の通常役を含める。
  readonly yakuIds: readonly WinningYakuId[];
  readonly waitType: WaitType;
  readonly redDoraCount: number;
  readonly uraDoraHan: number;
}

export function recordPlayerSkillWinProgress(
  state: PlayerSkillGrowthState,
  input: PlayerSkillWinProgressInput
): PlayerSkillGrowthState {
  if (
    !input.winnerIsPlayer ||
    !input.winIsValid ||
    input.isNagashiMangan
  ) {
    return state;
  }

  for (const count of [
    input.redDoraCount,
    input.uraDoraHan
  ]) {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new RangeError(
        "解放進捗のドラ枚数・翻数が不正です。"
      );
    }
  }

  const yakuIds = new Set(input.yakuIds);
  const conditions =
    new Set<PlayerSkillUnlockConditionId>();

  for (const [condition, targets] of YAKU_CONDITIONS) {
    if (targets.some(id => yakuIds.has(id))) {
      conditions.add(condition);
    }
  }

  if (input.waitType === "tanki") {
    conditions.add("tanki-win-count");
  }

  if (
    input.waitType === "penchan" ||
    input.waitType === "kanchan"
  ) {
    conditions.add("penchan-or-kanchan-win-count");
  }

  if (input.redDoraCount >= 3) {
    conditions.add("win-with-at-least-3-red-dora");
  }

  if (input.redDoraCount >= 5) {
    conditions.add("win-with-at-least-5-red-dora");
  }

  if (input.uraDoraHan >= 4) {
    conditions.add("win-with-at-least-4-ura-dora");
  }

  let next = state;

  for (const condition of conditions) {
    const result = tryAddPlayerSkillUnlockProgress(
      next,
      condition,
      1
    );

    if (!result.succeeded) {
      throw new RangeError(
        "和了による解放進捗を加算できません。"
      );
    }

    next = result.state;
  }

  return next;
}
