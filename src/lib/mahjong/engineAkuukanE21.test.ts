import {
  describe,
  expect,
  it
} from "vitest";
import {
  disableAkuukanSource
} from "../akuukan/state";
import type {
  EnemyId
} from "../akuukan/types";
import {
  createInitialGameState,
  getRonCandidates,
  playPlayerDiscard,
  skipPlayerRon
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
    id: `engine-akuukan-e21-${serialNumber}`,
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
    ...createTiles("man", [2, 3, 4, 5, 6]),
    ...createTiles("pin", [2, 3, 4, 5, 5]),
    ...createTiles("sou", [6, 7, 8])
  ];
}

function createNoYakuWaitHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 4, 5, 6]),
    ...createTiles("pin", [2, 3, 4]),
    ...createTiles("sou", [6, 7, 8]),
    ...createTiles("honor", [1, 1])
  ];
}

function createNonWinningHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 4, 5, 7, 8]),
    ...createTiles("pin", [1, 2, 4, 5, 7, 8]),
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

function createBaseState(enemyId: EnemyId): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId,
      equippedSkills: []
    }
  );

  state.round.deadWall = Array.from(
    { length: 14 },
    () => createTile("honor", 7)
  );
  state.round.liveWall = [createTile("honor", 2)];
  state.round.honba = 0;
  state.round.riichiPool = 0;
  state.round.winResult = null;
  state.round.doubleRonResult = null;
  state.round.drawResult = null;
  state.round.abortiveDrawResult = null;
  state.round.nagashiManganResult = null;

  return state;
}

function prepareRonState(
  enemyId: EnemyId,
  winnerHand: Tile[],
  winningTile: Tile
): GameState {
  const state = createBaseState(enemyId);

  for (
    let seat = 0 as SeatIndex;
    seat < 4;
    seat = (seat + 1) as SeatIndex
  ) {
    setPlayerHand(state, seat, createNonWinningHand());
  }

  setPlayerHand(state, 2, winnerHand);
  state.round.players[1].discards = [
    createDiscard(winningTile)
  ];
  state.round.currentSeat = 2;
  state.round.phase = "reaction";
  state.round.lastDiscard = {
    seat: 1,
    discard: createDiscard(winningTile)
  };

  return state;
}

function preparePinfuRonState(
  enemyId: EnemyId
): GameState {
  return prepareRonState(
    enemyId,
    createPinfuWaitHand(),
    createTile("man", 1)
  );
}

function prepareSelectedEnemyTsumoState(): GameState {
  const state = createBaseState("enemy-11");
  const playerDiscard = createTile("honor", 7);
  const winningTile = createTile("man", 6);
  const waitingHand = [
    ...createTiles("man", [1, 2, 3, 4, 5]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [1, 2, 3]),
    ...createTiles("honor", [1, 1])
  ];

  setPlayerHand(state, 0, [playerDiscard]);
  setPlayerHand(state, 1, []);
  setPlayerHand(state, 2, waitingHand);
  setPlayerHand(state, 3, []);

  state.round.players[2].discards = [
    createDiscard(createTile("man", 9))
  ];

  state.round.players[0] = {
    ...state.round.players[0],
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };
  state.round.liveWall = [
    createTile("honor", 6),
    winningTile,
    ...createTiles("pin", [7, 8, 9, 7, 8, 9])
  ];
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;

  return state;
}

function getPointChange(
  state: GameState,
  seat: SeatIndex
): number {
  const change = state.round.winResult?.pointChanges.find(
    (entry) => entry.seat === seat
  );

  if (!change) {
    throw new Error(
      `座席${seat}の点数変動が見つかりません。`
    );
  }

  return change.change;
}

describe("engine Akuukan E-21 integration", () => {
  it("keeps han and fu while raising the selected enemy's ron to mangan", () => {
    const state = preparePinfuRonState("enemy-11");
    const candidate = getRonCandidates(state).find(
      (entry) => entry.winnerSeat === 2
    );

    expect(candidate?.evaluation.best).toMatchObject({
      totalHan: 1,
      fu: {
        fu: 30
      },
      score: {
        han: 1,
        fu: 30,
        basePoints: 2000,
        limit: "mangan",
        limitName: "満貫",
        ronPayment: 8000,
        totalPoints: 8000
      }
    });

    const result = skipPlayerRon(state);

    expect(result.round.winResult).toMatchObject({
      winnerSeat: 2,
      loserSeat: 1,
      han: 1,
      fu: 30,
      limitName: "満貫",
      totalPoints: 8000
    });
    expect(getPointChange(result, 1)).toBe(-8000);
    expect(getPointChange(result, 2)).toBe(8000);
  });

  it("keeps honba and riichi points separate from the mangan hand value", () => {
    const state = preparePinfuRonState("enemy-11");
    state.round.honba = 2;
    state.round.riichiPool = 3000;

    const candidate = getRonCandidates(state).find(
      (entry) => entry.winnerSeat === 2
    );

    expect(candidate?.evaluation.best.score).toMatchObject({
      handPoints: 8000,
      honbaPoints: 600,
      riichiPoints: 3000,
      ronPayment: 8600,
      totalPoints: 11600
    });

    const result = skipPlayerRon(state);

    expect(result.round.winResult?.totalPoints).toBe(11600);
    expect(getPointChange(result, 1)).toBe(-8600);
    expect(getPointChange(result, 2)).toBe(11600);
    expect(result.round.riichiPool).toBe(0);
  });

  it("uses mangan payments when the selected enemy wins by tsumo", () => {
    const state = prepareSelectedEnemyTsumoState();
    const playerDiscardId =
      state.round.players[0].hand[0].id;

    const result = playPlayerDiscard(
      state,
      playerDiscardId,
      () => 0.5
    );

    expect(result.round.winResult).toMatchObject({
      winnerSeat: 2,
      loserSeat: null,
      han: 3,
      fu: 30,
      limitName: "満貫",
      totalPoints: 8000
    });
    expect(getPointChange(result, 0)).toBe(-4000);
    expect(getPointChange(result, 1)).toBe(-2000);
    expect(getPointChange(result, 2)).toBe(8000);
    expect(getPointChange(result, 3)).toBe(-2000);
  });

  it("does not apply E-21 when a different enemy is selected", () => {
    const state = preparePinfuRonState("enemy-1");
    const result = skipPlayerRon(state);

    expect(result.round.winResult).toMatchObject({
      winnerSeat: 2,
      han: 1,
      fu: 30,
      limitName: null,
      totalPoints: 1000
    });
    expect(getPointChange(result, 1)).toBe(-1000);
    expect(getPointChange(result, 2)).toBe(1000);
  });

  it("does not apply E-21 while its source is disabled", () => {
    const state = preparePinfuRonState("enemy-11");

    if (!state.akuukan) {
      throw new Error("亜空間対局状態がありません。");
    }

    state.akuukan = disableAkuukanSource(
      state.akuukan,
      "enemy-ability:E-21"
    );

    const result = skipPlayerRon(state);

    expect(result.round.winResult).toMatchObject({
      han: 1,
      fu: 30,
      limitName: null,
      totalPoints: 1000
    });
    expect(getPointChange(result, 1)).toBe(-1000);
    expect(getPointChange(result, 2)).toBe(1000);
  });

  it("does not raise a hand that is already kiriage mangan", () => {
    const state = preparePinfuRonState("enemy-11");
    state.round.players[2] = {
      ...state.round.players[2],
      riichi: true,
      doubleRiichi: true,
      ippatsu: true
    };

    const result = skipPlayerRon(state);

    expect(result.round.winResult).toMatchObject({
      han: 4,
      fu: 30,
      limitName: "満貫",
      totalPoints: 8000
    });
    expect(getPointChange(result, 1)).toBe(-8000);
    expect(getPointChange(result, 2)).toBe(8000);
  });

  it("does not make a no-yaku hand legal", () => {
    const state = prepareRonState(
      "enemy-11",
      createNoYakuWaitHand(),
      createTile("man", 3)
    );

    expect(
      getRonCandidates(state).some(
        (entry) => entry.winnerSeat === 2
      )
    ).toBe(false);
  });
});
