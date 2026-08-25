import {
  describe,
  expect,
  it
} from "vitest";
import {
  canPlayerRon,
  createInitialGameState,
  getPlayerMeldCallOptions,
  playPlayerDiscard,
  skipPlayerRon,
  startNextRound
} from "./engine";
import type {
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
    id: `meld-reaction-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createTiles(
  suit: TileSuit,
  ranks: number[]
): Tile[] {
  return ranks.map(
    (rank) => createTile(suit, rank)
  );
}

function createSeededRandom(
  initialSeed: number
): () => number {
  let seed = initialSeed >>> 0;

  return () => {
    seed = (
      seed * 1664525 +
      1013904223
    ) >>> 0;

    return seed / 4294967296;
  };
}

function finishRoundWithWinner(
  state: GameState,
  winnerSeat: SeatIndex
): void {
  state.round.phase = "roundEnd";
  state.round.winResult = {
    winMethod: "tsumo",
    winnerSeat,
    loserSeat: null,
    winningTile: createTile("man", 2),
    yakuNames: ["門前清自摸和"],
    han: 1,
    fu: 30,
    yakumanMultiplier: 0,
    limitName: null,
    totalPoints: 1000,
    pointChanges: []
  };
}

function startNextRoundWithSeed(
  seed: number
): GameState {
  const state = createInitialGameState(
    () => 0.5
  );

  finishRoundWithWinner(state, 1);

  return startNextRound(
    state,
    createSeededRandom(seed)
  );
}

function emptyCpuHands(
  state: GameState
): void {
  for (const seat of [1, 2, 3] as const) {
    state.round.players[seat] = {
      ...state.round.players[seat],
      hand: [],
      drawnTileId: null
    };
  }
}

describe("ゲーム進行中の副露候補", () => {
  it("上家の捨て牌にチーできる場合は反応フェーズへ移る", () => {
    const result =
      startNextRoundWithSeed(2);

    const options =
      getPlayerMeldCallOptions(result);
    const lastDiscard =
      result.round.lastDiscard;

    expect(result.round.phase).toBe(
      "reaction"
    );
    expect(lastDiscard?.seat).toBe(3);
    expect(lastDiscard?.discard.tile).toMatchObject({
      suit: "pin",
      rank: 1
    });
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      kind: "chi",
      callerSeat: 0,
      discarderSeat: 3,
      calledTileId:
        lastDiscard?.discard.tile.id
    });
    expect(result.notice).toContain(
      "チーできます"
    );
  });

  it("いずれの他家の捨て牌でもポン候補を保持する", () => {
    const result =
      startNextRoundWithSeed(15);

    const options =
      getPlayerMeldCallOptions(result);
    const lastDiscard =
      result.round.lastDiscard;

    expect(result.round.phase).toBe(
      "reaction"
    );
    expect(lastDiscard?.seat).toBe(1);
    expect(lastDiscard?.discard.tile).toMatchObject({
      suit: "honor",
      rank: 4
    });
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      kind: "pon",
      callerSeat: 0,
      discarderSeat: 1,
      calledTileId:
        lastDiscard?.discard.tile.id
    });
    expect(result.notice).toContain(
      "ポンできます"
    );
  });

  it("ロンとポンが両方可能ならロンを優先して案内する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const playerDiscard =
      createTile("man", 9);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        ...createTiles("honor", [1, 1]),
        ...createTiles("man", [1, 2, 3]),
        ...createTiles("pin", [1, 2, 3]),
        ...createTiles("sou", [1, 2, 3]),
        ...createTiles("honor", [5, 5]),
        playerDiscard
      ],
      drawnTileId: playerDiscard.id
    };

    emptyCpuHands(state);

    state.round.liveWall = [
      createTile("honor", 1),
      createTile("man", 1)
    ];

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "reaction"
    );
    expect(canPlayerRon(result)).toBe(true);
    expect(
      getPlayerMeldCallOptions(result).map(
        (option) => option.kind
      )
    ).toEqual(["pon"]);
    expect(result.notice).toContain(
      "ロンできます"
    );
    expect(result.notice).not.toContain(
      "ポンできます"
    );
  });

  it("他家のロンはプレイヤーのポンより優先する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const playerDiscard =
      createTile("sou", 9);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        ...createTiles("honor", [5, 5]),
        ...createTiles(
          "man",
          [1, 2, 4, 5, 7, 8]
        ),
        ...createTiles(
          "pin",
          [1, 2, 4, 5, 7]
        ),
        playerDiscard
      ],
      drawnTileId: playerDiscard.id
    };

    emptyCpuHands(state);

    state.round.players[2] = {
      ...state.round.players[2],
      hand: [
        ...createTiles("honor", [5, 5]),
        ...createTiles("man", [1, 2, 3]),
        ...createTiles("pin", [1, 2, 3]),
        ...createTiles("sou", [1, 2, 3]),
        ...createTiles("honor", [1, 1])
      ],
      drawnTileId: null
    };

    state.round.liveWall = [
      createTile("honor", 5),
      createTile("man", 1)
    ];

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.winResult?.winnerSeat
    ).toBe(2);
    expect(
      getPlayerMeldCallOptions(result)
    ).toEqual([]);
    expect(result.notice).toContain(
      "ロン和了しました"
    );
  });

  it("副露だけを見送っても振聴にしない", () => {
    const reactionState =
      startNextRoundWithSeed(15);

    expect(
      getPlayerMeldCallOptions(
        reactionState
      )
    ).toHaveLength(1);
    expect(canPlayerRon(reactionState)).toBe(
      false
    );

    const result = skipPlayerRon(
      reactionState,
      createSeededRandom(100)
    );

    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(result.round.currentSeat).toBe(0);
    expect(
      result.round.players[0]
        .temporaryFuriten
    ).toBe(false);
    expect(
      result.round.players[0]
        .riichiFuriten
    ).toBe(false);
    expect(
      result.round.meldCallOptions
    ).toEqual([]);
  });
});
