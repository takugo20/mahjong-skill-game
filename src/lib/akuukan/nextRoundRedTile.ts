import type {
  Tile
} from "../mahjong/types";
import {
  getEquippedPlayerSkill
} from "./equipment";
import {
  applyAkuukanRedTileTransformation
} from "./redTileTransformation";
import {
  endAkuukanEffect,
  isAkuukanSourceDisabled,
  reserveAkuukanNextRoundEffect
} from "./state";
import type {
  AkuukanGameState
} from "./types";

export const AKUUKAN_PLAYER_SKILL_1_6_INSTANCE_ID =
  "player-skill:1-6:next-round-red-tile";

export interface ApplyAkuukanPlayerSkill1_6AtDealInput {
  readonly akuukan: AkuukanGameState;
  readonly tiles: readonly Tile[];
  readonly random: () => number;
}

export interface AkuukanPlayerSkill1_6DealResult {
  readonly akuukan: AkuukanGameState;
  readonly tiles: Tile[];
  readonly transformedTileId: string | null;
  readonly consumed: boolean;
}

export function reserveAkuukanPlayerSkill1_6AfterWin(
  akuukan: AkuukanGameState
): AkuukanGameState {
  const equippedSkill =
    getEquippedPlayerSkill(
      akuukan,
      "1-6"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      akuukan,
      "player-skill:1-6"
    )
  ) {
    return akuukan;
  }

  return reserveAkuukanNextRoundEffect(
    akuukan,
    {
      instanceId:
        AKUUKAN_PLAYER_SKILL_1_6_INSTANCE_ID,
      sourceId: "player-skill:1-6",
      remainingTurns: null
    }
  );
}

export function applyAkuukanPlayerSkill1_6AtDeal(
  input: ApplyAkuukanPlayerSkill1_6AtDealInput
): AkuukanPlayerSkill1_6DealResult {
  const pending =
    input.akuukan.activeEffects.some(
      (effect) =>
        effect.instanceId ===
        AKUUKAN_PLAYER_SKILL_1_6_INSTANCE_ID
    );

  if (!pending) {
    return {
      akuukan: input.akuukan,
      tiles: [...input.tiles],
      transformedTileId: null,
      consumed: false
    };
  }

  const transformation =
    applyAkuukanRedTileTransformation({
      akuukan: input.akuukan,
      skillId: "1-6",
      tiles: input.tiles,
      random: input.random
    });

  return {
    akuukan: endAkuukanEffect(
      input.akuukan,
      AKUUKAN_PLAYER_SKILL_1_6_INSTANCE_ID
    ),
    tiles: transformation.tiles,
    transformedTileId:
      transformation.transformedTileId,
    consumed: true
  };
}
