import type {
  Tile, Meld
} from "../mahjong/types";
import type {
  NormalYakuId
} from "../mahjong/yaku";
import { getTileTypeIndex } from "../mahjong/hand";

// 役の成立判定ではなく、同じ向聴数の打牌を比較する評価。
export function scoreEnemyThreeExtraYaku(
  previous: readonly NormalYakuId[],
  hand: readonly Tile[],
  melds: readonly Meld[]
): number {
  const history = new Set(previous);
  if (!history.size) return 0;

  const counts = Array<number>(34).fill(0);

  for (const tile of hand) {
    counts[getTileTypeIndex(tile)]++;
  }

  const suits = ["man", "pin", "sou"] as const;

  const fixedSequence = (
    suit: number,
    start: number
  ) => melds.some(
    m =>
      m.kind === "chi"
      && m.tiles.every(t => t.suit === suits[suit])
      && Math.min(...m.tiles.map(t => t.rank))
        === start + 1
  );

  const route = (patterns: [number, number][]) => {
    const fixed = patterns.filter(
      ([suit, start]) => fixedSequence(suit, start)
    ).length;

    // 必要な順子を作るための面子枠が残っているか確認。
    if (3 - fixed > 4 - melds.length) return 0;

    const parts = patterns.map(
      ([suit, start]) =>
        fixedSequence(suit, start)
          ? 3
          : [0, 1, 2].filter(
              offset =>
                counts[suit * 9 + start + offset] > 0
            ).length
    );

    const sum = parts.reduce((a, b) => a + b, 0);

    return parts.filter(n => n >= 2).length >= 2
      && sum >= 6
      ? sum
      : 0;
  };

  let score = 0;

  if (history.has("sanshokuDoujun")) {
    let best = 0;

    for (let start = 0; start <= 6; start++) {
      best = Math.max(
        best,
        route([
          [0, start],
          [1, start],
          [2, start]
        ])
      );
    }

    score += best * 2;
  }

  if (history.has("ittsuu")) {
    let best = 0;

    for (let suit = 0; suit < 3; suit++) {
      best = Math.max(
        best,
        route([
          [suit, 0],
          [suit, 3],
          [suit, 6]
        ])
      );
    }

    score += best * 2;
  }

  if (
    history.has("sevenPairs")
    && melds.length === 0
  ) {
    const pairs = counts.filter(n => n >= 2).length;
    const kinds = counts.filter(n => n > 0).length;

    if (pairs >= 4 && kinds >= 6) {
      score += pairs * 2 + (kinds - pairs) * 0.25;
    }
  }

  if (
    history.has("toitoi")
    && melds.every(m => m.kind !== "chi")
  ) {
    const groups =
      counts.filter(n => n >= 2).length
      + melds.length;

    if (groups >= 3) {
      score += groups * 2
        + counts.filter(n => n >= 3).length * 2;
    }
  }

  if (history.has("chinitsu")) {
    const all = [
      ...hand,
      ...melds.flatMap(m => m.tiles)
    ];

    for (const suit of suits) {
      if (
        !melds.every(
          m => m.tiles.every(t => t.suit === suit)
        )
      ) {
        continue;
      }

      const count = all.filter(
        t => t.suit === suit
      ).length;

      if (count >= 8) {
        score += Math.min(13, count);
      }
    }
  }

  return score;
}
