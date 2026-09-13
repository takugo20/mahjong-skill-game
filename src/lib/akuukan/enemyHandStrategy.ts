import { scoreEnemyThreeExtraYaku } from "./enemyThreeYakuPlan";
import type {
  GameState, PlayerState, Tile, Wind
} from "../mahjong/types";
import type { NormalYakuId } from "../mahjong/yaku";
import { isClosedHand } from "../mahjong/yaku";
import { getTileTypeIndex } from "../mahjong/hand";
import { isEnemyAbilityEnabled } from "./winningEvaluationEnemyAbilityAdjustments";

export interface EnemyHandPlan {
  enemy: 3 | 7 | 12;
  previousYaku: readonly NormalYakuId[];
  prevailingWind: Wind;
  early: boolean;
}

export function getEnemyHandPlan(
  state: GameState,
  player: PlayerState
): EnemyHandPlan | undefined {
  const a = state.akuukan;
  if (!a || player.seat !== 2) return undefined;

  const enemy =
    a.setup.enemyId === "enemy-3"
      && isEnemyAbilityEnabled(a, "E-6")
      ? 3
      : a.setup.enemyId === "enemy-7"
        && isEnemyAbilityEnabled(a, "E-11")
        ? 7
        : a.setup.enemyId === "enemy-12"
          && isEnemyAbilityEnabled(a, "E-24")
          ? 12
          : undefined;

  return enemy ? {
    enemy,
    previousYaku: [...(a.e6LastWinningNormalYakuIds ?? [])],
    prevailingWind: state.round.prevailingWind,
    early: state.round.liveWall.length > 16
  } : undefined;
}

function counts(tiles: readonly Tile[]): number[] {
  const result = Array<number>(34).fill(0);
  for (const tile of tiles) {
    result[getTileTypeIndex(tile)] += 1;
  }
  return result;
}

export function selectEnemyHandCandidates<
  T extends {
    tile: Tile;
    shape: { shanten: number };
  }
>(
  plan: EnemyHandPlan | undefined,
  player: PlayerState,
  candidates: T[],
  visible: readonly Tile[]
): T[] {
  const minimum = Math.min(
    ...candidates.map(c => c.shape.shanten)
  );
  const nearest = candidates.filter(
    c => c.shape.shanten === minimum
  );

  if (
    plan?.enemy !== 7
    || !plan.early
    || minimum <= 0
  ) {
    return nearest;
  }

  const own = counts(player.hand);
  const known = counts([
    ...new Map(
      [...player.hand, ...visible].map(t => [t.id, t])
    ).values()
  ]);

  const kept = candidates.filter(({ tile, shape }) => {
    const index = getTileTypeIndex(tile);

    const protectedWind =
      tile.suit === "honor"
      && tile.rank <= 4
      && own[index] <= 3
      && (own[index] >= 3 || known[index] < 4);

    return !protectedWind
      && shape.shanten <= minimum + 1;
  });

  if (!kept.length) return nearest;

  const best = Math.min(
    ...kept.map(c => c.shape.shanten)
  );

  return kept.filter(c => c.shape.shanten === best);
}

export function scoreEnemyHand(
  plan: EnemyHandPlan | undefined,
  player: PlayerState,
  discarded: Tile
): number {
  if (!plan) return 0;

  const hand = player.hand.filter(
    t => t.id !== discarded.id
  );
  const c = counts(hand);
  const all = [
    ...hand,
    ...player.melds.flatMap(m => m.tiles)
  ];
  const closed = isClosedHand(player.melds);
  const winds: Wind[] = [
    "east", "south", "west", "north"
  ];

  const valueRanks = new Set([
    5, 6, 7,
    winds.indexOf(player.seatWind) + 1,
    winds.indexOf(plan.prevailingWind) + 1
  ]);

  const simple = (t: Tile) =>
    t.suit !== "honor" && t.rank >= 2 && t.rank <= 8;

  const majority = Math.max(
    ...["man", "pin", "sou"].map(
      suit => all.filter(t => t.suit === suit).length
    )
  );
  const honors = all.filter(
    t => t.suit === "honor"
  ).length;
  const flush = majority >= 6 ? majority + honors : 0;

  const pairValue = (n: number) =>
    n >= 3 ? 5 : n === 2 ? 3 : 0;

  const valueHonors = [...valueRanks].reduce(
    (sum, rank) => sum + pairValue(c[27 + rank - 1]),
    0
  );

  if (plan.enemy === 7) {
    const windKinds = c.slice(27, 31)
      .filter(n => n > 0).length;

    const windValue = c.slice(27, 31).reduce(
      (sum, n) => sum + Math.min(n, 3) + pairValue(n),
      0
    );

    return (
      plan.early
        ? (windKinds >= 3 ? 4 : 2) * windValue
        : 0
    )
      + c.slice(0, 27).reduce(
        (sum, n) => sum + pairValue(n),
        0
      )
      + valueHonors
      + (windKinds < 3 ? flush : 0);
  }

  const history = new Set(plan.previousYaku);
  const weight = (id: NormalYakuId) =>
    plan.enemy === 12
      ? (
          ["tanyao", "pinfu", "iipeikou"].includes(id)
            ? 2
            : 1
        )
      : history.has(id) ? 3 : history.size === 0 ? 1 : 0;

  const openSimple = player.melds.every(
    m => m.tiles.every(simple)
  );

  let score = weight("tanyao") * (
    openSimple && hand.filter(t => !simple(t)).length <= 3
      ? hand.filter(simple).length
      : 0
  );

  let adjacent = 0;
  let duplicateSequences = 0;

  for (let suit = 0; suit < 3; suit++) {
    for (let rank = 2; rank <= 7; rank++) {
      if (
        c[suit * 9 + rank - 1]
        && c[suit * 9 + rank]
      ) {
        adjacent++;
      }
    }

    for (let rank = 0; rank <= 6; rank++) {
      const n = Math.min(
        ...c.slice(
          suit * 9 + rank,
          suit * 9 + rank + 3
        )
      );
      if (n >= 2) duplicateSequences++;
    }
  }

  if (closed) {
    score += weight("pinfu") * adjacent
      + weight("iipeikou") * duplicateSequences * 4;
  }

  const honorYaku: [NormalYakuId, number][] = [
    ["yakuhaiWhite", 5],
    ["yakuhaiGreen", 6],
    ["yakuhaiRed", 7],
    ["seatWind", winds.indexOf(player.seatWind) + 1],
    ["prevailingWind", winds.indexOf(plan.prevailingWind) + 1]
  ];

  for (const [id, rank] of honorYaku) {
    score += weight(id) * pairValue(c[27 + rank - 1]);
  }

  score += weight("honitsu") * flush;

  score += scoreEnemyThreeExtraYaku(
    plan.enemy === 3 ? plan.previousYaku : [],
    hand,
    player.melds
  );

  return score;
}

