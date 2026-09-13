import { expect, it } from "vitest";
import {
  createInitialGameState,
  canPlayerTsumo,
  canPlayerRon,
  declarePlayerTsumo,
  declarePlayerRon,
  discardTile,
  createPlayerDiscardProgression,
  createPlayerReactionSkipProgression,
  drawTile,
  startNextRound
} from "./engine";
import { calculateShanten } from "./hand";
import type { GameState } from "./types";
import type { EnemyId } from "../akuukan/types";

function seededRandom(initial: number) {
  let seed = initial >>> 0;

  return () => {
    seed = (
      Math.imul(seed, 1664525) + 1013904223
    ) >>> 0;

    return seed / 4294967296;
  };
}

function checkState(state: GameState) {
  const r = state.round;

  expect(r.players).toHaveLength(4);

  expect(
    r.players.every(p => Number.isInteger(p.score))
  ).toBe(true);

  expect(
    r.players.reduce(
      (sum, p) => sum + p.score,
      r.riichiPool
    )
  ).toBe(100000);

  expect(r.kanCount).toBeGreaterThanOrEqual(0);
  expect(r.kanCount).toBeLessThanOrEqual(4);

  if (
    r.phase === "roundEnd"
    || r.phase === "matchEnd"
  ) {
    return;
  }

  const owned = r.players.flatMap(p => [
    ...p.hand,
    ...p.melds.flatMap(m => m.tiles)
  ]);

  expect(
    new Set(owned.map(t => t.id)).size
  ).toBe(owned.length);

  for (const p of r.players) {
    expect([13, 14]).toContain(
      p.hand.length + p.melds.length * 3
    );

    if (p.drawnTileId) {
      expect(
        p.hand.some(t => t.id === p.drawnTileId)
      ).toBe(true);
    }
  }
}

function playRound(
  initial: GameState,
  random: () => number
): GameState {
  let state = initial;

  for (let step = 0; step < 300; step++) {
    checkState(state);
    const r = state.round;

    if (
      r.phase === "roundEnd"
      || r.phase === "matchEnd"
    ) {
      return state;
    }

    if (canPlayerRon(state)) {
      state = declarePlayerRon(state);
    } else if (r.phase === "reaction") {
      const progress = createPlayerReactionSkipProgression(
        state,
        random
      );

      progress.cpuSteps.forEach(
        s => checkState(s.state)
      );

      state = progress.finalState;
    } else if (r.phase === "drawing") {
      expect(r.currentSeat).toBe(0);
      state = drawTile(state, 0, random);
    } else {
      expect(r.phase).toBe("discarding");
      expect(r.currentSeat).toBe(0);

      if (canPlayerTsumo(state)) {
        state = declarePlayerTsumo(state);
        continue;
      }

      const player = r.players[0];

      // プレイヤー役は鳴かず、
      // 合法な打牌から最小向聴を選ぶ。
      const legal = player.hand.filter(
        t => discardTile(
          state,
          t.id,
          false,
          () => 0.5
        ).round.players[0].hand.length
          === player.hand.length - 1
      ).map(tile => ({
        tile,
        shanten: calculateShanten(
          player.hand.filter(t => t.id !== tile.id),
          player.melds
        ).minimum
      }));

      expect(legal.length).toBeGreaterThan(0);

      const minimum = Math.min(
        ...legal.map(c => c.shanten)
      );

      const best = legal.filter(
        c => c.shanten === minimum
      );

      const chosen = best[
        Math.floor(random() * best.length)
      ].tile;

      const progress = createPlayerDiscardProgression(
        state,
        chosen.id,
        random
      );

      progress.cpuSteps.forEach(
        s => checkState(s.state)
      );

      state = progress.finalState;
    }
  }

  throw new Error(
    `300操作以内に終局しませんでした: ${state.notice}`
  );
}

for (let enemy = 1; enemy <= 16; enemy++) {
  it(
    `敵${enemy}: 半荘終了までの進行と最終順位`,
    () => {
      const random = seededRandom(
        enemy * 1000 + 17
      );

      let state = createInitialGameState(random, {
        enemyId: `enemy-${enemy}` as EnemyId,
        equippedSkills: []
      });

      // 固定乱数のテストが停止しない場合に検知する上限。
      // ゲーム本体の連荘回数は制限しない。
      for (let round = 0; round < 40; round++) {
        state = playRound(state, random);

        expect(["roundEnd", "matchEnd"]).toContain(
          state.round.phase
        );

        if (state.round.phase === "matchEnd") {
          break;
        }

        state = startNextRound(state, random);
      }

      expect(state.round.phase).toBe("matchEnd");
      checkState(state);

      expect(state.matchResult).not.toBeNull();

      const rankings = state.matchResult!.rankings;

      expect(rankings).toHaveLength(4);

      expect(
        rankings.map(r => r.rank)
      ).toEqual([1, 2, 3, 4]);

      expect(
        new Set(rankings.map(r => r.seat)).size
      ).toBe(4);

      expect(
        rankings.reduce(
          (sum, r) => sum + r.finalPoints,
          0
        )
      ).toBe(100000);

      for (let i = 0; i < rankings.length; i++) {
        const result = rankings[i];

        expect(result.finalPoints).toBe(
          state.round.players[result.seat].score
        );

        if (i > 0) {
          expect(
            rankings[i - 1].finalPoints
          ).toBeGreaterThanOrEqual(
            result.finalPoints
          );
        }
      }
    },
    120000
  );
}
