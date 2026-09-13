import type {
  GameState, PlayerState, Tile, Meld
} from "../mahjong/types";
import { getWinningTileTypes } from "../mahjong/hand";
import { evaluateWinningHand } from "../mahjong/winning";
import { createCpuDiscardInput } from "../mahjong/cpuDiscard";
import { chooseCpuSelfKan } from "../mahjong/cpuKan";
import type {
  CpuSelfKanDecisionInput
} from "../mahjong/cpuKan";
import type {
  EnemyCallStrategy, Position
} from "./enemyCallStrategy";
import { hasAkuukanEffectInstance } from "./state";
import { isEnemyAbilityEnabled } from "./winningEvaluationEnemyAbilityAdjustments";

export interface SelectiveCallContext {
  hand: readonly Tile[];
  melds: readonly Meld[];
  known: readonly Tile[];
  rank: number;
  canRiichi: boolean;
  safeDiscardIds: readonly string[];
}

export function getSelectiveCallContext(
  state: GameState,
  player: PlayerState
): SelectiveCallContext {
  const order = (seat: number) =>
    (seat - state.initialDealerSeat + 4) % 4;

  const threats = state.round.players.filter(
    p => p.seat !== player.seat && p.riichi
  );

  return {
    hand: player.hand,
    melds: player.melds,
    known: createCpuDiscardInput(
      state, player, []
    ).visibleTiles,
    rank: [...state.round.players]
      .sort(
        (a, b) =>
          b.score - a.score
          || order(a.seat) - order(b.seat)
      )
      .findIndex(p => p.seat === player.seat) + 1,
    canRiichi:
      player.score >= 1000
      && state.round.liveWall.length >= 4
      && player.melds.every(
        m => m.kind === "closedKan"
      ),
    safeDiscardIds: player.hand.filter(
      t => threats.every(
        p => p.discards.some(
          d =>
            !d.faceDown
            && !d.removedFromRiver
            && d.tile.suit === t.suit
            && d.tile.rank === t.rank
        )
      )
    ).map(t => t.id)
  };
}

function winningCount(
  hand: readonly Tile[],
  melds: readonly Meld[],
  known: readonly Tile[],
  p: Position,
  riichi: boolean
): number {
  return getWinningTileTypes(hand, melds).reduce(
    (sum, wait, index) => {
      const left = Math.max(
        0,
        4 - known.filter(
          t =>
            t.suit === wait.suit
            && t.rank === wait.rank
        ).length
      );

      if (!left) return sum;

      const tile: Tile = {
        ...wait,
        red: false,
        id: `selective-call-${index}`
      };

      const result = evaluateWinningHand({
        concealedTiles: [...hand, tile],
        melds,
        winningTile: tile,
        winMethod: "ron",
        seatWind: p.seatWind,
        prevailingWind: p.prevailingWind,
        riichi
      });

      return sum + (result.valid ? left : 0);
    },
    0
  );
}

export function scoreSelectiveEnemyCall(
  s: EnemyCallStrategy,
  p: Position
): number | null {
  const c = s.selective;

  if (!c || p.shantenAfter > 1) return null;

  if (
    p.kind === "openKan"
    && p.shantenAfter !== 0
  ) {
    return null;
  }

  if (s.threatened && p.shantenAfter !== 0) {
    return null;
  }

  if (
    s.enemy === 16
    && c.rank === 1
    && s.threatened
    && (
      !p.discardedTile
      || !c.safeDiscardIds.includes(p.discardedTile.id)
    )
  ) {
    return null;
  }

  const base =
    -100 * p.shantenAfter
    - (p.discardedTile?.red ? 5 : 0);

  if (p.shantenAfter === 0) {
    const known = [
      ...new Map(
        [...c.known, ...c.hand, p.calledTile]
          .map(t => [t.id, t])
      ).values()
    ];

    const after = winningCount(
      p.hand, p.melds, known, p, false
    );

    if (!after) return null;

    const before = p.shantenBefore === 0
      ? winningCount(
          c.hand, c.melds, known, p, c.canRiichi
        )
      : 0;

    // 大明槓は既に副露した手の聴牌に限定する。
    if (p.kind === "openKan") {
      return c.melds.some(
        m => m.kind !== "closedKan"
      ) && after >= before
        ? base + after
        : null;
    }

    return p.shantenBefore > 0 || after >= before + 2
      ? base + after
      : null;
  }

  if (
    s.enemy === 13
    || s.liveWallCount <= 8
    || !p.reliableYaku
  ) {
    return null;
  }

  const improved = p.shantenAfter < p.shantenBefore;
  const winds = {
    east: 1, south: 2, west: 3, north: 4
  };

  const valueCall =
    p.kind === "pon"
    && p.calledTile.suit === "honor"
    && (
      p.calledTile.rank >= 5
      || p.calledTile.rank === winds[p.seatWind]
      || p.calledTile.rank === winds[p.prevailingWind]
    );

  // 敵16は役牌を確保。
  // 最下位や副露済みなら、一向聴への加速も認める。
  return valueCall
    || (
      improved
      && (
        c.rank === 4
        || c.melds.some(m => m.kind !== "closedKan")
      )
    )
    ? base + (valueCall ? 20 : 0)
    : null;
}

export function chooseSelectiveEnemySelfKan(
  state: GameState,
  input: CpuSelfKanDecisionInput
) {
  const a = state.akuukan;

  if (
    !a
    || input.player.seat !== 2
    || a.setup.enemyId !== "enemy-13"
    || !isEnemyAbilityEnabled(a, "E-25")
  ) {
    return chooseCpuSelfKan(input);
  }

  if (
    state.round.liveWall.length <= 8
    || state.round.players.some(
      p => p.seat !== input.player.seat && p.riichi
    )
  ) {
    return null;
  }

  const first = hasAkuukanEffectInstance(
    a,
    "enemy-ability:E-25:first-normal-action"
  ) && !hasAkuukanEffectInstance(
    a,
    "enemy-ability:E-25:second-normal-action"
  );

  const candidates = input.options.flatMap(option => {
    const d = chooseCpuSelfKan({
      ...input,
      options: [option]
    });

    return d && (first || d.shantenAfter === 0)
      ? [d]
      : [];
  });

  return candidates.sort(
    (a, b) =>
      a.shantenAfter - b.shantenAfter
      || Number(a.option.kind === "addedKan")
        - Number(b.option.kind === "addedKan")
      || a.option.id.localeCompare(b.option.id)
  )[0] ?? null;
}
