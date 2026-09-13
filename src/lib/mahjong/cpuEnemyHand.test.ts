import { expect, it } from "vitest";
import { createInitialGameState } from "./engine";
import {
  createCpuDiscardInput,
  chooseStrategicCpuDiscard,
  evaluateCpuDiscards
} from "./cpuDiscard";
import {
  scoreEnemyHand,
  selectEnemyHandCandidates
} from "../akuukan/enemyHandStrategy";
import type { EnemyId } from "../akuukan/types";
import type { Tile, TileSuit } from "./types";

let serial = 0;

function t(suit: TileSuit, rank: number): Tile {
  return {
    id: `hand-ai-${++serial}`,
    suit,
    rank,
    red: false
  };
}

function ts(suit: TileSuit, ranks: number[]) {
  return ranks.map(rank => t(suit, rank));
}

function fixture(enemyId: EnemyId, hand: Tile[]) {
  const state = createInitialGameState(
    () => 0.5,
    { enemyId, equippedSkills: [] }
  );
  const player = state.round.players[2];

  Object.assign(player, {
    hand,
    melds: [],
    discards: [],
    drawnTileId: hand[hand.length - 1].id
  });

  const input = () =>
    createCpuDiscardInput(state, player, []);

  return { state, player, input };
}

function sample() {
  return [
    ...ts("man", [2, 3, 4]),
    ...ts("pin", [2, 3, 4]),
    ...ts("sou", [2, 3, 4, 6, 7]),
    ...ts("honor", [1, 1, 5])
  ];
}

it("敵3は前回タンヤオなら中張牌を、前回白なら白の対子を高く評価する", () => {
  const tiles = [
    ...ts("man", [2, 3, 4]),
    ...ts("pin", [2, 3, 4]),
    ...ts("sou", [2, 3, 4, 6, 7, 8]),
    ...ts("honor", [5, 5])
  ];
  const a = fixture("enemy-3", tiles);

  a.state.akuukan!.e6LastWinningNormalYakuIds = ["tanyao"];
  let plan = a.input().handPlan;

  expect(scoreEnemyHand(plan, a.player, tiles[13]))
    .toBeGreaterThan(scoreEnemyHand(plan, a.player, tiles[0]));

  a.state.akuukan!.e6LastWinningNormalYakuIds = ["yakuhaiWhite"];
  plan = a.input().handPlan;

  expect(scoreEnemyHand(plan, a.player, tiles[0]))
    .toBeGreaterThan(scoreEnemyHand(plan, a.player, tiles[13]));
});

it("敵3の役志向でも聴牌を捨てて遠回りしない", () => {
  const a = fixture("enemy-3", sample());
  a.state.akuukan!.e6LastWinningNormalYakuIds = [
    "honitsu", "yakuhaiWhite"
  ];

  const evaluated = evaluateCpuDiscards(a.input());
  expect(evaluated.length).toBeGreaterThan(0);
  expect(evaluated.every(c => c.shanten === 0)).toBe(true);
});

it("敵7は孤立風牌を残すため一向聴分まで遅さを許す", () => {
  const a = fixture("enemy-7", sample());
  const wind = t("honor", 3);
  const number = t("man", 9);
  a.player.hand = [wind, number];

  const candidates = [
    { tile: wind, shape: { shanten: 1 } },
    { tile: number, shape: { shanten: 2 } }
  ];

  expect(
    selectEnemyHandCandidates(
      a.input().handPlan, a.player, candidates, []
    ).map(c => c.tile.id)
  ).toEqual([number.id]);

  candidates[1].shape.shanten = 3;

  expect(
    selectEnemyHandCandidates(
      a.input().handPlan, a.player, candidates, []
    ).map(c => c.tile.id)
  ).toEqual([wind.id]);
});

it("敵7でも聴牌・終盤・風牌が見え切った場合は通常の速度に戻る", () => {
  const a = fixture("enemy-7", sample());
  const wind = t("honor", 3);
  const number = t("man", 9);
  a.player.hand = [wind, number];

  const candidates = [
    { tile: wind, shape: { shanten: 0 } },
    { tile: number, shape: { shanten: 1 } }
  ];

  expect(
    selectEnemyHandCandidates(
      a.input().handPlan, a.player, candidates, []
    )[0].tile.id
  ).toBe(wind.id);

  candidates[0].shape.shanten = 1;
  candidates[1].shape.shanten = 2;

  const exposed = ts("honor", [3, 3, 3]);

  expect(
    selectEnemyHandCandidates(
      a.input().handPlan, a.player, candidates, exposed
    )[0].tile.id
  ).toBe(wind.id);

  a.state.round.liveWall = a.state.round.liveWall.slice(0, 16);

  expect(
    selectEnemyHandCandidates(
      a.input().handPlan, a.player, candidates, []
    )[0].tile.id
  ).toBe(wind.id);
});

it("敵7は候補を全て消さず、禁止牌を捨てない", () => {
  const a = fixture("enemy-7", sample());
  const input = a.input();
  const allowed = a.player.hand[0];

  input.forbiddenTileIds =
    a.player.hand.slice(1).map(t => t.id);

  expect(chooseStrategicCpuDiscard(input).id)
    .toBe(allowed.id);
});

it("能力無効時と通常CPUには敵3・7の手作り方針を適用しない", () => {
  for (const enemyId of ["enemy-3", "enemy-7"] as const) {
    const a = fixture(enemyId, sample());

    expect(a.input().handPlan).toBeDefined();

    expect(
      createCpuDiscardInput(
        a.state, a.state.round.players[1], []
      ).handPlan
    ).toBeUndefined();

    a.state.akuukan!.disabledSources.push(
      enemyId === "enemy-3"
        ? "enemy-ability:E-6"
        : "enemy-ability:E-11"
    );

    expect(a.input().handPlan).toBeUndefined();
  }
});
