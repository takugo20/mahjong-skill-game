import { getEquippedPlayerSkill } from "./equipment";
import { getPlayerSkillDefinition } from "./playerSkillCatalog";
import { getPlayerSkillLevelDefinition } from "./playerSkillCatalogTypes";
import { isAkuukanSourceDisabled } from "./state";
import type { AkuukanGameState } from "./types";

export interface AkuukanPlayerSkill5_4IppatsuInput {
  readonly akuukan: AkuukanGameState;
  readonly winnerIsPlayer: boolean;
  readonly riichiEstablished: boolean;

  // 立直成立後、自分の打牌への反応判定まで完了した巡数。
  // 立直宣言牌は含めない。
  readonly completedTurnsAfterRiichi: number;

  // 立直成立後に副露・槓が成立した場合はtrue。
  readonly interruptedByCallOrKan: boolean;
}

export function isAkuukanPlayerSkill5_4IppatsuAvailable(
  input: AkuukanPlayerSkill5_4IppatsuInput
): boolean {
  if (
    !input.winnerIsPlayer ||
    !input.riichiEstablished ||
    input.interruptedByCallOrKan
  ) {
    return false;
  }

  const equipped = getEquippedPlayerSkill(
    input.akuukan,
    "5-4"
  );

  if (
    !equipped ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:5-4"
    )
  ) {
    return false;
  }

  if (
    !Number.isSafeInteger(input.completedTurnsAfterRiichi) ||
    input.completedTurnsAfterRiichi < 0
  ) {
    throw new Error("立直後の完了巡数が不正です。");
  }

  const duration = getPlayerSkillLevelDefinition(
    getPlayerSkillDefinition("5-4"),
    equipped.level
  ).effectValues.ippatsuDurationTurns;

  if (
    typeof duration !== "number" ||
    !Number.isSafeInteger(duration) ||
    duration <= 0
  ) {
    throw new Error("スキル5-4の一発期間が不正です。");
  }

  return input.completedTurnsAfterRiichi < duration;
}
