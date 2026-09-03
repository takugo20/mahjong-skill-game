import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  declarePlayerRon,
  declarePlayerTsumo
} from "./engine";
import type {
  Discard,
  GameState,
  SeatIndex,
  Tile,
  TileSuit
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `engine-player-skill-1-3-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createTiles(
  suit: TileSuit,
  ranks: readonly number[]
): Tile[] {
  return ranks.map(
    (rank) => createTile(suit, rank)
  );
}

function createDiscard(tile: Tile): Discard {
  return {
    tile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };
}

function createPinfuWaitHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [2, 3, 4, 5, 6]
    ),
    ...createTiles(
      "pin",
      [2, 3, 4, 5, 5]
    ),
    ...createTiles("sou", [6, 7, 8])
  ];
}

function createNonWinningHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [1, 2, 4, 5, 7, 8]
    ),
    ...createTiles(
      "pin",
      [1, 2, 4, 5, 7, 8]
    ),
    createTile("honor", 1)
  ];
}

function setPlayerHand(
  state: GameState,
  seat: SeatIndex,
  hand: Tile[]
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand,
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: null,
    drawnTileSource: null
  };
}

function createBaseState(
  enemyId:
    | "enemy-1"
    | "enemy-6"
    | "enemy-15" = "enemy-1"
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId,
      equippedSkills: [{
        id: "1-3",
        level: 1
      }]
    }
  );

  state.round.deadWall = Array.from(
    { length: 14 },
    () => createTile("honor", 7)
  );
  state.round.liveWall = [
    createTile("honor", 2)
  ];
  state.round.honba = 0;
  state.round.riichiPool = 0;
  state.round.winResult = null;
  state.round.doubleRonResult = null;
  state.round.drawResult = null;
  state.round.nagashiManganResult = null;
  state.round.abortiveDrawResult = null;
  state.round.pendingKan = null;

  return state;
}

function preparePlayerTsumoState(
  enemyId:
    | "enemy-1"
    | "enemy-6"
    | "enemy-15" = "enemy-1"
): GameState {
  const state = createBaseState(enemyId);
  const winningTile = createTile(
    "man",
    1
  );

  setPlayerHand(
    state,
    0,
    [
      ...createPinfuWaitHand(),
      winningTile
    ]
  );
  state.round.players[0] = {
    ...state.round.players[0],
    drawnTileId: winningTile.id,
    drawnTileSource: "liveWall"
  };
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.turnNumber = 4;
  state.round.lastDiscard = null;

  return state;
}

function prepareRonState(
  winnerSeats: readonly SeatIndex[],
  enemyId:
    | "enemy-1"
    | "enemy-6"
    | "enemy-15" = "enemy-1"
): GameState {
  const state = createBaseState(enemyId);
  const winningTile = createTile(
    "man",
    1
  );
  const discard = createDiscard(
    winningTile
  );
  const winnerSeatSet = new Set(
    winnerSeats
  );

  for (
    const seat of [0, 1, 2, 3] as const
  ) {
    setPlayerHand(
      state,
      seat,
      winnerSeatSet.has(seat)
        ? createPinfuWaitHand()
        : createNonWinningHand()
    );
  }

  state.round.players[1] = {
    ...state.round.players[1],
    discards: [discard]
  };
  state.round.currentSeat = 2;
  state.round.phase = "reaction";
  state.round.lastDiscard = {
    seat: 1,
    discard
  };

  return state;
}

function prepareChankanState(): GameState {
  const state = createBaseState();
  const winningTile = createTile(
    "man",
    1
  );

  setPlayerHand(
    state,
    0,
    createPinfuWaitHand()
  );
  setPlayerHand(
    state,
    1,
    [
      ...createNonWinningHand(),
      winningTile
    ]
  );
  setPlayerHand(
    state,
    2,
    createNonWinningHand()
  );
  setPlayerHand(
    state,
    3,
    createNonWinningHand()
  );
  state.round.currentSeat = 1;
  state.round.phase = "reaction";
  state.round.lastDiscard = null;
  state.round.pendingKan = {
    id: "player-skill-1-3-added-kan",
    kind: "addedKan",
    declarerSeat: 1,
    meldIndex: 0,
    tileId: winningTile.id,
    chankanTileId: winningTile.id
  };

  return state;
}

function createRandom(
  values: readonly number[]
): {
  readonly random: () => number;
  readonly getCallCount: () => number;
} {
  let callCount = 0;

  return {
    random: () => {
      const value =
        values[callCount] ?? 0;
      callCount += 1;
      return value;
    },
    getCallCount: () => callCount
  };
}

function getPlayerRedTileCount(
  state: GameState
): number {
  return state.round.players[0].hand
    .filter((tile) => tile.red).length;
}

describe("プレイヤースキル1-3のエンジン統合", () => {
  it("ツモ和了時に非副露部分1枚を赤ドラ化して点数計算する", () => {
    const state = preparePlayerTsumoState();
    const failed = declarePlayerTsumo(
      state,
      () => 0.05
    );
    const succeeded = declarePlayerTsumo(
      state,
      createRandom([0, 0]).random
    );

    expect(
      getPlayerRedTileCount(succeeded)
    ).toBe(1);
    expect(
      succeeded.round.winResult?.doraCount
    ).toBe(
      (failed.round.winResult?.doraCount ??
        0) + 1
    );
    expect(
      succeeded.round.winResult?.han
    ).toBe(
      (failed.round.winResult?.han ?? 0) +
        1
    );
    expect(
      succeeded.round.winResult
        ?.totalPoints
    ).toBeGreaterThan(
      failed.round.winResult
        ?.totalPoints ?? 0
    );
  });

  it("ロン和了時に手牌の未赤牌を赤ドラ化して点数計算する", () => {
    const state = prepareRonState([0]);
    const failed = declarePlayerRon(
      state,
      () => 0.05
    );
    const succeeded = declarePlayerRon(
      state,
      createRandom([0, 0]).random
    );

    expect(
      getPlayerRedTileCount(succeeded)
    ).toBe(1);
    expect(
      succeeded.round.winResult?.doraCount
    ).toBe(
      (failed.round.winResult?.doraCount ??
        0) + 1
    );
    expect(
      succeeded.round.winResult?.han
    ).toBe(
      (failed.round.winResult?.han ?? 0) +
        1
    );
  });

  it("ロン和了牌そのものも赤ドラ化候補に含める", () => {
    const state = prepareRonState([0]);
    const result = declarePlayerRon(
      state,
      createRandom([0, 0.999]).random
    );

    expect(
      getPlayerRedTileCount(result)
    ).toBe(0);
    expect(
      result.round.winResult?.winningTile
        .red
    ).toBe(true);
    expect(
      result.round.winResult?.doraCount
    ).toBe(1);
  });

  it("槍槓の和了牌も赤ドラ化候補に含める", () => {
    const state = prepareChankanState();
    const result = declarePlayerRon(
      state,
      createRandom([0, 0.999]).random
    );

    expect(
      result.round.winResult?.winningTile
        .red
    ).toBe(true);
    expect(
      result.round.winResult?.doraCount
    ).toBe(1);
    expect(
      result.round.winResult?.yakuNames
    ).toContain("槍槓");
  });

  it("敵6のE-18で無効化されていれば和了時に発動しない", () => {
    const state = preparePlayerTsumoState(
      "enemy-6"
    );
    const random = createRandom([0, 0]);
    const result = declarePlayerTsumo(
      state,
      random.random
    );

    expect(
      getPlayerRedTileCount(result)
    ).toBe(0);
    expect(
      result.round.winResult?.doraCount
    ).toBe(0);
    expect(random.getCallCount()).toBe(0);
  });

  it("1-3の赤ドラをE-27判定前の翻数へ反映する", () => {
    const state = preparePlayerTsumoState(
      "enemy-15"
    );

    state.round.players[0] = {
      ...state.round.players[0],
      riichi: true,
      ippatsu: true
    };

    const failed = declarePlayerTsumo(
      state,
      () => 0.05
    );
    const succeeded = declarePlayerTsumo(
      state,
      createRandom([0, 0]).random
    );

    expect(
      failed.round.abortiveDrawResult
    ).toMatchObject({
      reason: "enemyAbilityE27"
    });
    expect(
      succeeded.round.abortiveDrawResult
    ).toBeNull();
    expect(
      succeeded.round.winResult
    ).toMatchObject({
      winnerSeat: 0,
      han: 5,
      doraCount: 1,
      limitName: "満貫"
    });
  });

  it("ダブロンではプレイヤーの和了だけへ赤ドラを加算する", () => {
    const state = prepareRonState([2, 0]);
    const result = declarePlayerRon(
      state,
      createRandom([0, 0]).random
    );
    const winResults =
      result.round.doubleRonResult
        ?.winResults;
    const playerWin = winResults?.find(
      (winResult) =>
        winResult.winnerSeat === 0
    );
    const cpuWin = winResults?.find(
      (winResult) =>
        winResult.winnerSeat === 2
    );

    expect(playerWin?.doraCount).toBe(1);
    expect(cpuWin?.doraCount).toBe(0);
  });

  it("三家和では和了が成立しないため発動しない", () => {
    const state = prepareRonState([
      2,
      3,
      0
    ]);
    const random = createRandom([0, 0]);
    const result = declarePlayerRon(
      state,
      random.random
    );

    expect(
      result.round.abortiveDrawResult
    ).toMatchObject({
      reason: "tripleRon"
    });
    expect(
      getPlayerRedTileCount(result)
    ).toBe(0);
    expect(random.getCallCount()).toBe(0);
  });
});
