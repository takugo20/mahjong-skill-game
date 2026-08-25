import {
  describe,
  expect,
  it
} from "vitest";
import {
  getAddedKanOptions,
  getClosedKanOptions,
  getOpenKanCallOptions,
  getSelfKanOptions
} from "./kan";
import type {
  SelfKanOptionInput
} from "./kan";
import type {
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
    id: `kan-test-${serialNumber}`,
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

function createSelfInput(
  concealedTiles: Tile[],
  overrides:
    Partial<SelfKanOptionInput> = {}
): SelfKanOptionInput {
  return {
    concealedTiles,
    melds: [],
    riichi: false,
    drawnTileId:
      concealedTiles[
        concealedTiles.length - 1
      ]?.id ?? null,
    kanCount: 0,
    rinshanDrawCount: 0,
    liveWallTileCount: 20,
    ...overrides
  };
}

describe("自分の手番の槓候補", () => {
  it("同じ牌種4枚を暗槓候補にする", () => {
    const redFive =
      createTile("man", 5, true);
    const fourFives = [
      redFive,
      ...createTiles("man", [5, 5, 5])
    ];

    const options = getClosedKanOptions(
      createSelfInput([
        ...createTiles("pin", [1, 2, 3]),
        ...fourFives
      ])
    );

    expect(options).toHaveLength(1);
    expect(options[0].kind).toBe(
      "closedKan"
    );
    expect(options[0].tileIds).toEqual(
      fourFives.map((tile) => tile.id)
    );
  });

  it("立直後はツモ牌を含み許可された暗槓だけを候補にする", () => {
    const fourNines =
      createTiles("sou", [9, 9, 9, 9]);
    const input = createSelfInput(
      fourNines,
      {
        riichi: true,
        drawnTileId: fourNines[3].id,
        riichiClosedKanAllowedTileTypes: [
          { suit: "sou", rank: 9 }
        ]
      }
    );

    expect(
      getClosedKanOptions(input)
    ).toHaveLength(1);

    expect(
      getClosedKanOptions({
        ...input,
        drawnTileId: createTile(
          "pin",
          1
        ).id
      })
    ).toEqual([]);

    expect(
      getClosedKanOptions({
        ...input,
        riichiClosedKanAllowedTileTypes: []
      })
    ).toEqual([]);
  });

  it("ポンと同じ牌を加槓候補にし立直後は禁止する", () => {
    const ponTiles =
      createTiles("honor", [5, 5, 5]);
    const addedTile =
      createTile("honor", 5);

    const meld: Meld = {
      kind: "pon",
      tiles: ponTiles,
      calledFrom: 3,
      calledTileId: ponTiles[0].id
    };

    const input = createSelfInput(
      [addedTile],
      { melds: [meld] }
    );

    expect(
      getAddedKanOptions(input)
    ).toEqual([{
      id: `addedKan:0:${addedTile.id}`,
      kind: "addedKan",
      meldIndex: 0,
      tileId: addedTile.id
    }]);

    expect(
      getAddedKanOptions({
        ...input,
        riichi: true
      })
    ).toEqual([]);
  });

  it("暗槓候補を加槓候補より先に返す", () => {
    const closedKanTiles =
      createTiles("pin", [2, 2, 2, 2]);
    const ponTiles =
      createTiles("honor", [6, 6, 6]);
    const addedTile =
      createTile("honor", 6);

    const options = getSelfKanOptions(
      createSelfInput(
        [
          ...closedKanTiles,
          addedTile
        ],
        {
          melds: [{
            kind: "pon",
            tiles: ponTiles,
            calledFrom: 2,
            calledTileId:
              ponTiles[0].id
          }]
        }
      )
    );

    expect(
      options.map((option) => option.kind)
    ).toEqual([
      "closedKan",
      "addedKan"
    ]);
  });
});

describe("大明槓候補", () => {
  it("他家の捨て牌と同種牌3枚で候補を作る", () => {
    const calledTile =
      createTile("pin", 7);
    const handTiles =
      createTiles("pin", [7, 7, 7]);

    const options = getOpenKanCallOptions({
      callerSeat: 0,
      discarderSeat: 2,
      calledTile,
      concealedTiles: handTiles,
      callerRiichi: false,
      kanCount: 0,
      rinshanDrawCount: 0,
      liveWallTileCount: 20
    });

    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      kind: "openKan",
      callerSeat: 0,
      discarderSeat: 2,
      calledTileId: calledTile.id,
      handTileIds:
        handTiles.map((tile) => tile.id)
    });
  });
});

describe("槓の共通禁止条件", () => {
  it("5回目・嶺上牌不足・王牌補充牌不足では候補を作らない", () => {
    const fourTiles =
      createTiles("man", [1, 1, 1, 1]);
    const baseInput = createSelfInput(
      fourTiles
    );

    expect(
      getSelfKanOptions({
        ...baseInput,
        kanCount: 4
      })
    ).toEqual([]);

    expect(
      getSelfKanOptions({
        ...baseInput,
        rinshanDrawCount: 4
      })
    ).toEqual([]);

    expect(
      getSelfKanOptions({
        ...baseInput,
        liveWallTileCount: 0
      })
    ).toEqual([]);
  });
});
