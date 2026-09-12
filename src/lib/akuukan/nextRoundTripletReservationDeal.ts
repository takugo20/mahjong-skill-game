import { getTileTypeIndex } from "../mahjong/hand";
import type { Tile } from "../mahjong/types";
import { getEquippedPlayerSkill } from "./equipment";
import { isAkuukanSourceDisabled } from "./state";
import type { AkuukanGameState } from "./types";
import {
  AKUUKAN_PLAYER_SKILL_4_23_RESERVATION_PREFIX
} from "./nextRoundTripletReservation";

export interface ApplyPlayerSkill4_23AtDealInput {
  readonly akuukan: AkuukanGameState;
  readonly availableTiles: readonly Tile[];
  readonly remainingHandTileCount: number;
  readonly random: () => number;
}

export interface PlayerSkill4_23DealResult {
  readonly akuukan: AkuukanGameState;
  readonly reservedTiles: Tile[];
  readonly remainingTiles: Tile[];
  readonly consumedReservationCount: number;
  readonly guaranteedTripletCount: number;
}

export function applyPlayerSkill4_23AtDeal(
  input: ApplyPlayerSkill4_23AtDealInput
): PlayerSkill4_23DealResult {
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
      effect.sourceId === "player-skill:4-23" &&
      effect.instanceId.startsWith(
        AKUUKAN_PLAYER_SKILL_4_23_RESERVATION_PREFIX
      )
  );
  const reservedTiles: Tile[] = [];
  let remainingTiles = [...input.availableTiles];
  const enabled =
    getEquippedPlayerSkill(input.akuukan, "4-23") !== null &&
    !isAkuukanSourceDisabled(input.akuukan, "player-skill:4-23");

  if (enabled) {
    for (const _reservation of reservations) {
      if (
        reservedTiles.length + 3 > input.remainingHandTileCount
      ) {
        break;
      }

      const groups = new Map<number, Tile[]>();
      for (const tile of remainingTiles) {
        const key = getTileTypeIndex(tile);
        const group = groups.get(key) ?? [];
        group.push(tile);
        groups.set(key, group);
      }
      const candidates = [...groups.values()].filter(
        (group) => group.length >= 3
      );
      if (candidates.length === 0) break;

      const roll = input.random();
      if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
        throw new RangeError("乱数は0以上1未満で指定してください。");
      }
      const triplet = candidates[
        Math.floor(roll * candidates.length)
      ].slice(0, 3);
      const selected = new Set(triplet);
      reservedTiles.push(...triplet);
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
    guaranteedTripletCount: reservedTiles.length / 3
  };
}
