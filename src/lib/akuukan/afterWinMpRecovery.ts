import type {
  NormalYakuId
} from "../mahjong/yaku";
import {
  getEquippedPlayerSkill
} from "./equipment";
import {
  recoverAkuukanMp
} from "./mp";
import {
  getPlayerSkillDefinition
} from "./playerSkillCatalog";
import {
  getPlayerSkillLevelDefinition
} from "./playerSkillCatalogTypes";
import {
  isAkuukanSourceDisabled
} from "./state";
import type {
  AkuukanGameState
} from "./types";

const PLAYER_SKILL_2_18_TARGET_YAKU =
  new Set<NormalYakuId>([
    "pinfu",
    "iipeikou",
    "ryanpeikou",
    "sanshokuDoujun",
    "ittsuu"
  ]);

export interface RecoverPlayerSkill2_18MpInput {
  readonly akuukan: AkuukanGameState;
  readonly playerMp: number;
  readonly maxMp: number;
  readonly normalYakuIds:
    readonly NormalYakuId[];
}

export function recoverPlayerSkill2_18Mp(
  input: RecoverPlayerSkill2_18MpInput
): number {
  const sourceId =
    "player-skill:2-18" as const;
  const equippedSkill =
    getEquippedPlayerSkill(
      input.akuukan,
      "2-18"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      input.akuukan,
      sourceId
    )
  ) {
    return recoverAkuukanMp(
      input.playerMp,
      0,
      input.maxMp
    );
  }

  const levelDefinition =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("2-18"),
      equippedSkill.level
    );
  const recoveryPerYaku =
    levelDefinition.effectValues
      .mpRecoveryPerYaku;

  if (
    typeof recoveryPerYaku !== "number" ||
    !Number.isInteger(recoveryPerYaku) ||
    recoveryPerYaku < 0
  ) {
    throw new Error(
      "スキル2-18の役ごとのMP回復量が不正です。"
    );
  }

  const targetYakuCount =
    new Set(
      input.normalYakuIds.filter(
        (yakuId) =>
          PLAYER_SKILL_2_18_TARGET_YAKU.has(
            yakuId
          )
      )
    ).size;

  return recoverAkuukanMp(
    input.playerMp,
    targetYakuCount * recoveryPerYaku,
    input.maxMp
  );
}
