import type {
  NormalYakuId
} from "../mahjong/yaku";
import {
  getEquippedPlayerSkill
} from "./equipment";
import {
  isAkuukanSourceDisabled,
  reserveAkuukanNextRoundEffect
} from "./state";
import type {
  AkuukanGameState
} from "./types";

export const AKUUKAN_PLAYER_SKILL_2_19_INSTANCE_ID =
  "player-skill:2-19:next-round-pairs";

const PLAYER_SKILL_2_19_TARGET_YAKU =
  new Set<NormalYakuId>([
    "sevenPairs",
    "toitoi",
    "sanshokuDoukou",
    "sanankou",
    "sankantsu"
  ]);

export interface ReservePlayerSkill2_19Input {
  readonly akuukan: AkuukanGameState;
  readonly normalYakuIds:
    readonly NormalYakuId[];
}

export function reservePlayerSkill2_19AfterWin(
  input: ReservePlayerSkill2_19Input
): AkuukanGameState {
  const equippedSkill =
    getEquippedPlayerSkill(
      input.akuukan,
      "2-19"
    );
  const hasTargetYaku =
    input.normalYakuIds.some(
      (yakuId) =>
        PLAYER_SKILL_2_19_TARGET_YAKU.has(
          yakuId
        )
    );

  if (
    !equippedSkill ||
    !hasTargetYaku ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:2-19"
    )
  ) {
    return input.akuukan;
  }

  return reserveAkuukanNextRoundEffect(
    input.akuukan,
    {
      instanceId:
        AKUUKAN_PLAYER_SKILL_2_19_INSTANCE_ID,
      sourceId: "player-skill:2-19",
      remainingTurns: null
    }
  );
}
