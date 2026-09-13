import { expect, it } from "vitest";
import {
  createInitialGameState,
  drawCpuTile
} from "./engine";
import {
  activateAkuukanEffect
} from "../akuukan/state";
import {
  chooseEnemyThirteenDiscard,
  estimateEnemyThirteenCallRisk
} from "../akuukan/enemyThirteenStrategy";
import type { Tile, TileSuit } from "./types";

let serial = 0;

function t(suit: TileSuit, rank: number): Tile {
  return {
    id: `thirteen-ai-${++serial}`,
    suit,
    rank,
    red: false
  };
}

function ts(suit: TileSuit, ranks: number[]) {
  return ranks.map(rank => t(suit, rank));
}

function fixture() {
  const state = createInitialGameState(
    () => 0.5,
    { enemyId: "enemy-13", equippedSkills: [] }
  );

  const player = state.round.players[2];

  player.hand = [
    ...ts("man", [1, 2, 3, 5]),
    ...ts("pin", [1, 2, 3, 9]),
    ...ts("sou", [1, 2, 3]),
    ...ts("honor", [1, 1, 2])
  ];
  player.melds = [];
  player.discards = [];
  player.drawnTileId = player.hand[13].id;

  state.akuukan = activateAkuukanEffect(
    state.akuukan!,
    {
      instanceId:
        "enemy-ability:E-25:first-normal-action",
      sourceId: "enemy-ability:E-25",
      remainingTurns: null
    }
  );

  const choose = () => chooseEnemyThirteenDiscard(
    state,
    player,
    [],
    [],
    () => 0
  )!;

  return { state, player, choose };
}

it("敵13の1回目に適用し、2回目・立直後には適用しない", () => {
  const a = fixture();
  expect(a.choose()).not.toBeNull();

  a.player.riichi = true;
  expect(a.choose()).toBeNull();

  a.player.riichi = false;
  a.state.akuukan = activateAkuukanEffect(
    a.state.akuukan!,
    {
      instanceId:
        "enemy-ability:E-25:second-normal-action",
      sourceId: "enemy-ability:E-25",
      remainingTurns: null
    }
  );

  expect(a.choose()).toBeNull();
});

it("能力無効・山が空・通常CPUの場合には適用しない", () => {
  const a = fixture();

  expect(
    chooseEnemyThirteenDiscard(
      a.state,
      a.state.round.players[1],
      []
    )
  ).toBeNull();

  a.state.akuukan!.disabledSources.push(
    "enemy-ability:E-25"
  );
  expect(a.choose()).toBeNull();

  a.state.akuukan!.disabledSources = [];
  a.state.round.liveWall = [];
  expect(a.choose()).toBeNull();
});

it("山と相手の手牌の中身を変えても判断が変わらない", () => {
  const a = fixture();
  const before = a.choose();

  a.state.round.liveWall =
    a.state.round.liveWall.map(() => t("honor", 7));

  for (const p of a.state.round.players) {
    if (p.seat !== 2) {
      p.hand = p.hand.map(() => t("honor", 7));
    }
  }

  expect(a.choose().id).toBe(before.id);
});

it("禁止牌を捨てず、評価中に対局状態を変更しない", () => {
  const a = fixture();
  const allowed = a.player.hand[0];
  const forbidden = a.player.hand.slice(1).map(t => t.id);
  const before = JSON.stringify(a.state);

  expect(
    chooseEnemyThirteenDiscard(
      a.state,
      a.player,
      [],
      forbidden,
      () => 0
    )?.id
  ).toBe(allowed.id);

  expect(JSON.stringify(a.state)).toBe(before);
});

it("チーの推定は下家だけに適用し、立直者は鳴かないものとする", () => {
  const a = fixture();
  const tile = t("man", 5);
  const remaining = Array<number>(34).fill(3);
  remaining[4] = 1;

  for (const p of a.state.round.players) {
    if (p.seat !== 2) p.hand = [];
  }

  a.state.round.players[1].hand =
    ts("honor", Array(13).fill(7));

  expect(
    estimateEnemyThirteenCallRisk(
      a.state,
      a.player,
      tile,
      remaining
    )
  ).toBe(0);

  a.state.round.players[3].hand =
    a.state.round.players[1].hand;
  a.state.round.players[1].hand = [];

  expect(
    estimateEnemyThirteenCallRisk(
      a.state,
      a.player,
      tile,
      remaining
    )
  ).toBeGreaterThan(0);

  a.state.round.players[3].riichi = true;

  expect(
    estimateEnemyThirteenCallRisk(
      a.state,
      a.player,
      tile,
      remaining
    )
  ).toBe(0);
});

it("実際の通常ツモで開始された1回目も先読みの対象になる", () => {
  const a = fixture();
  a.state.akuukan!.activeEffects = [];

  const draw = a.player.hand.pop()!;
  a.player.drawnTileId = null;
  a.state.round.phase = "drawing";
  a.state.round.currentSeat = 2;

  a.state.round.liveWall = [
    draw,
    ...ts("honor", [3, 4, 5, 6, 7])
  ];

  const drawn = drawCpuTile(a.state, 2, () => 0);

  expect(
    chooseEnemyThirteenDiscard(
      drawn,
      drawn.round.players[2],
      [],
      [],
      () => 0
    )
  ).not.toBeNull();
});
