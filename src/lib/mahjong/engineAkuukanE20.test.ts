import {
  describe,
  expect,
  it
} from "vitest";
import {
  disableAkuukanSource
} from "../akuukan/state";
import type {
  AkuukanMatchSetup,
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

function createTile(suit: TileSuit, rank: number): Tile {
  serialNumber += 1;
  return {
    id: `engine-akuukan-e20-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createTiles(suit: TileSuit, ranks: readonly number[]): Tile[] {
  return ranks.map((rank) => createTile(suit, rank));
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

function createSetup(enemyId: EnemyId): AkuukanMatchSetup {
  return {
    enemyId,
    equippedSkills: []
  };
}

function createPinfuWaitHand(): Tile[] {
  return [
    ...createTiles("man", [2, 3, 4, 5, 6]),
    ...createTiles("pin", [2, 3, 4, 5, 5]),
    ...createTiles("sou", [6, 7, 8])
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
    createSetup(enemyId)
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

function prepareRonState(enemyId: EnemyId): GameState {
  const state = createBaseState(enemyId);
  const winningTile = createTile("man", 1);

  for (
    let seat = 0 as SeatIndex;
    seat < 4;
    seat = (seat + 1) as SeatIndex
  ) {
    setPlayerHand(state, seat, createNonWinningHand());
  }

  setPlayerHand(state, 2, createPinfuWaitHand());
  state.round.players[1].discards = [createDiscard(winningTile)];
  state.round.currentSeat = 2;
  state.round.phase = "reaction";
  state.round.lastDiscard = {
    seat: 1,
    discard: createDiscard(winningTile)
  };

  return state;
}

function prepareSelectedEnemyTsumoState(enemyId: EnemyId): GameState {
  const state = createBaseState(enemyId);
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

function prepareSelectedEnemyNagashiState(): GameState {
  const state = createBaseState("enemy-10");
  const finalDiscard = createTile("honor", 7);

  setPlayerHand(state, 0, [finalDiscard]);
  setPlayerHand(state, 1, []);
  setPlayerHand(state, 2, []);
  setPlayerHand(state, 3, []);

  state.round.players[0] = {
    ...state.round.players[0],
    discards: [createDiscard(createTile("man", 5))],
    drawnTileId: finalDiscard.id,
    drawnTileSource: "liveWall"
  };
  state.round.players[2] = {
    ...state.round.players[2],
    discards: [createDiscard(createTile("pin", 9))]
  };
  state.round.liveWall = [];
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.honba = 1;
  state.round.riichiPool = 2000;

  return state;
}

function getPointChange(state: GameState, seat: SeatIndex): number {
  const change = state.round.winResult?.pointChanges.find(
    (entry) => entry.seat === seat
  );
  if (!change) {
    throw new Error(`座席${seat}の点数変動が見つかりません。`);
  }
  return change.change;
}

describe("engine Akuukan E-20 integration", () => {
  it("doubles the selected enemy's ron payment but not the hand evaluation", () => {
    const state = prepareRonState("enemy-10");
    const candidate = getRonCandidates(state).find(
      (entry) => entry.winnerSeat === 2
    );

    expect(candidate).toBeDefined();
    expect(candidate?.evaluation.best?.score.totalPoints).toBe(1000);
    expect(
      candidate?.pointChanges.find((entry) => entry.seat === 2)?.change
    ).toBe(2000);

    const result = skipPlayerRon(state);

    expect(result.round.winResult).toMatchObject({
      winnerSeat: 2,
      loserSeat: 1,
      han: 1,
      fu: 30,
      totalPoints: 2000
    });
    expect(result.round.players.map((player) => player.score)).toEqual([
      25000,
      23000,
      27000,
      25000
    ]);
  });

  it("doubles ron payments including honba but does not double the riichi pool", () => {
    const state = prepareRonState("enemy-10");
    state.round.honba = 2;
    state.round.riichiPool = 3000;

    const result = skipPlayerRon(state);

    expect(result.round.winResult?.totalPoints).toBe(6200);
    expect(getPointChange(result, 1)).toBe(-3200);
    expect(getPointChange(result, 2)).toBe(6200);
    expect(result.round.riichiPool).toBe(0);
  });

  it("does not apply E-20 when a different enemy is selected", () => {
    const state = prepareRonState("enemy-1");
    const result = skipPlayerRon(state);

    expect(result.round.winResult?.totalPoints).toBe(1000);
    expect(getPointChange(result, 1)).toBe(-1000);
    expect(getPointChange(result, 2)).toBe(1000);
  });

  it("does not apply E-20 while its source is disabled", () => {
    const state = prepareRonState("enemy-10");
    if (!state.akuukan) {
      throw new Error("亜空間対局状態がありません。");
    }
    state.akuukan = disableAkuukanSource(
      state.akuukan,
      "enemy-ability:E-20"
    );

    const result = skipPlayerRon(state);

    expect(result.round.winResult?.totalPoints).toBe(1000);
    expect(getPointChange(result, 1)).toBe(-1000);
    expect(getPointChange(result, 2)).toBe(1000);
  });

  it("doubles every payer's payment when the selected enemy wins by tsumo", () => {
    const normalState = prepareSelectedEnemyTsumoState("enemy-1");
    const e20State = prepareSelectedEnemyTsumoState("enemy-10");

    const normalResult = playPlayerDiscard(
      normalState,
      normalState.round.players[0].hand[0].id,
      () => 0.5
    );
    const e20Result = playPlayerDiscard(
      e20State,
      e20State.round.players[0].hand[0].id,
      () => 0.5
    );

    expect(normalResult.round.winResult?.winnerSeat).toBe(2);
    expect(e20Result.round.winResult?.winnerSeat).toBe(2);
    expect(e20Result.round.winResult?.han).toBe(
      normalResult.round.winResult?.han
    );
    expect(e20Result.round.winResult?.fu).toBe(
      normalResult.round.winResult?.fu
    );

    expect(getPointChange(e20Result, 0)).toBe(
      getPointChange(normalResult, 0) * 2
    );
    expect(getPointChange(e20Result, 1)).toBe(
      getPointChange(normalResult, 1) * 2
    );
    expect(getPointChange(e20Result, 3)).toBe(
      getPointChange(normalResult, 3) * 2
    );
    expect(getPointChange(e20Result, 2)).toBe(
      getPointChange(normalResult, 2) * 2
    );
  });

  it("doubles selected-enemy nagashi mangan payments but not the riichi pool", () => {
    const state = prepareSelectedEnemyNagashiState();
    const finalDiscardId = state.round.players[0].hand[0].id;

    const result = playPlayerDiscard(
      state,
      finalDiscardId,
      () => 0.5
    );

    expect(result.round.nagashiManganResult?.winnerSeats).toEqual([2]);
    expect(
      result.round.nagashiManganResult?.pointChanges.map(
        ({ seat, change }) => ({ seat, change })
      )
    ).toEqual([
      { seat: 0, change: -8200 },
      { seat: 1, change: -4200 },
      { seat: 2, change: 18600 },
      { seat: 3, change: -4200 }
    ]);
    expect(result.round.riichiPool).toBe(0);
  });
});
