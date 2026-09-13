import { expect, it } from "vitest";
import { createInitialGameState } from "./engine";
import {
  createCpuDiscardInput,
  evaluateCpuDiscards,
  chooseStrategicCpuDiscard
} from "./cpuDiscard";
import type { CpuDiscardInput } from "./cpuDiscard";
import type { Tile, TileSuit } from "./types";

let serial = 0;

function tile(
  suit: TileSuit,
  rank: number,
  red = false
): Tile {
  return {
    id: `ai-test-${++serial}`,
    suit,
    rank,
    red
  };
}

function tiles(suit: TileSuit, ranks: number[]): Tile[] {
  return ranks.map(rank => tile(suit, rank));
}

function input(hand: Tile[]): CpuDiscardInput {
  const state = createInitialGameState(() => 0.5);

  return {
    player: {
      ...state.round.players[1],
      hand,
      melds: [],
      discards: []
    },
    doraIndicators: [],
    visibleTiles: [],
    forbiddenTileIds: [],
    tendencies: {
      closedHand: 3,
      calls: 3,
      riichi: 3,
      defense: 3,
      handValue: 3
    }
  };
}

function fourMelds(): Tile[] {
  return [
    ...tiles("man", [1, 2, 3]),
    ...tiles("pin", [1, 2, 3]),
    ...tiles("sou", [1, 2, 3, 7, 8, 9])
  ];
}

it("赤ドラを残すために聴牌を崩さない", () => {
  const extra = tile("honor", 3, true);
  const data = input([
    ...tiles("man", [1, 2, 3]),
    ...tiles("pin", [1, 2, 3]),
    ...tiles("sou", [1, 2, 3]),
    ...tiles("honor", [1, 1, 2, 2]),
    extra
  ]);

  expect(
    chooseStrategicCpuDiscard(data, () => 0).id
  ).toBe(extra.id);
  expect(evaluateCpuDiscards(data)[0].shanten).toBe(0);
});

it("見えている牌を重複計上せず、残り枚数で待ちを比較する", () => {
  const east = tile("honor", 1);
  const south = tile("honor", 2);
  const data = input([...fourMelds(), east, south]);
  const exposed = tiles("honor", [1, 1, 1]);

  data.visibleTiles = [
    ...data.player.hand,
    ...exposed,
    ...exposed
  ];

  const evaluated = evaluateCpuDiscards(data);

  expect(
    evaluated.find(item => item.tile.id === east.id)?.acceptance
  ).toBe(3);
  expect(
    evaluated.find(item => item.tile.id === south.id)?.acceptance
  ).toBe(0);
  expect(
    chooseStrategicCpuDiscard(data, () => 0).id
  ).toBe(east.id);
});

it("打点傾向によって受け入れと赤ドラの選択が変わる", () => {
  const east = tile("honor", 1, true);
  const south = tile("honor", 2);
  const data = input([...fourMelds(), east, south]);

  data.visibleTiles = tiles("honor", [1, 1]);

  const speed = {
    ...data,
    tendencies: {
      ...data.tendencies,
      handValue: 1 as const
    }
  };
  const value = {
    ...data,
    tendencies: {
      ...data.tendencies,
      handValue: 5 as const
    }
  };

  expect(
    chooseStrategicCpuDiscard(speed, () => 0).id
  ).toBe(east.id);
  expect(
    chooseStrategicCpuDiscard(value, () => 0).id
  ).toBe(south.id);
});

it("禁止牌を捨てず、選択で手牌を変更しない", () => {
  const data = input([
    ...fourMelds(),
    ...tiles("honor", [1, 2])
  ]);
  const allowed = data.player.hand[0];

  data.forbiddenTileIds = data.player.hand
    .slice(1)
    .map(item => item.id);

  const before = JSON.stringify(data);

  expect(
    chooseStrategicCpuDiscard(data, () => 0).id
  ).toBe(allowed.id);
  expect(JSON.stringify(data)).toBe(before);

  expect(() => chooseStrategicCpuDiscard({
    ...data,
    forbiddenTileIds: data.player.hand.map(item => item.id)
  })).toThrow("CPUに捨てられる牌がありません。");
});

it("固有敵だけにREADMEの傾向を渡し、他家の伏せ牌を渡さない", () => {
  const state = createInitialGameState(() => 0.5, {
    enemyId: "enemy-11",
    equippedSkills: []
  });
  const hidden = tile("honor", 7);

  state.round.players[0].discards = [{
    tile: hidden,
    faceDown: true,
    called: false,
    tsumogiri: false,
    riichiDeclaration: false
  }];

  const enemy = createCpuDiscardInput(
    state,
    state.round.players[2],
    []
  );
  const normal = createCpuDiscardInput(
    state,
    state.round.players[1],
    []
  );

  expect(enemy.tendencies.handValue).toBe(1);
  expect(normal.tendencies.handValue).toBe(3);
  expect(
    enemy.visibleTiles.some(item => item.id === hidden.id)
  ).toBe(false);
  expect(
    enemy.visibleTiles.some(
      item => item.id === state.round.players[0].hand[0].id
    )
  ).toBe(false);
});

it("敵6には能力で見える他家の手牌を渡す", () => {
  const state = createInitialGameState(() => 0.5, {
    enemyId: "enemy-6",
    equippedSkills: []
  });

  const data = createCpuDiscardInput(
    state,
    state.round.players[2],
    []
  );

  expect(
    data.visibleTiles.some(
      item => item.id === state.round.players[0].hand[0].id
    )
  ).toBe(true);
  expect(
    data.visibleTiles.some(
      item => item.id === state.round.liveWall[0].id
    )
  ).toBe(false);
});
