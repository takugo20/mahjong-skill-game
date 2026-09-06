import type {
  NumberSuit,
  Tile
} from "../mahjong/types";
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

export const AKUUKAN_PLAYER_SKILL_2_20_INSTANCE_ID =
  "player-skill:2-20:next-round-suit";

const PLAYER_SKILL_2_20_TARGET_YAKU =
  new Set<NormalYakuId>([
    "honitsu",
    "chinitsu"
  ]);

export interface ReservePlayerSkill2_20Input {
  readonly akuukan: AkuukanGameState;
  readonly normalYakuIds:
    readonly NormalYakuId[];
  readonly winningTiles: readonly Tile[];
}

function getWinningNumberSuit(
  tiles: readonly Tile[]
): NumberSuit | null {
  const suits = new Set<NumberSuit>();

  for (const tile of tiles) {
    if (tile.suit !== "honor") {
      suits.add(tile.suit);
    }
  }

  if (suits.size !== 1) {
    return null;
  }

  return [...suits][0] ?? null;
}

export function reservePlayerSkill2_20AfterWin(
  input: ReservePlayerSkill2_20Input
): AkuukanGameState {
  const equippedSkill =
    getEquippedPlayerSkill(
      input.akuukan,
      "2-20"
    );
  const hasTargetYaku =
    input.normalYakuIds.some(
      (yakuId) =>
        PLAYER_SKILL_2_20_TARGET_YAKU.has(
          yakuId
        )
    );
  const winningSuit =
    getWinningNumberSuit(
      input.winningTiles
    );

  if (
    !equippedSkill ||
    !hasTargetYaku ||
    winningSuit === null ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:2-20"
    )
  ) {
    return input.akuukan;
  }

  const reserved =
    reserveAkuukanNextRoundEffect(
      input.akuukan,
      {
        instanceId:
          AKUUKAN_PLAYER_SKILL_2_20_INSTANCE_ID,
        sourceId: "player-skill:2-20",
        remainingTurns: null
      }
    );

  if (
    reserved.playerSkill2_20ReservedSuit ===
    winningSuit
  ) {
    return reserved;
  }

  return {
    ...reserved,
    playerSkill2_20ReservedSuit:
      winningSuit
  };
}
