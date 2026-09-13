import type {
  GameState, PlayerState, Tile
} from "../mahjong/types";
import {
  calculateShanten,
  getTileTypeIndex,
  getTileTypeFromIndex
} from "../mahjong/hand";
import { evaluateWinningHand } from "../mahjong/winning";
import { isDora } from "../mahjong/tiles";
import {
  createCpuDiscardInput,
  evaluateCpuDiscards
} from "../mahjong/cpuDiscard";
import { hasAkuukanEffectInstance } from "./state";
import { isEnemyAbilityEnabled } from "./winningEvaluationEnemyAbilityAdjustments";

function remainingTiles(known: readonly Tile[]): number[] {
  const counts = Array<number>(34).fill(4);

  for (
    const tile of new Map(
      known.map(t => [t.id, t])
    ).values()
  ) {
    counts[getTileTypeIndex(tile)]--;
  }

  return counts.map(n => Math.max(0, n));
}

export function estimateEnemyThirteenCallRisk(
  state: GameState,
  player: PlayerState,
  tile: Tile,
  remaining: readonly number[]
): number {
  const total = remaining.reduce(
    (sum, n) => sum + n,
    0
  );

  if (!total) return 0;

  let notCalled = 1;

  for (const other of state.round.players) {
    if (
      other.seat === player.seat
      || other.riichi
    ) {
      continue;
    }

    const share = Math.min(
      1,
      other.hand.length / total
    );

    const copies = remaining[getTileTypeIndex(tile)];

    const pon = copies < 2
      ? 0
      : 1 - (1 - share) ** copies
        - copies * share * (1 - share) ** (copies - 1);

    let chi = 0;

    if (
      other.seat === (player.seat + 1) % 4
      && tile.suit !== "honor"
    ) {
      const start =
        getTileTypeIndex(tile) - tile.rank + 1;

      const held = (rank: number) =>
        1 - (1 - share) ** remaining[start + rank - 1];

      for (const [left, right] of [
        [tile.rank - 2, tile.rank - 1],
        [tile.rank - 1, tile.rank + 1],
        [tile.rank + 1, tile.rank + 2]
      ]) {
        if (left >= 1 && right <= 9) {
          chi = Math.max(
            chi,
            held(left) * held(right)
          );
        }
      }
    }

    notCalled *= (1 - pon) * (1 - chi);
  }

  return Math.min(
    0.95,
    Math.max(0, 1 - notCalled)
  );
}

function shapeValue(
  hand: readonly Tile[],
  indicators: readonly Tile[]
): number {
  const counts = Array<number>(34).fill(0);

  for (const t of hand) {
    counts[getTileTypeIndex(t)]++;
  }

  let value = hand.reduce(
    (sum, t) => sum + 3 * (
      Number(t.red)
      + indicators.filter(d => isDora(t, d)).length
    ),
    0
  );

  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 2) value += 2;

    if (
      i < 27
      && i % 9 < 8
      && counts[i]
      && counts[i + 1]
    ) {
      value += 2;
    }
  }

  return value;
}

export function chooseEnemyThirteenDiscard(
  state: GameState,
  player: PlayerState,
  indicators: readonly Tile[],
  forbidden: readonly string[] = [],
  random: () => number = Math.random
): Tile | null {
  const a = state.akuukan;

  if (
    !a
    || player.seat !== 2
    || a.setup.enemyId !== "enemy-13"
    || player.riichi
    || state.round.liveWall.length === 0
    || !isEnemyAbilityEnabled(a, "E-25")
    || !hasAkuukanEffectInstance(
      a,
      "enemy-ability:E-25:first-normal-action"
    )
    || hasAkuukanEffectInstance(
      a,
      "enemy-ability:E-25:second-normal-action"
    )
  ) {
    return null;
  }

  const input = createCpuDiscardInput(
    state,
    player,
    indicators,
    forbidden
  );

  const base = evaluateCpuDiscards(input)
    .filter(c => Number.isFinite(c.shanten))
    .sort((x, y) => y.score - x.score);

  const unique = new Map<
    string,
    typeof base[number]
  >();

  for (const item of base) {
    const key =
      `${getTileTypeIndex(item.tile)}-${item.tile.red}`;

    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  const shortlist = [...unique.values()].slice(0, 4);

  if (!shortlist.length) return null;

  const remaining = remainingTiles([
    ...player.hand,
    ...input.visibleTiles,
    ...indicators
  ]);

  const total = remaining.reduce(
    (sum, n) => sum + n,
    0
  );

  if (!total) return null;

  const cache = new Map<string, number>();

  const valueAfterDiscard = (hand: Tile[]) => {
    const key = hand.map(
      t => `${getTileTypeIndex(t)}-${Number(t.red)}`
    ).sort().join(",");

    const known = cache.get(key);
    if (known !== undefined) return known;

    const value =
      -100 * calculateShanten(
        hand,
        player.melds
      ).minimum
      + shapeValue(hand, indicators);

    cache.set(key, value);
    return value;
  };

  const scored = shortlist.map(first => {
    const hand = player.hand.filter(
      t => t.id !== first.tile.id
    );
    const currentValue = valueAfterDiscard(hand);

    let expected = 0;

    for (let index = 0; index < 34; index++) {
      if (!remaining[index]) continue;

      const tile: Tile = {
        ...getTileTypeFromIndex(index),
        id: `enemy-13-next-${index}`,
        red: false
      };

      const nextHand = [...hand, tile];

      const win = evaluateWinningHand({
        concealedTiles: nextHand,
        melds: player.melds,
        winningTile: tile,
        winMethod: "tsumo",
        seatWind: player.seatWind,
        prevailingWind: state.round.prevailingWind,
        doraIndicators: indicators
      });

      let best = win.valid ? 200 : -Infinity;

      if (!win.valid) {
        for (const discarded of nextHand) {
          if (forbidden.includes(discarded.id)) {
            continue;
          }

          best = Math.max(
            best,
            valueAfterDiscard(
              nextHand.filter(
                t => t.id !== discarded.id
              )
            )
          );
        }
      }

      expected += remaining[index] * (
        Number.isFinite(best) ? best : currentValue
      );
    }

    const risk = estimateEnemyThirteenCallRisk(
      state,
      player,
      first.tile,
      remaining
    );

    return {
      tile: first.tile,
      score: first.score
        + 0.25 * (1 - risk) * (
          expected / total - currentValue
        )
        - 15 * risk
    };
  });

  const maximum = Math.max(
    ...scored.map(s => s.score)
  );

  const best = scored.filter(
    s => Math.abs(s.score - maximum) < 1e-9
  );

  const index = Math.min(
    best.length - 1,
    Math.max(0, Math.floor(random() * best.length))
  );

  return best[index].tile;
}
