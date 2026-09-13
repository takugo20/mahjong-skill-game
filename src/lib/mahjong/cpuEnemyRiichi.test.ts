import { expect, it } from "vitest";
import {
  createInitialGameState,
  createPlayerDiscardProgression
} from "./engine";
import { chooseCpuRiichi } from "./cpuRiichi";
import { createCpuDiscardInput } from "./cpuDiscard";
import {
  chooseEnemyRiichi,
  shouldEnemyStayDamaten
} from "../akuukan/enemyRiichiStrategy";
import type { EnemyId } from "../akuukan/types";
import type { PlayerState, Tile, TileSuit } from "./types";

let serial = 0;

function t(suit: TileSuit, rank: number): Tile {
  return {
    id: `riichi-strategy-${++serial}`,
    suit,
    rank,
    red: false
  };
}

function ts(suit: TileSuit, ranks: number[]) {
  return ranks.map(rank => t(suit, rank));
}

function discard(
  player: PlayerState,
  tile: Tile,
  faceDown = false
) {
  player.discards.push({
    tile,
    faceDown,
    called: false,
    tsumogiri: true,
    riichiDeclaration: false
  });
}

function hand() {
  return [
    ...ts("man", [2, 3, 4]),
    ...ts("pin", [2, 3, 4]),
    ...ts("sou", [2, 3, 4, 6, 7, 8]),
    t("man", 8),
    t("pin", 8)
  ];
}

function fixture(enemyId: EnemyId, tiles = hand()) {
  const state = createInitialGameState(
    () => 0.5,
    { enemyId, equippedSkills: [] }
  );
  const player = state.round.players[2];

  Object.assign(player, {
    hand: tiles,
    melds: [],
    discards: [],
    drawnTileId: tiles[tiles.length - 1].id
  });

  const input = () => ({
    player,
    riichiDiscardTileIds: tiles.map(t => t.id),
    doraIndicators: [] as Tile[],
    visibleTiles:
      createCpuDiscardInput(state, player, []).visibleTiles,
    random: () => 0
  });

  const decision = () =>
    chooseEnemyRiichi(state, input())!;

  return { state, player, input, decision };
}

it("敵1は悪形で待機し、他家の立直後は追っかける", () => {
  const a = fixture("enemy-1");

  expect(
    shouldEnemyStayDamaten(a.state, a.player, a.decision(), [])
  ).toBe(true);

  a.state.round.players[1].riichi = true;

  expect(
    shouldEnemyStayDamaten(a.state, a.player, a.decision(), [])
  ).toBe(false);
});

it("敵1は広い待ち・終盤・能力無効時には待機しない", () => {
  const a = fixture("enemy-1", [
    ...ts("man", [2, 3, 4]),
    ...ts("pin", [3, 4, 5, 8, 8]),
    ...ts("sou", [2, 3, 4, 6, 7]),
    t("honor", 1)
  ]);

  expect(a.decision().waitTileTypes.length)
    .toBeGreaterThanOrEqual(2);

  expect(
    shouldEnemyStayDamaten(a.state, a.player, a.decision(), [])
  ).toBe(false);

  const b = fixture("enemy-1");
  b.state.round.liveWall = b.state.round.liveWall.slice(0, 8);

  expect(
    shouldEnemyStayDamaten(b.state, b.player, b.decision(), [])
  ).toBe(false);

  b.state.akuukan!.disabledSources.push("enemy-ability:E-2");

  expect(
    shouldEnemyStayDamaten(b.state, b.player, b.decision(), [])
  ).toBe(false);
});

it("敵12は他家の直前の捨て牌を待つ候補を優先する", () => {
  const a = fixture("enemy-12");
  discard(a.state.round.players[1], t("pin", 8));
  a.state.round.players[1].riichi = true;

  expect(a.decision().waitTileTypes)
    .toContainEqual({ suit: "pin", rank: 8 });

  expect(
    shouldEnemyStayDamaten(a.state, a.player, a.decision(), [])
  ).toBe(false);

  const indicators = [
    t("pin", 1),
    t("man", 1),
    t("sou", 1)
  ];

  expect(
    shouldEnemyStayDamaten(
      a.state, a.player, a.decision(), indicators
    )
  ).toBe(true);
});

it("敵12は裏向き・見え切り・フリテンの牌を再捨て狙いに使わない", () => {
  const a = fixture("enemy-12");
  const other = a.state.round.players[1];
  other.riichi = true;
  discard(other, t("pin", 8), true);

  const indicators = [
    t("pin", 1),
    t("man", 1),
    t("sou", 1)
  ];

  expect(
    shouldEnemyStayDamaten(
      a.state, a.player, a.decision(), indicators
    )
  ).toBe(false);

  other.discards[0].faceDown = false;
  const target = a.decision();

  a.player.temporaryFuriten = true;
  expect(
    shouldEnemyStayDamaten(
      a.state, a.player, target, indicators
    )
  ).toBe(false);

  a.player.temporaryFuriten = false;
  discard(a.player, t("pin", 8));
  expect(
    shouldEnemyStayDamaten(
      a.state, a.player, target, indicators
    )
  ).toBe(false);

  a.player.discards = [];
  discard(other, t("pin", 8));
  discard(other, t("pin", 8));
  expect(
    shouldEnemyStayDamaten(
      a.state, a.player, target, indicators
    )
  ).toBe(false);
});

it("敵12は立直していない相手・能力無効時には基本の立直を維持する", () => {
  const a = fixture("enemy-12");
  discard(a.state.round.players[1], t("pin", 8));

  const indicators = [
    t("pin", 1),
    t("man", 1),
    t("sou", 1)
  ];

  expect(
    shouldEnemyStayDamaten(
      a.state, a.player, a.decision(), indicators
    )
  ).toBe(false);

  a.state.akuukan!.disabledSources.push("enemy-ability:E-23");

  expect(a.decision()).toEqual(chooseCpuRiichi(a.input()));
});

it("敵12の判断は隠れた山や他家手牌を変更しても変わらない", () => {
  const a = fixture("enemy-12");
  discard(a.state.round.players[1], t("pin", 8));

  const before = a.decision();
  a.state.round.players[1].hand = ts("pin", [8, 8, 8]);
  a.state.round.liveWall = ts("pin", [8, 8, 8]);

  expect(a.decision()).toEqual(before);
});

it("敵2の一向聴立直は90%の境界を維持する", () => {
  const a = fixture("enemy-2", [
    ...ts("man", [1, 2, 3, 5]),
    ...ts("pin", [1, 2, 3, 9]),
    ...ts("sou", [1, 2, 3]),
    ...ts("honor", [1, 1, 2])
  ]);

  const input = {
    ...a.input(),
    allowNotenRiichi: true
  };

  expect(
    chooseEnemyRiichi(
      a.state,
      { ...input, random: () => 0.89 }
    )?.shanten
  ).toBe(1);

  expect(
    chooseEnemyRiichi(
      a.state,
      { ...input, random: () => 0.9 }
    )
  ).toBeNull();
});

it("実際の敵1の手番でも、先制悪形は待機して追っかけでは立直する", () => {
  for (const chasing of [false, true]) {
    const a = fixture("enemy-1");
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

    a.state.round.players[3].riichi = chasing;

    const draw = a.player.hand.pop()!;
    a.player.drawnTileId = null;

    a.state.round.liveWall = [
      t("honor", 6),
      draw,
      ...ts("honor", [6, 6, 6, 2, 2, 2, 2, 3, 3, 3])
    ];

    const result = createPlayerDiscardProgression(
      a.state,
      discarded.id,
      () => 0.5
    ).finalState;

    expect(result.round.players[2].discards.length)
      .toBeGreaterThan(0);

    expect(result.round.players[2].riichi).toBe(chasing);
  }
});
