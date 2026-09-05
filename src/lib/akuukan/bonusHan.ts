import type {
  WaitType
} from "../mahjong/hand";
import type {
  Discard
} from "../mahjong/types";
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

export interface AkuukanPlayerSkill1_7BonusHanInput {
  readonly akuukan: AkuukanGameState;
  readonly winnerIsPlayer: boolean;
  readonly discards: readonly Discard[];
  readonly hasValidYaku: boolean;
}

export interface AkuukanPlayerSkill1_8BonusHanInput {
  readonly akuukan: AkuukanGameState;
  readonly winnerIsPlayer: boolean;
  readonly waitType: WaitType;
  readonly hasValidYaku: boolean;
}

interface AkuukanPlayerSkill1_7Effect {
  readonly minimumHonorDiscards: number;
  readonly bonusHan: number;
}

interface AkuukanPlayerSkill1_8Effect {
  readonly bonusHan: number;
}

function getEnabledAkuukanPlayerSkill1_7Effect(
  akuukan: AkuukanGameState
): AkuukanPlayerSkill1_7Effect | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      akuukan,
      "1-7"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      akuukan,
      "player-skill:1-7"
    )
  ) {
    return null;
  }

  const effectValues =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("1-7"),
      equippedSkill.level
    ).effectValues;
  const minimumHonorDiscards =
    effectValues.minimumHonorDiscards;
  const bonusHan = effectValues.bonusHan;

  if (
    typeof minimumHonorDiscards !==
      "number" ||
    !Number.isInteger(
      minimumHonorDiscards
    ) ||
    minimumHonorDiscards < 1
  ) {
    throw new Error(
      "スキル1-7の必要字牌枚数が不正です。"
    );
  }

  if (
    typeof bonusHan !== "number" ||
    !Number.isInteger(bonusHan) ||
    bonusHan < 1
  ) {
    throw new Error(
      "スキル1-7のボーナス翻が不正です。"
    );
  }

  return {
    minimumHonorDiscards,
    bonusHan
  };
}

function getEnabledAkuukanPlayerSkill1_8Effect(
  akuukan: AkuukanGameState
): AkuukanPlayerSkill1_8Effect | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      akuukan,
      "1-8"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      akuukan,
      "player-skill:1-8"
    )
  ) {
    return null;
  }

  const bonusHan =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("1-8"),
      equippedSkill.level
    ).effectValues.bonusHan;

  if (
    typeof bonusHan !== "number" ||
    !Number.isInteger(bonusHan) ||
    bonusHan < 1
  ) {
    throw new Error(
      "スキル1-8のボーナス翻が不正です。"
    );
  }

  return { bonusHan };
}

export function countAkuukanPhysicalHonorDiscards(
  discards: readonly Discard[]
): number {
  return discards.filter(
    (discard) =>
      !discard.called &&
      discard.tile.suit === "honor"
  ).length;
}

export function getAkuukanPlayerSkill1_7BonusHan(
  input: AkuukanPlayerSkill1_7BonusHanInput
): number {
  if (
    !input.winnerIsPlayer ||
    !input.hasValidYaku
  ) {
    return 0;
  }

  const effect =
    getEnabledAkuukanPlayerSkill1_7Effect(
      input.akuukan
    );

  if (!effect) {
    return 0;
  }

  return countAkuukanPhysicalHonorDiscards(
    input.discards
  ) >= effect.minimumHonorDiscards
    ? effect.bonusHan
    : 0;
}

export function getAkuukanPlayerSkill1_8BonusHan(
  input: AkuukanPlayerSkill1_8BonusHanInput
): number {
  if (
    !input.winnerIsPlayer ||
    !input.hasValidYaku ||
    input.waitType !== "tanki"
  ) {
    return 0;
  }

  return (
    getEnabledAkuukanPlayerSkill1_8Effect(
      input.akuukan
    )?.bonusHan ?? 0
  );
}
