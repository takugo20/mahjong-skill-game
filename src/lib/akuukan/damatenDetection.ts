import {
  isTenpai
} from "../mahjong/hand";
import type {
  PlayerState
} from "../mahjong/types";
import {
  isClosedHand
} from "../mahjong/yaku";
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

export type DamatenDetectionPlayer = Pick<
  PlayerState,
  "id" | "seat" | "hand" | "melds" | "riichi"
>;

export interface DetectPlayerSkill3_3Input {
  readonly akuukan: AkuukanGameState;
  readonly players:
    readonly DamatenDetectionPlayer[];
  readonly random?: () => number;
}

export interface PlayerSkill3_3DetectionResult {
  readonly akuukan: AkuukanGameState;
  readonly newlyDamatenPlayerIds:
    readonly string[];
  readonly detectedPlayerIds:
    readonly string[];
}

function getDamatenPlayerIds(
  players: readonly DamatenDetectionPlayer[]
): string[] {
  return players
    .filter(
      (player) =>
        player.seat !== 0 &&
        !player.riichi &&
        isClosedHand(player.melds) &&
        isTenpai(
          player.hand,
          player.melds
        )
    )
    .map((player) => player.id);
}

function getDetectionChancePercent(
  akuukan: AkuukanGameState
): number | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      akuukan,
      "3-3"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      akuukan,
      "player-skill:3-3"
    )
  ) {
    return null;
  }

  const chance =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("3-3"),
      equippedSkill.level
    ).effectValues
      .detectionChancePercent;

  if (
    typeof chance !== "number" ||
    !Number.isFinite(chance) ||
    chance < 0 ||
    chance > 100
  ) {
    throw new Error(
      "スキル3-3の察知確率が不正です。"
    );
  }

  return chance;
}

export function detectPlayerSkill3_3DamatenTransitions(
  input: DetectPlayerSkill3_3Input
): PlayerSkill3_3DetectionResult {
  if (
    !getEquippedPlayerSkill(
      input.akuukan,
      "3-3"
    )
  ) {
    return {
      akuukan: input.akuukan,
      newlyDamatenPlayerIds: [],
      detectedPlayerIds: []
    };
  }

  const currentDamatenPlayerIds =
    getDamatenPlayerIds(input.players);
  const previousDamatenPlayerIds =
    new Set(
      input.akuukan
        .playerSkill3_3DamatenPlayerIds ??
        []
    );
  const newlyDamatenPlayerIds =
    currentDamatenPlayerIds.filter(
      (playerId) =>
        !previousDamatenPlayerIds.has(
          playerId
        )
    );
  const chance =
    getDetectionChancePercent(
      input.akuukan
    );
  const random =
    input.random ?? Math.random;
  const detectedPlayerIds =
    chance === null
      ? []
      : newlyDamatenPlayerIds.filter(
          () =>
            random() < chance / 100
        );

  return {
    akuukan: {
      ...input.akuukan,
      playerSkill3_3DamatenPlayerIds:
        currentDamatenPlayerIds
    },
    newlyDamatenPlayerIds,
    detectedPlayerIds
  };
}
