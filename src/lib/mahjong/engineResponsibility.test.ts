import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  declarePlayerTsumo
} from "./engine";
import type {
  Meld,
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
    id:
      `engine-responsibility-${serialNumber}`,
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

function createPon(
  rank: number,
  calledFrom: SeatIndex
): Meld {
  const tiles = createTiles(
    "honor",
    [rank, rank, rank]
  );

  return {
    kind: "pon",
    tiles,
    calledFrom,
    calledTileId: tiles[2]?.id
  };
}

describe("ゲームエンジンの責任払い", () => {
  it("責任払い情報と点数移動を和了結果へ保存する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const hand = [
      ...createTiles(
        "man",
        [1, 2, 3]
      ),
      ...createTiles(
        "pin",
        [2, 2]
      )
    ];
    const winningTile = hand[4];

    if (!winningTile) {
      throw new Error(
        "ツモ牌を作成できませんでした"
      );
    }

    state.round.currentSeat = 0;
    state.round.phase = "discarding";
    state.round.turnNumber = 4;
    state.round.honba = 1;
    state.round.riichiPool = 1000;
    state.round.players[0] = {
      ...state.round.players[0],
      hand,
      melds: [
        createPon(5, 1),
        createPon(6, 2),
        createPon(7, 3)
      ],
      drawnTileId: winningTile.id,
      drawnTileSource: "liveWall"
    };

    const result =
      declarePlayerTsumo(state);

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.winResult
        ?.responsibility
    ).toEqual({
      yakumanId: "bigThreeDragons",
      yakumanMultiplier: 1,
      responsibleSeat: 3
    });
    expect(
      result.round.winResult?.yakuNames
    ).toContain("大三元");
    expect(
      result.round.winResult?.pointChanges
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          seat: 0,
          change: 49300
        }),
        expect.objectContaining({
          seat: 1,
          change: 0
        }),
        expect.objectContaining({
          seat: 2,
          change: 0
        }),
        expect.objectContaining({
          seat: 3,
          change: -48300
        })
      ])
    );
    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      74300,
      25000,
      25000,
      -23300
    ]);
  });
});
