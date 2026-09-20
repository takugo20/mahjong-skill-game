import { expect, it } from "vitest";
import {
  createInitialGameState,
  createPlayerDiscardProgression
} from "./engine";
import { getMeldCallOptions } from "./calls";
import { getOpenKanCallOptions } from "./kan";
import {
  chooseCpuMeldCall,
  chooseCpuOpenKanCall
} from "./cpuCalls";
import { getEnemyCallStrategy } from "../akuukan/enemyCallStrategy";
import type { EnemyCallStrategy } from "../akuukan/enemyCallStrategy";
import type { PlayerState, Tile, TileSuit } from "./types";

let serial = 0;

function t(suit: TileSuit, rank: number): Tile {
  return {
    id: `enemy-call-${++serial}`,
    suit,
    rank,
    red: false
  };
}

function ts(suit: TileSuit, ranks: number[]) {
  return ranks.map(rank => t(suit, rank));
}

function player(hand: Tile[]): PlayerState {
  return {
    ...createInitialGameState(() => 0.5).round.players[2],
    hand,
    melds: [],
    discards: []
  };
}

function strategy(enemy: 4 | 5 | 8): EnemyCallStrategy {
  return {
    enemy,
    openRiichi: enemy === 5,
    targetSuit: enemy === 5 ? "man" : undefined,
    stealPoints: enemy === 4 ? 3000 : 0,
    redMelds: enemy === 8,
    threatened: false,
    liveWallCount: 40
  };
}

function call(
  p: PlayerState,
  tile: Tile,
  policy?: EnemyCallStrategy,
  forbiddenTileIds: string[] = []
) {
  return chooseCpuMeldCall({
    player: p,
    prevailingWind: "east",
    calledTile: tile,
    options: getMeldCallOptions({
      callerSeat: 2,
      discarderSeat: 1,
      calledTile: tile,
      concealedTiles: p.hand,
      callerRiichi: false,
      liveWallTileCount: 40
    }),
    strategy: policy,
    forbiddenTileIds
  });
}

it("敵4・8は役牌の同向聴ポンを選び、通常CPUは見送る", () => {
  const p = player([
    ...ts("honor", [5, 5]),
    ...ts("man", [1, 2, 3, 4, 5, 6]),
    ...ts("pin", [7, 8, 9]),
    ...ts("sou", [2, 3])
  ]);
  const tile = t("honor", 5);

  expect(call(p, tile)).toBeNull();

  for (const enemy of [4, 8] as const) {
    const result = call(p, tile, strategy(enemy));
    expect(result?.option.kind).toBe("pon");
    expect(result?.shantenAfter).toBe(result?.shantenBefore);
  }
});

it("敵5は対象色を鳴き、対象外の数牌と敵8の役なしチーは見送る", () => {
  const p = player([
    ...ts("man", [2, 3, 7, 8]),
    ...ts("pin", [2, 2, 2, 3, 4]),
    ...ts("sou", [5, 6, 7]),
    t("honor", 7)
  ]);
  const tile = t("man", 1);

  expect(call(p, tile, strategy(5))?.option.kind).toBe("chi");
  expect(
    call(p, tile, { ...strategy(5), targetSuit: "sou" })
  ).toBeNull();
  expect(call(p, tile, strategy(8))).toBeNull();
  expect(
    call(p, tile, { ...strategy(5), openRiichi: false })
  ).toBeNull();
});

it("敵4は役なしでも点数を奪えるポンを検討し、敵8は見送る", () => {
  const p = player([
    ...ts("honor", [4, 4]),
    ...ts("man", [1, 2, 3, 4, 5, 6]),
    ...ts("pin", [7, 8, 9]),
    ...ts("sou", [2, 3])
  ]);
  const tile = t("honor", 4);

  expect(call(p, tile, strategy(4))?.option.kind).toBe("pon");
  expect(call(p, tile, strategy(8))).toBeNull();
  expect(
    call(p, tile, { ...strategy(4), stealPoints: 0 })
  ).toBeNull();
});

it("副露後に捨てられる牌がなければ鳴かない", () => {
  const p = player([
    ...ts("honor", [5, 5]),
    ...ts("man", [1, 2, 3, 4, 5, 6]),
    ...ts("pin", [7, 8, 9]),
    ...ts("sou", [2, 3])
  ]);

  expect(
    call(p, t("honor", 5), strategy(4), p.hand.map(tile => tile.id))
  ).toBeNull();
});

it("敵4は大明槓を選ぶが、終盤や立直への警戒時には見送る", () => {
  const p = player([
    ...ts("honor", [5, 5, 5]),
    ...ts("man", [2, 2, 9]),
    ...ts("pin", [1, 2, 3, 4, 5, 6]),
    t("sou", 7)
  ]);
  const tile = t("honor", 5);

  const input = {
    player: p,
    prevailingWind: "east" as const,
    calledTile: tile,
    options: getOpenKanCallOptions({
      callerSeat: 2,
      discarderSeat: 1,
      calledTile: tile,
      concealedTiles: p.hand,
      callerRiichi: false,
      kanCount: 0,
      rinshanDrawCount: 0,
      liveWallTileCount: 40
    })
  };

  expect(
    chooseCpuOpenKanCall({
      ...input,
      strategy: strategy(4)
    })?.option.kind
  ).toBe("openKan");

  expect(
    chooseCpuOpenKanCall({
      ...input,
      strategy: { ...strategy(4), liveWallCount: 8 }
    })
  ).toBeNull();

  expect(
    chooseCpuOpenKanCall({
      ...input,
      strategy: { ...strategy(4), threatened: true }
    })
  ).toBeNull();
});

it("敵8はロン禁止中の他家の立直を警戒せず、能力無効時は警戒する", () => {
  const state = createInitialGameState(() => 0.5, {
    enemyId: "enemy-8",
    equippedSkills: []
  });

  state.round.players[0].riichi = true;
  expect(
    getEnemyCallStrategy(state, state.round.players[2])?.threatened
  ).toBe(false);

  state.round.players[1].riichi = true;
  expect(
    getEnemyCallStrategy(state, state.round.players[2])?.threatened
  ).toBe(false);

  state.akuukan!.disabledSources.push("enemy-ability:E-13");
  expect(
    getEnemyCallStrategy(state, state.round.players[2])?.threatened
  ).toBe(true);

  expect(
    getEnemyCallStrategy(state, state.round.players[1])
  ).toBeUndefined();

  state.akuukan!.disabledSources.push("enemy-ability:E-15");
  expect(
    getEnemyCallStrategy(state, state.round.players[2])
  ).toBeUndefined();
});

it("実際のゲーム進行でも敵4が同向聴のポンを行う", () => {
  const state = createInitialGameState(() => 0.5, {
    enemyId: "enemy-4",
    equippedSkills: []
  });
  const discarded = t("honor", 5);

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [discarded],
    drawnTileId: discarded.id
  };

  for (const seat of [1, 3] as const) {
    state.round.players[seat] = {
      ...state.round.players[seat],
      hand: [],
      drawnTileId: null
    };
  }

  state.round.players[2] = {
    ...state.round.players[2],
    hand: [
      ...ts("honor", [5, 5]),
      ...ts("man", [1, 2, 3, 4, 5, 6]),
      ...ts("pin", [7, 8, 9]),
      ...ts("sou", [2, 3])
    ]
  };

  state.round.liveWall = ts(
    "honor",
    [6, 6, 6, 6, 7, 7, 7, 7, 1, 1]
  );

  const result = createPlayerDiscardProgression(
    state,
    discarded.id,
    () => 0.5
  ).finalState;

  expect(
    result.round.players[2].melds.some(
      meld =>
        meld.kind === "pon"
        && meld.calledTileId === discarded.id
    )
  ).toBe(true);
});
