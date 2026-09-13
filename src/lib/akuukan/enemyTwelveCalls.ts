import type {
  Tile, Meld
} from "../mahjong/types";
import { getWinningTileTypes } from "../mahjong/hand";
import { evaluateWinningHand } from "../mahjong/winning";
import { isDora } from "../mahjong/tiles";
import type {
  EnemyCallStrategy, Position
} from "./enemyCallStrategy";

export function scoreEnemyTwelveCall(
  s: EnemyCallStrategy,
  p: Position
): number | null {
  const c = s.selective;

  if (
    !c
    || p.kind === "openKan"
    || p.shantenAfter > 1
  ) {
    return null;
  }

  const indicators = s.doraIndicators ?? [];

  const known = [
    ...new Map(
      [
        ...c.known,
        ...c.hand,
        p.calledTile,
        ...indicators
      ].map(t => [t.id, t])
    ).values()
  ];

  const summary = (
    hand: readonly Tile[],
    melds: readonly Meld[],
    riichi: boolean
  ) => {
    let count = 0;
    let minBase = Infinity;

    const waits = getWinningTileTypes(hand, melds);

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
        red: false,
        id: `enemy-12-call-${index}`
      };

      const result = evaluateWinningHand({
        concealedTiles: [...hand, tile],
        melds,
        winningTile: tile,
        winMethod: "ron",
        seatWind: p.seatWind,
        prevailingWind: p.prevailingWind,
        doraIndicators: indicators,
        riichi
      });

      if (!result.valid) continue;

      count += left;
      minBase = Math.min(
        minBase,
        result.best.score.basePoints
      );
    }

    return {
      count,
      minBase: count ? minBase : 0
    };
  };

  if (p.shantenAfter === 0) {
    const after = summary(p.hand, p.melds, false);
    if (!after.count) return null;

    const before = p.shantenBefore === 0
      ? summary(c.hand, c.melds, c.canRiichi)
      : { count: 0, minBase: 0 };

    const improved =
      p.shantenBefore > 0
      || after.count > before.count
      || (
        after.minBase >= 2000
        && after.minBase > before.minBase
      );

    return improved
      ? after.count
        + after.minBase / 1000
        - (p.discardedTile?.red ? 5 : 0)
      : null;
  }

  if (!p.reliableYaku) return null;

  const bonus = [
    ...p.hand,
    ...p.melds.flatMap(m => m.tiles)
  ].reduce(
    (sum, t) =>
      sum
      + Number(t.red)
      + indicators.filter(d => isDora(t, d)).length,
    0
  );

  // 確実な役とドラ4枚、
  // またはオーラスで一向聴へ進む場合。
  return bonus >= 4
    || (
      s.lastRoundAttack
      && p.shantenAfter < p.shantenBefore
    )
    ? -100 + bonus * 2
    : null;
}
