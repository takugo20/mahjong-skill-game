import { expect, it } from "vitest";
import {
  createInitialGameState,
  createPlayerDiscardProgression
} from "./engine";
import { chooseCpuRiichi } from "./cpuRiichi";
import {
  createCpuDiscardInput,
  chooseStrategicCpuDiscard
} from "./cpuDiscard";
import {
  preferEnemyDamaten,
  preserveEnemyDoraTriplet
} from "../akuukan/enemySpeedStrategy";
import { getEnemyCallStrategy } from "../akuukan/enemyCallStrategy";
import { chooseCpuMeldCall } from "./cpuCalls";
import { getMeldCallOptions } from "./calls";
import type { Tile, TileSuit } from "./types";
import type { EnemyId } from "../akuukan/types";

let serial = 0;

function t(suit: TileSuit, rank: number): Tile {
  return { id: `speed-${++serial}`, suit, rank, red: false };
}

function ts(suit: TileSuit, ranks: number[]) {
  return ranks.map(rank => t(suit, rank));
}

function fixture(enemyId: EnemyId, hand: Tile[]) {
  const state = createInitialGameState(() => 0.5, {
    enemyId,
    equippedSkills: []
  });

  state.round.players[2] = {
    ...state.round.players[2],
    hand,
    melds: [],
    discards: [],
    drawnTileId: hand[hand.length - 1].id
  };

  const player = state.round.players[2];
  const decision = chooseCpuRiichi({
    player,
    riichiDiscardTileIds: [hand[hand.length - 1].id],
    doraIndicators: [],
    random: () => 0
  })!;

  return { state, player, decision };
}

function valueHand() {
  return [
    ...ts("honor", [5, 5, 5]),
    ...ts("man", [1, 2, 3]),
    ...ts("pin", [1, 2, 3]),
    ...ts("sou", [1, 2, 3]),
    t("honor", 1),
    t("pin", 9)
  ];
}

function noYakuHand() {
  return [
    ...ts("man", [1, 2, 3, 5, 6, 7]),
    ...ts("pin", [4, 5, 6]),
    ...ts("sou", [7, 8, 9]),
    t("honor", 1),
    t("pin", 9)
  ];
}

it("敵11は役ありなら黙聴、役なしなら立直を維持する", () => {
  const a = fixture("enemy-11", valueHand());
  const b = fixture("enemy-11", noYakuHand());

  expect(a.decision).not.toBeNull();
  expect(
    preferEnemyDamaten(a.state, a.player, a.decision)
  ).toBe(true);
  expect(
    preferEnemyDamaten(b.state, b.player, b.decision)
  ).toBe(false);
});

it("敵10は役あり単騎で黙聴、広い待ちなら立直を優先する", () => {
  const a = fixture("enemy-10", valueHand());

  expect(
    preferEnemyDamaten(a.state, a.player, a.decision)
  ).toBe(true);

  const b = fixture("enemy-10", [
    ...ts("man", [2, 3, 4]),
    ...ts("pin", [3, 4, 5, 8, 8]),
    ...ts("sou", [2, 3, 4, 6, 7]),
    t("honor", 1)
  ]);

  expect(b.decision.waitTileTypes.length).toBeGreaterThanOrEqual(2);
  expect(
    preferEnemyDamaten(b.state, b.player, b.decision)
  ).toBe(false);
});

it("敵14は通常手で立直し、四暗刻単騎では黙聴を選ぶ", () => {
  const a = fixture("enemy-14", valueHand());

  expect(
    preferEnemyDamaten(a.state, a.player, a.decision)
  ).toBe(false);

  const b = fixture("enemy-14", [
    ...ts("honor", [5, 5, 5, 6, 6, 6, 7, 7, 7]),
    ...ts("man", [1, 1, 1]),
    t("sou", 2),
    t("pin", 9)
  ]);

  expect(
    preferEnemyDamaten(b.state, b.player, b.decision)
  ).toBe(true);
});

it("敵9は代替候補があればドラ暗刻を守り、候補を全て消さない", () => {
  const a = fixture("enemy-9", valueHand());
  const dora = a.player.hand[0];
  const extra = a.player.hand[a.player.hand.length - 1];
  const indicators = [t("honor", 7)];

  expect(
    preserveEnemyDoraTriplet(
      a.state,
      a.player,
      [dora.id, extra.id],
      indicators
    )
  ).toEqual([extra.id]);

  expect(
    preserveEnemyDoraTriplet(
      a.state,
      a.player,
      [dora.id],
      indicators
    )
  ).toEqual([dora.id]);

  const input = createCpuDiscardInput(a.state, a.player, indicators);
  expect(input.preserveDoraTriplets).toBe(true);

  const chosen = chooseStrategicCpuDiscard(input, () => 0);
  expect(chosen.suit === "honor" && chosen.rank === 5).toBe(false);
});

it("敵10・11の通常打牌は受け入れを優先し、能力無効時は解除する", () => {
  for (const enemyId of ["enemy-10", "enemy-11"] as const) {
    const a = fixture(enemyId, valueHand());

    expect(
      createCpuDiscardInput(a.state, a.player, []).speedFirst
    ).toBe(true);
    expect(
      createCpuDiscardInput(
        a.state,
        a.state.round.players[1],
        []
      ).speedFirst
    ).toBe(false);
  }

  const a = fixture("enemy-11", valueHand());
  a.state.akuukan!.disabledSources.push("enemy-ability:E-21");

  expect(
    preferEnemyDamaten(a.state, a.player, a.decision)
  ).toBe(false);
  expect(
    createCpuDiscardInput(a.state, a.player, []).speedFirst
  ).toBe(false);
});

it("敵11は同向聴でも役牌ポン、敵9は見送る", () => {
  const hand = [
    ...ts("honor", [5, 5]),
    ...ts("man", [1, 2, 3, 4, 5, 6]),
    ...ts("pin", [7, 8, 9]),
    ...ts("sou", [2, 3])
  ];

  for (const enemyId of ["enemy-9", "enemy-11"] as const) {
    const state = createInitialGameState(() => 0.5, {
      enemyId,
      equippedSkills: []
    });

    const player = {
      ...state.round.players[2],
      hand,
      melds: [],
      discards: []
    };

    const tile = t("honor", 5);
    const result = chooseCpuMeldCall({
      player,
      prevailingWind: "east",
      calledTile: tile,
      strategy: getEnemyCallStrategy(state, player),
      options: getMeldCallOptions({
        callerSeat: 2,
        discarderSeat: 1,
        calledTile: tile,
        concealedTiles: hand,
        callerRiichi: false,
        liveWallTileCount: 40
      })
    });

    expect(result?.option.kind ?? null).toBe(
      enemyId === "enemy-11" ? "pon" : null
    );
  }
});

it("実際の敵11の手番でも、役あり聴牌で立直棒を出さない", () => {
  const a = fixture("enemy-11", valueHand());
  const discarded = t("honor", 7);

  a.state.round.players[0] = {
    ...a.state.round.players[0],
    hand: [discarded],
    drawnTileId: discarded.id
  };

  for (const seat of [1, 3] as const) {
    a.state.round.players[seat] = {
      ...a.state.round.players[seat],
      hand: [],
      drawnTileId: null
    };
  }

  const draw = a.player.hand[a.player.hand.length - 1];

  a.state.round.players[2] = {
    ...a.player,
    hand: a.player.hand.slice(0, -1),
    drawnTileId: null
  };

  a.state.round.liveWall = [
    t("honor", 6),
    draw,
    ...ts("honor", [6, 6, 6, 2, 2, 2, 2, 3])
  ];

  const result = createPlayerDiscardProgression(
    a.state,
    discarded.id,
    () => 0.5
  ).finalState;

  expect(result.round.players[2].discards.length).toBeGreaterThan(0);
  expect(result.round.players[2].riichi).toBe(false);
  expect(result.round.players[2].score).toBe(25000);
});
