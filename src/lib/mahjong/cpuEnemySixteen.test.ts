import { expect, it } from "vitest";
import {
  createInitialGameState,
  createPlayerDiscardProgression
} from "./engine";
import { chooseCpuRiichi } from "./cpuRiichi";
import {
  chooseEnemySixteenDiscard,
  getEnemySixteenRank,
  getEnemySixteenForbiddenTileIds,
  preferEnemySixteenDamaten
} from "../akuukan/enemySixteenStrategy";
import {
  shouldEnemyStayDamaten
} from "../akuukan/enemyRiichiStrategy";
import type {
  PlayerState, Tile, TileSuit
} from "./types";

let serial = 0;

function t(suit: TileSuit, rank: number): Tile {
  return {
    id: `sixteen-ai-${++serial}`,
    suit,
    rank,
    red: false
  };
}

function ts(suit: TileSuit, ranks: number[]) {
  return ranks.map(rank => t(suit, rank));
}

function discard(
  p: PlayerState,
  tile: Tile,
  faceDown = false
) {
  p.discards.push({
    tile,
    faceDown,
    called: false,
    tsumogiri: false,
    riichiDeclaration: false
  });
}

function fixture() {
  const state = createInitialGameState(
    () => 0.5,
    { enemyId: "enemy-16", equippedSkills: [] }
  );

  const player = state.round.players[2];

  player.hand = [
    ...ts("man", [2, 3, 4]),
    ...ts("pin", [2, 3, 4]),
    ...ts("sou", [2, 3, 4, 6, 7, 8]),
    t("man", 8),
    t("pin", 8)
  ];
  player.drawnTileId = player.hand[13].id;
  player.melds = [];
  player.discards = [];

  const decision = chooseCpuRiichi({
    player,
    riichiDiscardTileIds: [player.hand[13].id],
    doraIndicators: []
  })!;

  return { state, player, decision };
}

it("同点時は起家からの順番で順位を決める", () => {
  const a = fixture();

  a.state.initialDealerSeat = 0;
  expect(getEnemySixteenRank(a.state, a.player)).toBe(3);

  a.state.initialDealerSeat = 2;
  expect(getEnemySixteenRank(a.state, a.player)).toBe(1);
});

it("首位では立直者全員の現物を優先し、最下位では打牌を制限しない", () => {
  const a = fixture();
  a.player.score = 40000;
  const safe = a.player.hand[0];

  for (const seat of [1, 3] as const) {
    a.state.round.players[seat].riichi = true;
    discard(
      a.state.round.players[seat],
      t(safe.suit, safe.rank)
    );
  }

  const forbidden = getEnemySixteenForbiddenTileIds(
    a.state,
    a.player
  );

  expect(forbidden).not.toContain(safe.id);
  expect(forbidden).toHaveLength(13);

  expect(
    chooseEnemySixteenDiscard(
      a.state, a.player, [], [], () => 0
    )?.id
  ).toBe(safe.id);

  a.player.score = 10000;

  expect(
    getEnemySixteenForbiddenTileIds(a.state, a.player)
  ).toEqual([]);
});

it("裏向き・河拾い済みの牌を現物に数えず、候補も消し切らない", () => {
  const a = fixture();
  a.player.score = 40000;

  const other = a.state.round.players[1];
  other.riichi = true;
  discard(other, t("man", 2), true);

  expect(
    getEnemySixteenForbiddenTileIds(a.state, a.player)
  ).toEqual([]);

  other.discards[0].faceDown = false;
  other.discards[0].removedFromRiver = true;

  expect(
    getEnemySixteenForbiddenTileIds(a.state, a.player)
  ).toEqual([]);
});

it("序盤の安い単騎は待機し、高打点・最下位・他家立直では立直を選ぶ", () => {
  const a = fixture();

  expect(
    shouldEnemyStayDamaten(
      a.state, a.player, a.decision, []
    )
  ).toBe(true);

  expect(
    preferEnemySixteenDamaten(
      a.state,
      a.player,
      a.decision,
      [t("man", 1), t("pin", 1), t("sou", 1)]
    )
  ).toBe(false);

  a.player.score = 10000;

  expect(
    preferEnemySixteenDamaten(
      a.state, a.player, a.decision, []
    )
  ).toBe(false);

  a.player.score = 25000;
  a.state.round.players[1].riichi = true;

  expect(
    preferEnemySixteenDamaten(
      a.state, a.player, a.decision, []
    )
  ).toBe(false);
});

it("序盤を過ぎたら悪形待機を続けず、能力無効時には適用しない", () => {
  const a = fixture();

  for (let i = 0; i < 6; i++) {
    discard(a.player, t("honor", 7));
  }

  expect(
    preferEnemySixteenDamaten(
      a.state, a.player, a.decision, []
    )
  ).toBe(false);

  a.state.akuukan!.disabledSources.push(
    "enemy-ability:E-29"
  );

  expect(
    chooseEnemySixteenDiscard(a.state, a.player, [])
  ).toBeNull();
});

it("見えない手牌を変えても現物判断は変わらない", () => {
  const a = fixture();
  a.player.score = 40000;
  a.state.round.players[1].riichi = true;
  discard(a.state.round.players[1], t("man", 2));

  const before = getEnemySixteenForbiddenTileIds(
    a.state,
    a.player
  );

  a.state.round.players[1].hand =
    ts("honor", [1, 1, 1, 2, 2, 2]);

  expect(
    getEnemySixteenForbiddenTileIds(a.state, a.player)
  ).toEqual(before);
});

it("最下位では赤ドラ保持より受け入れの多さを優先する", () => {
  const a = fixture();
  const east = t("honor", 1);
  const south = t("honor", 2);
  east.red = true;

  a.player.hand = [
    ...ts("man", [1, 2, 3]),
    ...ts("pin", [1, 2, 3]),
    ...ts("sou", [1, 2, 3, 7, 8, 9]),
    east,
    south
  ];

  discard(a.state.round.players[0], t("honor", 1));
  discard(a.state.round.players[0], t("honor", 1));

  expect(
    chooseEnemySixteenDiscard(
      a.state, a.player, [], [], () => 0
    )?.id
  ).toBe(south.id);

  a.player.score = 10000;

  expect(
    chooseEnemySixteenDiscard(
      a.state, a.player, [], [], () => 0
    )?.id
  ).toBe(east.id);
});

it("実際の首位の手番でも現物を捨て、危険な立直を見送る", () => {
  const a = fixture();
  a.player.score = 40000;

  const first = t("honor", 7);
  a.state.round.players[0] = {
    ...a.state.round.players[0],
    hand: [first],
    drawnTileId: first.id
  };

  for (const seat of [1, 3] as const) {
    a.state.round.players[seat] = {
      ...a.state.round.players[seat],
      hand: [],
      drawnTileId: null
    };
  }

  a.state.round.players[3].riichi = true;
  discard(a.state.round.players[3], t("honor", 1));

  a.player.hand = [
    ...ts("man", [1, 2, 3]),
    ...ts("pin", [1, 2, 3]),
    ...ts("sou", [1, 2, 3]),
    ...ts("honor", [1, 1, 2, 2])
  ];
  a.player.drawnTileId = null;

  a.state.round.liveWall = [
    t("honor", 6),
    t("honor", 5),
    ...ts("honor", [3, 3, 3, 4, 4, 4, 6, 6, 6])
  ];

  const result = createPlayerDiscardProgression(
    a.state,
    first.id,
    () => 0.5
  ).finalState;

  expect(result.round.players[2].riichi).toBe(false);

  expect(
    result.round.players[2].discards[0].tile
  ).toMatchObject({
    suit: "honor",
    rank: 1
  });
});
