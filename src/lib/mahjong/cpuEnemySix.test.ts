import { expect, it } from "vitest";
import {
  createInitialGameState,
  createPlayerDiscardProgression
} from "./engine";
import {
  evaluateEnemySixDiscards,
  getEnemySixForbiddenTileIds
} from "../akuukan/enemySixDefense";
import type { Tile, TileSuit } from "./types";

let serial = 0;

function t(
  suit: TileSuit,
  rank: number,
  red = false
): Tile {
  return {
    id: `six-ai-${++serial}`,
    suit,
    rank,
    red
  };
}

function ts(suit: TileSuit, ranks: number[]) {
  return ranks.map(rank => t(suit, rank));
}

function ready(rank = 1) {
  return [
    ...ts("honor", [5, 5, 5]),
    ...ts("man", [1, 2, 3]),
    ...ts("pin", [4, 5, 6]),
    ...ts("sou", [7, 8, 9]),
    t("honor", rank)
  ];
}

function fixture() {
  const state = createInitialGameState(
    () => 0.5,
    { enemyId: "enemy-6", equippedSkills: [] }
  );

  for (const p of state.round.players) {
    Object.assign(p, {
      hand: [],
      melds: [],
      discards: [],
      drawnTileId: null
    });
  }

  const player = state.round.players[2];
  player.hand = ts("honor", [1, 2]);
  state.round.players[1].hand = ready();

  const risks = () =>
    evaluateEnemySixDiscards(state, player, [])!;

  const forbidden = () =>
    getEnemySixForbiddenTileIds(state, player, []);

  return { state, player, risks, forbidden };
}

it("敵6は役のある当たり牌を避け、全員に安全な牌を残す", () => {
  const a = fixture();

  expect(a.risks().map(r => r.ronCount))
    .toEqual([1, 0]);

  expect(a.forbidden())
    .toEqual([a.player.hand[0].id]);
});

it("フリテンと役なしの形はロン可能と判定しない", () => {
  const a = fixture();
  const opponent = a.state.round.players[1];

  opponent.temporaryFuriten = true;
  expect(a.forbidden()).toEqual([]);

  opponent.temporaryFuriten = false;
  opponent.discards = [{
    tile: t("honor", 1),
    faceDown: false,
    called: false,
    tsumogiri: false,
    riichiDeclaration: false
  }];

  expect(a.forbidden()).toEqual([]);

  opponent.discards = [];
  opponent.hand = [
    ...ts("man", [1, 2, 3]),
    ...ts("pin", [1, 2, 3]),
    ...ts("sou", [4, 5, 6, 7, 8, 9]),
    t("honor", 1)
  ];

  expect(a.forbidden()).toEqual([]);

  opponent.riichi = true;

  expect(a.forbidden())
    .toEqual([a.player.hand[0].id]);
});

it("安全牌がなければ予想支払額が少ない牌を選べるようにする", () => {
  const a = fixture();
  a.state.round.players[3].hand = ready(2);
  a.state.round.players[3].riichi = true;

  const risks = a.risks();

  expect(risks[0].estimatedLoss)
    .toBeLessThan(risks[1].estimatedLoss);

  expect(a.forbidden())
    .toEqual([a.player.hand[1].id]);
});

it("ダブロンは合算し、三家和は安全牌と区別する", () => {
  const a = fixture();
  a.state.round.players[3].hand = ready();

  const double = a.risks()[0];
  expect(double.ronCount).toBe(2);

  a.state.round.players[0].hand = ready();

  expect(a.risks()[0]).toMatchObject({
    ronCount: 3,
    estimatedLoss: 0
  });

  expect(a.forbidden())
    .toEqual([a.player.hand[0].id]);
});

it("裏ドラや山の中身を見ず、元の対局状態を変更しない", () => {
  const a = fixture();
  a.state.round.players[1].riichi = true;

  const before = JSON.stringify(a.state);
  const risks = a.risks();

  expect(JSON.stringify(a.state)).toBe(before);

  a.state.round.deadWall[5] = t("honor", 7);
  a.state.round.liveWall =
    a.state.round.liveWall.map(() => t("honor", 1));

  expect(a.risks()).toEqual(risks);
});

it("通常CPUと能力無効時には適用せず、禁止牌も維持する", () => {
  const a = fixture();
  const safe = a.player.hand[1].id;

  expect(
    getEnemySixForbiddenTileIds(
      a.state, a.player, [], [safe]
    )
  ).toEqual([safe]);

  expect(
    evaluateEnemySixDiscards(
      a.state, a.state.round.players[1], []
    )
  ).toBeNull();

  a.state.akuukan!.disabledSources.push(
    "enemy-ability:E-10"
  );

  expect(a.risks()).toBeNull();
});

it("実際の手番でも危険な立直を見送り、安全な牌を捨てる", () => {
  const a = fixture();
  const first = t("honor", 7);

  a.state.round.players[0].hand = [first];
  a.state.round.players[0].drawnTileId = first.id;
  a.state.round.players[1].hand = [];

  a.state.round.players[3].hand = [
    ...ts("man", [1, 2, 3]),
    ...ts("pin", [4, 5, 6]),
    ...ts("sou", [1, 2, 3, 7, 8, 9]),
    t("honor", 5)
  ];
  a.state.round.players[3].riichi = true;

  a.player.hand = [
    ...ts("man", [1, 2, 3]),
    ...ts("pin", [1, 2, 3]),
    ...ts("sou", [1, 2, 3]),
    ...ts("honor", [1, 1, 2, 2])
  ];

  const danger = t("honor", 5);

  a.state.round.liveWall = [
    t("honor", 6),
    danger,
    ...ts("honor", [6, 6, 6, 2, 2, 2, 3, 3, 3])
  ];

  const result = createPlayerDiscardProgression(
    a.state,
    first.id,
    () => 0.5
  ).finalState;

  expect(result.round.players[2].riichi).toBe(false);

  expect(result.round.players[2].discards.length)
    .toBeGreaterThan(0);

  expect(result.round.players[2].discards[0].tile.id)
    .not.toBe(danger.id);
});
