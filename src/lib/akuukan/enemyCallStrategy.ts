import type {
  GameState,
  Meld,
  PlayerState,
  Tile,
  NumberSuit,
  Wind
} from "../mahjong/types";
import {
  isEnemyAbilityEnabled
} from "./winningEvaluationEnemyAbilityAdjustments";

export interface EnemyCallStrategy {
  enemy: 4 | 5 | 8;
  targetSuit?: NumberSuit;
  openRiichi: boolean;
  stealPoints: number;
  redMelds: boolean;
  threatened: boolean;
  liveWallCount: number;
}

export function getEnemyCallStrategy(
  state: GameState,
  player: PlayerState
): EnemyCallStrategy | undefined {
  const a = state.akuukan;
  if (!a || player.seat !== 2) return undefined;

  const enabled = (
    id: Parameters<typeof isEnemyAbilityEnabled>[1]
  ) => isEnemyAbilityEnabled(a, id);

  const id = a.setup.enemyId;

  const enemy =
    id === "enemy-4" && enabled("E-12") ? 4
    : id === "enemy-5" && (enabled("E-5") || enabled("E-14")) ? 5
    : id === "enemy-8" && enabled("E-15") ? 8
    : null;

  if (enemy === null) return undefined;

  return {
    enemy,
    targetSuit:
      enemy === 5 && enabled("E-5")
        ? a.e5TargetSuit
        : undefined,
    openRiichi:
      enemy === 5
      && enabled("E-14")
      && player.score >= 1000
      && state.round.liveWall.length >= 4,
    stealPoints:
      enemy === 4
        ? state.round.players.reduce(
            (sum, other) => sum + (
              other.seat === player.seat
                ? 0
                : Math.max(0, Math.min(1000, other.score))
            ),
            0
          )
        : 0,
    redMelds: enemy === 8,
    threatened: state.round.players.some(
      other =>
        other.seat !== player.seat
        && other.riichi
        && !(
          enemy === 8
          && other.seat === 0
          && enabled("E-13")
        )
    ),
    liveWallCount: state.round.liveWall.length
  };
}

interface Position {
  kind: "chi" | "pon" | "openKan";
  hand: readonly Tile[];
  melds: readonly Meld[];
  calledTile: Tile;
  discardedTile?: Tile;
  shantenBefore: number;
  shantenAfter: number;
  reliableYaku: boolean;
  seatWind: Wind;
  prevailingWind: Wind;
}

const WINDS = {
  east: 1,
  south: 2,
  west: 3,
  north: 4
};

function valueHonor(tile: Tile, p: Position): boolean {
  return tile.suit === "honor" && (
    tile.rank >= 5
    || tile.rank === WINDS[p.seatWind]
    || tile.rank === WINDS[p.prevailingWind]
  );
}

// 役牌・タンヤオに加え、染め手と対々和へ進める形も評価する。
function hasYakuRoute(p: Position): boolean {
  if (p.reliableYaku) return true;

  const all = [
    ...p.hand,
    ...p.melds.flatMap(meld => meld.tiles)
  ];

  const suits = new Set(
    all
      .filter(tile => tile.suit !== "honor")
      .map(tile => tile.suit)
  );

  if (suits.size <= 1) return true;

  const counts = new Map<string, number>();

  for (const tile of p.hand) {
    const key = `${tile.suit}:${tile.rank}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  if (
    p.hand.some(
      tile =>
        valueHonor(tile, p)
        && (counts.get(`${tile.suit}:${tile.rank}`) ?? 0) >= 3
    )
  ) {
    return true;
  }

  return (
    p.melds.every(meld => meld.kind !== "chi")
    && [...counts.values()].filter(count => count >= 2).length
      >= 4 - p.melds.length
  );
}

export function scoreEnemyCall(
  s: EnemyCallStrategy,
  p: Position
): number | null {
  if (
    !Number.isFinite(p.shantenAfter)
    || p.shantenAfter > p.shantenBefore
  ) {
    return null;
  }

  if (
    p.kind === "openKan"
    && (s.liveWallCount <= 8 || s.threatened)
  ) {
    return null;
  }

  if (s.threatened && p.shantenAfter > 1) {
    return null;
  }

  const yaku = hasYakuRoute(p);
  const base =
    -100 * p.shantenAfter
    - (p.discardedTile?.red ? 5 : 0);

  if (s.enemy === 4) {
    if (p.kind === "chi") {
      return (
        yaku
        && p.shantenAfter <= 1
        && p.shantenAfter < p.shantenBefore
      ) ? base : null;
    }

    if (!yaku && s.stealPoints <= 0) return null;

    return base
      + s.stealPoints / 10
      + (valueHonor(p.calledTile, p) ? 20 : 0);
  }

  if (s.enemy === 5) {
    if (
      s.targetSuit
      && p.calledTile.suit !== s.targetSuit
      && !valueHonor(p.calledTile, p)
    ) {
      return null;
    }

    if (!yaku && !s.openRiichi) return null;

    const offSuit = s.targetSuit
      ? p.hand.filter(
          tile =>
            tile.suit !== "honor"
            && tile.suit !== s.targetSuit
        ).length
      : 0;

    return base
      - offSuit * 20
      + (p.calledTile.suit === s.targetSuit ? 30 : 0);
  }

  if (!yaku) return null;

  const newMeld = p.melds[p.melds.length - 1];
  const addedRed = s.redMelds
    ? newMeld.tiles.filter(tile => !tile.red).length
    : 0;

  return base
    + addedRed * 10
    + (valueHonor(p.calledTile, p) ? 20 : 0);
}
