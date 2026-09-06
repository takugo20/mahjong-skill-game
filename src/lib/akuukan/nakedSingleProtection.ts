import {
  getWinningTileTypes
} from "../mahjong/hand";
import type {
  Meld,
  Tile
} from "../mahjong/types";
import {
  getEquippedPlayerSkill
} from "./equipment";
import {
  isAkuukanSourceDisabled
} from "./state";
import type {
  AkuukanGameState
} from "./types";

export interface PlayerSkill3_6ProtectionInput {
  readonly akuukan: AkuukanGameState;
  readonly concealedTiles: readonly Tile[];
  readonly melds: readonly Meld[];
}

export function isPlayerSkill3_6NakedSingleProtected(
  input: PlayerSkill3_6ProtectionInput
): boolean {
  if (
    !getEquippedPlayerSkill(
      input.akuukan,
      "3-6"
    ) ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:3-6"
    ) ||
    input.concealedTiles.length !== 1 ||
    input.melds.length !== 4 ||
    input.melds.some(
      (meld) => meld.kind === "closedKan"
    )
  ) {
    return false;
  }

  const pairTile = input.concealedTiles[0];

  return getWinningTileTypes(
    input.concealedTiles,
    input.melds
  ).some(
    (tileType) =>
      tileType.suit === pairTile.suit &&
      tileType.rank === pairTile.rank
  );
}
