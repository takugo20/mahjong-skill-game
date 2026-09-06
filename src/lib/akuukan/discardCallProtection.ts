import {
  getEquippedPlayerSkill
} from "./equipment";
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
import type {
  AkuukanCallKind
} from "./callLegality";

export interface PlayerSkill3_5CallCheckInput {
  readonly akuukan: AkuukanGameState;
  readonly discardOwnerIsPlayer: boolean;
  readonly discardNumber: number;
  readonly kind: AkuukanCallKind;
}

function isBlockedCallKind(
  kind: AkuukanCallKind
): boolean {
  return (
    kind === "chi" ||
    kind === "pon" ||
    kind === "openKan"
  );
}

function getProtectedDiscardCount(
  akuukan: AkuukanGameState
): number | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      akuukan,
      "3-5"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      akuukan,
      "player-skill:3-5"
    )
  ) {
    return null;
  }

  const protectedDiscardCount =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("3-5"),
      equippedSkill.level
    ).effectValues.protectedDiscardCount;

  if (
    typeof protectedDiscardCount !==
      "number" ||
    !Number.isSafeInteger(
      protectedDiscardCount
    ) ||
    protectedDiscardCount < 0
  ) {
    throw new Error(
      "スキル3-5の保護打牌数が不正です。"
    );
  }

  return protectedDiscardCount;
}

export function isPlayerSkill3_5CallBlocked(
  input: PlayerSkill3_5CallCheckInput
): boolean {
  if (
    !Number.isSafeInteger(
      input.discardNumber
    ) ||
    input.discardNumber < 1
  ) {
    throw new RangeError(
      "打牌回数は1以上の整数で指定してください。"
    );
  }

  if (
    !input.discardOwnerIsPlayer ||
    !isBlockedCallKind(input.kind)
  ) {
    return false;
  }

  const protectedDiscardCount =
    getProtectedDiscardCount(
      input.akuukan
    );

  return (
    protectedDiscardCount !== null &&
    input.discardNumber <=
      protectedDiscardCount
  );
}
