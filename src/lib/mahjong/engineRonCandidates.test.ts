import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  getRonCandidates,
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
    id: `ron-candidate-${serialNumber}`,
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

function createDiscard(
  tile: Tile
): Discard {
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
      [3, 4, 5, 6, 7]
    ),
    ...createTiles(
      "pin",
      [2, 3, 4, 5, 5]
    ),
    ...createTiles(
      "sou",
      [6, 7, 8]
    )
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
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: null
  };
}

function createRonCandidateState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );
  const winningTile =
    createTile("man", 2);

  state.round.deadWall = Array.from(
    { length: 14 },
    () => createTile("honor", 7)
  );
  state.round.liveWall = [
    createTile("man", 9)
  ];
  state.round.currentSeat = 2;
  state.round.phase = "reaction";
  state.round.winResult = null;
  state.round.lastDiscard = {
    seat: 1,
    discard: createDiscard(
      winningTile
    )
  };

  setPlayerHand(
    state,
    0,
    createPinfuWaitHand()
  );
  setPlayerHand(
    state,
    1,
    createNonWinningHand()
  );
  setPlayerHand(
    state,
    2,
    createPinfuWaitHand()
  );
  setPlayerHand(
    state,
    3,
    createPinfuWaitHand()
  );

  state.round.players[1].discards = [
    createDiscard(winningTile)
  ];

  return state;
}

describe("ロン候補の収集", () => {
  it("放銃者からツモ順が近い順に全候補を返す", () => {
    const state =
      createRonCandidateState();

    const candidates =
      getRonCandidates(state);

    expect(
      candidates.map(
        (candidate) =>
          candidate.winnerSeat
      )
    ).toEqual([2, 3, 0]);
    expect(
      candidates.map(
        (candidate) =>
          candidate.loserSeat
      )
    ).toEqual([1, 1, 1]);
  });

  it("振聴中のプレイヤーを候補から除外する", () => {
    const state =
      createRonCandidateState();

    state.round.players[3].discards = [
      createDiscard(
        createTile("man", 5)
      )
    ];

    expect(
      getRonCandidates(state).map(
        (candidate) =>
          candidate.winnerSeat
      )
    ).toEqual([2, 0]);
  });

  it("最後の捨て牌でも見逃した人以外のCPUがロンする", () => {
    const state =
      createRonCandidateState();

    state.round.liveWall = [];
    setPlayerHand(
      state,
      3,
      createNonWinningHand()
    );

    const result = skipPlayerRon(
      state,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toMatchObject({
      winMethod: "ron",
      winnerSeat: 2,
      loserSeat: 1
    });
  });
});
