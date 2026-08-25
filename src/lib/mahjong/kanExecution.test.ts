import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState
} from "./engine";
import {
  executeKan
} from "./kanExecution";
import type {
  Discard,
  Meld,
  Tile,
  TileSuit
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number,
  red = false
): Tile {
  serialNumber += 1;

  return {
    id: `kan-execution-${serialNumber}`,
    suit,
    rank,
    red
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

describe("槓成立処理", () => {
  it("暗槓して嶺上牌を引き通常山末尾を王牌へ補充する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const kanTiles = createTiles(
      "man",
      [5, 5, 5, 5]
    );
    const otherTiles = createTiles(
      "pin",
      [
        1, 2, 3, 4, 6,
        7, 8, 9, 1, 2
      ]
    );
    const rinshanTile =
      state.round.deadWall[0];
    const replacementTile =
      state.round.liveWall[
        state.round.liveWall.length - 1
      ];

    state.round.players[0].hand = [
      ...kanTiles,
      ...otherTiles
    ];

    state.round.players.forEach(
      (player) => {
        player.ippatsu = true;
      }
    );

    const result = executeKan({
      round: state.round,
      declarerSeat: 0,
      option: {
        id: "closed-kan-option",
        kind: "closedKan",
        tileIds: [
          kanTiles[0].id,
          kanTiles[1].id,
          kanTiles[2].id,
          kanTiles[3].id
        ]
      }
    });

    expect(result.rinshanTile).toBe(
      rinshanTile
    );
    expect(result.replacementTile).toBe(
      replacementTile
    );
    expect(
      result.round.liveWall
    ).toHaveLength(
      state.round.liveWall.length - 1
    );
    expect(
      result.round.deadWall[0]
    ).toBe(replacementTile);
    expect(
      result.round.kanCount
    ).toBe(1);
    expect(
      result.round.doraIndicatorCount
    ).toBe(2);
    expect(
      result.round.rinshanDrawCount
    ).toBe(1);
    expect(
      result.round.players[0].melds[0]
    ).toMatchObject({
      kind: "closedKan"
    });
    expect(
      result.round.players[0].hand.some(
        (tile) =>
          tile.id === rinshanTile.id
      )
    ).toBe(true);
    expect(
      result.round.players[0]
        .drawnTileSource
    ).toBe("rinshan");
    expect(
      result.round.players.every(
        (player) => !player.ippatsu
      )
    ).toBe(true);
  });

  it("ポンへ1枚加えて加槓にする", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const ponTiles = createTiles(
      "honor",
      [5, 5, 5]
    );
    const addedTile =
      createTile("honor", 5);
    const pon: Meld = {
      kind: "pon",
      tiles: ponTiles,
      calledFrom: 3,
      calledTileId: ponTiles[0].id
    };

    state.round.players[0].hand = [
      addedTile,
      ...createTiles(
        "sou",
        [
          1, 2, 3, 4, 5,
          6, 7, 8, 9, 1
        ]
      )
    ];
    state.round.players[0].melds = [
      pon
    ];

    const result = executeKan({
      round: state.round,
      declarerSeat: 0,
      option: {
        id: "added-kan-option",
        kind: "addedKan",
        meldIndex: 0,
        tileId: addedTile.id
      }
    });

    expect(
      result.round.players[0].melds[0]
    ).toMatchObject({
      kind: "addedKan",
      calledFrom: 3,
      calledTileId: ponTiles[0].id
    });
    expect(
      result.round.players[0]
        .melds[0].tiles
    ).toHaveLength(4);
    expect(
      result.round.players[0].hand.some(
        (tile) =>
          tile.id === addedTile.id
      )
    ).toBe(false);
  });

  it("捨て牌を大明槓して河を副露済みにする", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const calledTile =
      createTile("pin", 7);
    const handTiles = createTiles(
      "pin",
      [7, 7, 7]
    );
    const discard =
      createDiscard(calledTile);

    state.round.phase = "reaction";
    state.round.lastDiscard = {
      seat: 2,
      discard
    };
    state.round.players[2].discards = [
      discard
    ];
    state.round.players[0].hand = [
      ...handTiles,
      ...createTiles(
        "man",
        [
          1, 2, 3, 4, 5,
          6, 7, 8, 9, 1
        ]
      )
    ];

    const result = executeKan({
      round: state.round,
      option: {
        id: "open-kan-option",
        kind: "openKan",
        callerSeat: 0,
        discarderSeat: 2,
        calledTileId: calledTile.id,
        handTileIds: [
          handTiles[0].id,
          handTiles[1].id,
          handTiles[2].id
        ]
      }
    });

    expect(
      result.round.currentSeat
    ).toBe(0);
    expect(
      result.round.phase
    ).toBe("discarding");
    expect(
      result.round.players[0].melds[0]
    ).toMatchObject({
      kind: "openKan",
      calledFrom: 2,
      calledTileId: calledTile.id
    });
    expect(
      result.round.players[2]
        .discards[0].called
    ).toBe(true);
    expect(
      result.round.lastDiscard
        ?.discard.called
    ).toBe(true);
  });

  it("嶺上ツモで同巡内振聴を解除し立直後振聴は維持する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const kanTiles = createTiles(
      "sou",
      [9, 9, 9, 9]
    );

    state.round.players[0].hand = [
      ...kanTiles,
      ...createTiles(
        "man",
        [
          1, 2, 3, 4, 5,
          6, 7, 8, 9, 1
        ]
      )
    ];
    state.round.players[0]
      .temporaryFuriten = true;
    state.round.players[0]
      .riichiFuriten = true;

    const result = executeKan({
      round: state.round,
      declarerSeat: 0,
      option: {
        id: "furiten-closed-kan",
        kind: "closedKan",
        tileIds: [
          kanTiles[0].id,
          kanTiles[1].id,
          kanTiles[2].id,
          kanTiles[3].id
        ]
      }
    });

    expect(
      result.round.players[0]
        .temporaryFuriten
    ).toBe(false);
    expect(
      result.round.players[0]
        .riichiFuriten
    ).toBe(true);
  });

  it("ドラ表示牌は5枚を超えて増やさない", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const kanTiles = createTiles(
      "honor",
      [1, 1, 1, 1]
    );

    state.round.doraIndicatorCount = 5;
    state.round.players[0].hand = [
      ...kanTiles,
      ...createTiles(
        "pin",
        [
          1, 2, 3, 4, 5,
          6, 7, 8, 9, 1
        ]
      )
    ];

    const result = executeKan({
      round: state.round,
      declarerSeat: 0,
      option: {
        id: "maximum-dora-kan",
        kind: "closedKan",
        tileIds: [
          kanTiles[0].id,
          kanTiles[1].id,
          kanTiles[2].id,
          kanTiles[3].id
        ]
      }
    });

    expect(
      result.round.doraIndicatorCount
    ).toBe(5);
  });

  it("通常山から王牌へ補充できない場合は槓を成立させない", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const kanTiles = createTiles(
      "man",
      [1, 1, 1, 1]
    );

    state.round.liveWall = [];
    state.round.players[0].hand = [
      ...kanTiles,
      ...createTiles(
        "sou",
        [
          1, 2, 3, 4, 5,
          6, 7, 8, 9, 1
        ]
      )
    ];

    expect(() =>
      executeKan({
        round: state.round,
        declarerSeat: 0,
        option: {
          id: "blocked-closed-kan",
          kind: "closedKan",
          tileIds: [
            kanTiles[0].id,
            kanTiles[1].id,
            kanTiles[2].id,
            kanTiles[3].id
          ]
        }
      })
    ).toThrow(
      "王牌へ補充する通常山牌がありません。"
    );
  });
});
