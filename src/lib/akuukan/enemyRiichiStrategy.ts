import { chooseEnemyFifteenRiichi, isEnemyFifteenPlannerEnabled, preferEnemyFifteenDamaten } from "./enemyFifteenPlanner";
import {
  getNormalCpuLevel,
  chooseLeveledNormalCpuRiichi
} from "../mahjong/normalCpuLevel";
import { chooseEnemyFourteenRiichi } from "./enemyFourteenRiichi";
import { chooseEnemySixteenLastRoundRiichi } from "./enemySixteenLastRound";
import {
  isEnemySixteenStrategyEnabled,
  preferEnemySixteenDamaten
} from "./enemySixteenStrategy";
import { chooseCpuRiichi } from "../mahjong/cpuRiichi";
import type {
  CpuRiichiDecision,
  CpuRiichiDecisionInput
} from "../mahjong/cpuRiichi";
import type {
  GameState,
  PlayerState,
  Tile
} from "../mahjong/types";
import { evaluateWinningHand } from "../mahjong/winning";
import { createCpuDiscardInput } from "../mahjong/cpuDiscard";
import { preferEnemyDamaten } from "./enemySpeedStrategy";
import { isEnemyAbilityEnabled } from "./winningEvaluationEnemyAbilityAdjustments";

function same(
  a: Pick<Tile, "suit" | "rank">,
  b: Pick<Tile, "suit" | "rank">
): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

function enabled(
  state: GameState,
  player: PlayerState,
  enemy: 1 | 12
): boolean {
  const a = state.akuukan;

  return !!a
    && player.seat === 2
    && a.setup.enemyId === `enemy-${enemy}`
    && isEnemyAbilityEnabled(
      a,
      enemy === 1 ? "E-2" : "E-23"
    );
}

function repeatTargets(
  state: GameState,
  player: PlayerState,
  decision: CpuRiichiDecision,
  indicators: readonly Tile[]
): { tile: Tile; riichi: boolean }[] {
  if (
    !enabled(state, player, 12)
    || decision.shanten !== 0
    || player.temporaryFuriten
    || player.riichiFuriten
  ) {
    return [];
  }

  // 今回捨てる牌も含めてフリテンを確認する。
  const ownDiscards = [
    ...player.discards.map(d => d.tile),
    ...player.hand.filter(
      t => t.id === decision.discardTileId
    )
  ];

  if (
    decision.waitTileTypes.some(
      wait => ownDiscards.some(t => same(t, wait))
    )
  ) {
    return [];
  }

  const visible = createCpuDiscardInput(
    state,
    player,
    indicators
  ).visibleTiles;

  const known = [
    ...new Map(
      [...visible, ...indicators].map(t => [t.id, t])
    ).values()
  ];

  return state.round.players.flatMap(other => {
    if (other.seat === player.seat) return [];

    const last =
      other.discards[other.discards.length - 1];

    if (
      !last
      || last.faceDown
      || !visible.some(t => t.id === last.tile.id)
    ) {
      return [];
    }

    if (
      !decision.waitTileTypes.some(
        wait => same(wait, last.tile)
      )
    ) {
      return [];
    }

    if (
      known.filter(t => same(t, last.tile)).length >= 4
    ) {
      return [];
    }

    return [{
      tile: last.tile,
      riichi: other.riichi
    }];
  });
}

export function chooseEnemyRiichi(
  state: GameState,
  input: CpuRiichiDecisionInput
): CpuRiichiDecision | null {
  if (getNormalCpuLevel(state, input.player.seat) < 4) {
    return chooseLeveledNormalCpuRiichi(state, input);
  }

  if (isEnemyFifteenPlannerEnabled(state, input.player)) {
    return chooseEnemyFifteenRiichi(state, input);
  }

  const standard = chooseCpuRiichi(input);

  const fourteen = chooseEnemyFourteenRiichi(
    state,
    input,
    standard
  );

  if (fourteen) return fourteen;
  
  if (
    standard
    && isEnemySixteenStrategyEnabled(state, input.player)
  ) {
    return chooseEnemySixteenLastRoundRiichi(
      state,
      input,
      standard
    );
  }

  // 敵2のノーテン立直を含め、既存の判断を基本とする。
  if (
    !standard
    || standard.shanten !== 0
    || !enabled(state, input.player, 12)
  ) {
    return standard;
  }

  const score = (decision: CpuRiichiDecision) =>
    decision.remainingWinningTileCount
    + repeatTargets(
      state,
      input.player,
      decision,
      input.doraIndicators
    ).reduce(
      (total, target) =>
        total + (target.riichi ? 4 : 2),
      0
    );

  let best = standard;
  let bestScore = score(best);

  for (const id of input.riichiDiscardTileIds) {
    if (id === standard.discardTileId) continue;

    const candidate = chooseCpuRiichi({
      ...input,
      riichiDiscardTileIds: [id],
      allowNotenRiichi: false
    });

    if (!candidate) continue;

    const candidateScore = score(candidate);

    if (candidateScore > bestScore) {
      best = candidate;
      bestScore = candidateScore;
    }
  }

  return best;
}

export function shouldEnemyStayDamaten(
  state: GameState,
  player: PlayerState,
  decision: CpuRiichiDecision,
  indicators: readonly Tile[]
): boolean {
  if (isEnemyFifteenPlannerEnabled(state, player)) {
    return preferEnemyFifteenDamaten(state, player, decision, indicators);
  }
  if (isEnemySixteenStrategyEnabled(state, player)) {
    return preferEnemySixteenDamaten(
      state,
      player,
      decision,
      indicators
    );
  }
  if (
    enabled(state, player, 1)
    && decision.shanten === 0
  ) {
    const chasing = state.round.players.some(
      other =>
        other.seat !== player.seat && other.riichi
    );

    const broadWait =
      decision.waitTileTypes.length >= 2
      && decision.remainingWinningTileCount >= 4;

    // 終盤は追っかけの機会を待たずに立直する。
    return !chasing
      && !broadWait
      && state.round.liveWall.length > 8;
  }

  if (enabled(state, player, 12)) {
    return repeatTargets(
      state,
      player,
      decision,
      indicators
    ).some(target => {
      if (!target.riichi) return false;

      const winning: Tile = {
        ...target.tile,
        id: "enemy-12-expected-win",
        red: false
      };

      const result = evaluateWinningHand({
        concealedTiles: [
          ...player.hand.filter(
            t => t.id !== decision.discardTileId
          ),
          winning
        ],
        melds: player.melds,
        winningTile: winning,
        winMethod: "ron",
        seatWind: player.seatWind,
        prevailingWind: state.round.prevailingWind,
        doraIndicators: indicators,
        riichi: false,
        doubleRiichi: false,
        ippatsu: false
      });

      return result.valid
        && result.best.score.basePoints >= 2000;
    });
  }

  return preferEnemyDamaten(state, player, decision);
}
