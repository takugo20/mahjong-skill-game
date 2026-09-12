import type { Tile } from "../mahjong/types";
import { getEquippedPlayerSkill } from "./equipment";
import { isAkuukanSourceDisabled } from "./state";
import type { AkuukanGameState } from "./types";
import {
  AKUUKAN_PLAYER_SKILL_4_22_RESERVATION_PREFIX
} from "./nextRoundSequenceReservation";

export interface ApplyPlayerSkill4_22AtDealInput {
  readonly akuukan: AkuukanGameState;
  readonly availableTiles: readonly Tile[];
  readonly remainingHandTileCount: number;
  readonly random: () => number;
}

export interface PlayerSkill4_22DealResult {
  readonly akuukan: AkuukanGameState;
  readonly reservedTiles: Tile[];
  readonly remainingTiles: Tile[];
  readonly consumedReservationCount: number;
  readonly guaranteedSequenceCount: number;
}

export function applyPlayerSkill4_22AtDeal(
  input: ApplyPlayerSkill4_22AtDealInput
): PlayerSkill4_22DealResult {
  if (
    !Number.isSafeInteger(input.remainingHandTileCount) ||
    input.remainingHandTileCount < 0 ||
    input.remainingHandTileCount > 13
  ) {
    throw new RangeError("配牌の空き枠は0〜13の整数で指定してください。");
  }

  // 次局開始でactiveEffectsへ移された予約だけを適用する。
  const reservations = input.akuukan.activeEffects.filter(
    (effect) =>
      effect.sourceId === "player-skill:4-22" &&
      effect.instanceId.startsWith(
        AKUUKAN_PLAYER_SKILL_4_22_RESERVATION_PREFIX
      )
  );
  const reservedTiles: Tile[] = [];
  let remainingTiles = [...input.availableTiles];
  const enabled =
    getEquippedPlayerSkill(input.akuukan, "4-22") !== null &&
    !isAkuukanSourceDisabled(input.akuukan, "player-skill:4-22");

  if (enabled) {
    for (const _reservation of reservations) {
      if (
        reservedTiles.length + 3 > input.remainingHandTileCount
      ) {
        break;
      }

      const candidates: Tile[][] = [];
      for (const suit of ["man", "pin", "sou"] as const) {
        for (let startRank = 1; startRank <= 7; startRank += 1) {
          const first = remainingTiles.find(
            (tile) => tile.suit === suit && tile.rank === startRank
          );
          const second = remainingTiles.find(
            (tile) => tile.suit === suit && tile.rank === startRank + 1
          );
          const third = remainingTiles.find(
            (tile) => tile.suit === suit && tile.rank === startRank + 2
          );
          if (first && second && third) {
            candidates.push([first, second, third]);
          }
        }
      }
      if (candidates.length === 0) break;

      const roll = input.random();
      if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
        throw new RangeError("乱数は0以上1未満で指定してください。");
      }
      const sequence = candidates[
        Math.floor(roll * candidates.length)
      ];
      const selected = new Set(sequence);
      reservedTiles.push(...sequence);
      remainingTiles = remainingTiles.filter(
        (tile) => !selected.has(tile)
      );
    }
  }

  // 入りきらなかった予約も、この配牌で消費する。
  const consumedIds = new Set(
    reservations.map((effect) => effect.instanceId)
  );
  return {
    akuukan: reservations.length === 0
      ? input.akuukan
      : {
          ...input.akuukan,
          activeEffects: input.akuukan.activeEffects.filter(
            (effect) => !consumedIds.has(effect.instanceId)
          )
        },
    reservedTiles,
    remainingTiles,
    consumedReservationCount: reservations.length,
    guaranteedSequenceCount: reservedTiles.length / 3
  };
}
