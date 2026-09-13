import type {
  GameState, PlayerState, Tile
} from "../mahjong/types";
import {
  calculateShanten,
  getWinningTileTypes
} from "../mahjong/hand";
import { evaluateWinningHand } from "../mahjong/winning";
import { createCpuDiscardInput } from "../mahjong/cpuDiscard";
import { isDora } from "../mahjong/tiles";
import { isEnemyAbilityEnabled } from "./winningEvaluationEnemyAbilityAdjustments";

// 山や裏ドラを見ず、満貫以上のツモを狙える聴牌を探す。
export function getHighValueReadyDiscardIds(
  state: GameState,
  player: PlayerState,
  indicators: readonly Tile[],
  allowedIds: readonly string[]
): string[] {
  if (
    player.hand.length + player.melds.length * 3 !== 14
  ) {
    return [];
  }

  const visible = createCpuDiscardInput(
    state, player, indicators
  ).visibleTiles;

  const known = [
    ...new Map(
      [...visible, ...indicators].map(t => [t.id, t])
    ).values()
  ];

  const allowed = new Set(allowedIds);
  const cache = new Map<string, boolean>();

  const riichi =
    player.melds.every(m => m.kind === "closedKan")
    && (
      player.riichi
      || (
        player.score >= 1000
        && state.round.liveWall.length >= 4
      )
    );

  return player.hand.filter(discard => {
    if (!allowed.has(discard.id)) return false;

    const key =
      `${discard.suit}-${discard.rank}-${discard.red}`;

    if (cache.has(key)) return cache.get(key)!;

    const hand = player.hand.filter(
      t => t.id !== discard.id
    );

    let count = 0;

    if (
      calculateShanten(hand, player.melds).minimum === 0
    ) {
      const waits = getWinningTileTypes(
        hand, player.melds
      );

      for (const [index, wait] of waits.entries()) {
        const left = Math.max(
          0,
          4 - known.filter(
            t =>
              t.suit === wait.suit
              && t.rank === wait.rank
          ).length
        );

        if (!left) continue;

        const tile: Tile = {
          ...wait,
          id: `push-value-${index}`,
          red: false
        };

        const result = evaluateWinningHand({
          concealedTiles: [...hand, tile],
          melds: player.melds,
          winningTile: tile,
          winMethod: "tsumo",
          seatWind: player.seatWind,
          prevailingWind: state.round.prevailingWind,
          doraIndicators: indicators,
          riichi
        });

        if (
          result.valid
          && result.best.score.basePoints >= 2000
        ) {
          count += left;
        }
      }
    }

    cache.set(key, count >= 2);
    return count >= 2;
  }).map(t => t.id);
}

export function getEnemyFifteenThreatSeats(
  state: GameState,
  player: PlayerState,
  indicators: readonly Tile[]
): number[] {
  const winds = {
    east: 1, south: 2, west: 3, north: 4
  };

  return state.round.players.filter(p => {
    if (p.seat === player.seat) return false;
    if (p.riichi) return true;

    const tiles = p.melds.flatMap(m => m.tiles);

    const bonus = tiles.reduce(
      (sum, t) =>
        sum
        + Number(t.red)
        + indicators.filter(d => isDora(t, d)).length,
      0
    );

    const yakuhai = p.melds.reduce((sum, m) => {
      const t = m.tiles[0];

      if (
        !t
        || m.kind === "chi"
        || t.suit !== "honor"
      ) {
        return sum;
      }

      return sum
        + Number(t.rank >= 5)
        + Number(t.rank === winds[p.seatWind])
        + Number(
          t.rank === winds[state.round.prevailingWind]
        );
    }, 0);

    if (yakuhai + bonus >= 4) return true;

    const open = p.melds.filter(
      m => m.kind !== "closedKan"
    );

    const suits = new Set(
      tiles.filter(t => t.suit !== "honor")
        .map(t => t.suit)
    );

    const flush =
      open.length >= 2 && suits.size === 1;

    const triplets =
      open.length >= 3
      && open.every(m => m.kind !== "chi");

    return flush || triplets;
  }).map(p => p.seat);
}

export function getEnemyFifteenForbiddenTileIds(
  state: GameState,
  player: PlayerState,
  indicators: readonly Tile[],
  forbidden: readonly string[] = []
): readonly string[] {
  const a = state.akuukan;

  if (
    !a
    || player.seat !== 2
    || a.setup.enemyId !== "enemy-15"
    || !isEnemyAbilityEnabled(a, "E-27")
  ) {
    return forbidden;
  }

  const threats = getEnemyFifteenThreatSeats(
    state, player, indicators
  );

  if (!threats.length) return forbidden;

  const blocked = new Set(forbidden);
  const legal = player.hand.filter(
    t => !blocked.has(t.id)
  );

  const high = getHighValueReadyDiscardIds(
    state,
    player,
    indicators,
    legal.map(t => t.id)
  );

  // 高打点聴牌を維持できる場合は、その候補で攻める。
  let allowed = new Set(high);

  if (!allowed.size) {
    allowed = new Set(
      legal.filter(
        t => threats.every(
          seat => state.round.players.find(
            p => p.seat === seat
          )!.discards.some(
            d =>
              !d.faceDown
              && !d.removedFromRiver
              && d.tile.suit === t.suit
              && d.tile.rank === t.rank
          )
        )
      ).map(t => t.id)
    );
  }

  if (!allowed.size) return forbidden;

  return [
    ...new Set([
      ...forbidden,
      ...legal.filter(t => !allowed.has(t.id))
        .map(t => t.id)
    ])
  ];
}
