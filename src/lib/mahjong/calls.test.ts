import {
  describe,
  expect,
  it
} from "vitest";
import {
  getChiCallOptions,
  getMeldCallOptions,
  getPonCallOptions
} from "./calls";
import type {
  MeldCallOptionInput
} from "./calls";
import type {
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
    id: `call-test-${serialNumber}`,
    suit,
    rank,
    red
  };
}

function createInput(
  calledTile: Tile,
  concealedTiles: Tile[],
  overrides:
    Partial<MeldCallOptionInput> = {}
): MeldCallOptionInput {
  return {
    callerSeat: 0,
    discarderSeat: 3,
    calledTile,
    concealedTiles,
    callerRiichi: false,
    liveWallTileCount: 20,
    ...overrides
  };
}

describe("ポン候補", () => {
  it("自分以外のどの家の捨て牌にもポンできる", () => {
    const calledTile =
      createTile("honor", 1);
    const concealedTiles = [
      createTile("honor", 1),
      createTile("honor", 1),
      createTile("man", 9)
    ];

    for (
      const discarderSeat of [1, 2, 3] as const
    ) {
      expect(
        getPonCallOptions(
          createInput(
            calledTile,
            concealedTiles,
            { discarderSeat }
          )
        )
      ).toHaveLength(1);
    }

    expect(
      getPonCallOptions(
        createInput(
          calledTile,
          concealedTiles,
          { discarderSeat: 0 }
        )
      )
    ).toEqual([]);
  });

  it("赤牌を含む実物の組合せを個別候補にする", () => {
    const calledTile =
      createTile("man", 5);
    const redFive =
      createTile("man", 5, true);
    const concealedTiles = [
      redFive,
      createTile("man", 5),
      createTile("man", 5),
      createTile("honor", 2)
    ];

    const options = getPonCallOptions(
      createInput(
        calledTile,
        concealedTiles
      )
    );

    expect(options).toHaveLength(3);
    expect(
      new Set(
        options.map((option) => option.id)
      ).size
    ).toBe(3);
    expect(
      options.filter((option) =>
        option.handTileIds.includes(
          redFive.id
        )
      )
    ).toHaveLength(2);
    expect(
      options.every(
        (option) =>
          option.kind === "pon" &&
          option.callerSeat === 0 &&
          option.discarderSeat === 3 &&
          option.calledTileId ===
            calledTile.id
      )
    ).toBe(true);
  });

  it("同種牌が2枚未満ならポン候補を作らない", () => {
    const calledTile =
      createTile("pin", 7);

    expect(
      getPonCallOptions(
        createInput(
          calledTile,
          [
            createTile("pin", 7),
            createTile("sou", 1)
          ]
        )
      )
    ).toEqual([]);
  });
});

describe("チー候補", () => {
  it("上家の数牌だけをチーでき字牌はチーできない", () => {
    const calledTile =
      createTile("man", 3);
    const concealedTiles = [
      createTile("man", 4),
      createTile("man", 5),
      createTile("honor", 1)
    ];

    expect(
      getChiCallOptions(
        createInput(
          calledTile,
          concealedTiles
        )
      )
    ).toHaveLength(1);
    expect(
      getChiCallOptions(
        createInput(
          calledTile,
          concealedTiles,
          { discarderSeat: 2 }
        )
      )
    ).toEqual([]);
    expect(
      getChiCallOptions(
        createInput(
          createTile("honor", 3),
          [
            createTile("honor", 4),
            createTile("honor", 5),
            createTile("man", 1)
          ]
        )
      )
    ).toEqual([]);
  });

  it("捨て牌を下・中央・上に使う3種類の順子を作る", () => {
    const calledTile =
      createTile("sou", 5);
    const concealedTiles = [
      createTile("sou", 3),
      createTile("sou", 4),
      createTile("sou", 6),
      createTile("sou", 7),
      createTile("honor", 1)
    ];
    const tilesById = new Map(
      concealedTiles.map(
        (tile) => [tile.id, tile]
      )
    );

    const options = getChiCallOptions(
      createInput(
        calledTile,
        concealedTiles
      )
    );

    expect(options).toHaveLength(3);
    expect(
      options.map((option) =>
        option.handTileIds.map(
          (tileId) =>
            tilesById.get(tileId)?.rank
        )
      )
    ).toEqual([
      [3, 4],
      [4, 6],
      [6, 7]
    ]);
  });

  it("赤五と通常五を別のチー候補にする", () => {
    const calledTile =
      createTile("pin", 4);
    const redFive =
      createTile("pin", 5, true);
    const concealedTiles = [
      redFive,
      createTile("pin", 5),
      createTile("pin", 6),
      createTile("honor", 1)
    ];

    const options = getChiCallOptions(
      createInput(
        calledTile,
        concealedTiles
      )
    );

    expect(options).toHaveLength(2);
    expect(
      options.filter((option) =>
        option.handTileIds.includes(
          redFive.id
        )
      )
    ).toHaveLength(1);
  });
});

describe("副露候補の禁止条件と優先順", () => {
  function createCombinedCallInput(
    overrides:
      Partial<MeldCallOptionInput> = {}
  ): MeldCallOptionInput {
    const calledTile =
      createTile("man", 5);

    return createInput(
      calledTile,
      [
        createTile("man", 5),
        createTile("man", 5),
        createTile("man", 3),
        createTile("man", 4),
        createTile("honor", 1)
      ],
      overrides
    );
  }

  it("立直後はチーとポンの候補を作らない", () => {
    expect(
      getMeldCallOptions(
        createCombinedCallInput({
          callerRiichi: true
        })
      )
    ).toEqual([]);
  });

  it("海底牌後はチーとポンの候補を作らない", () => {
    expect(
      getMeldCallOptions(
        createCombinedCallInput({
          liveWallTileCount: 0
        })
      )
    ).toEqual([]);
  });

  it("喰い替え禁止後に合法打牌がなければチーできない", () => {
    const calledTile =
      createTile("man", 3);
    const blockedTiles = [
      createTile("man", 4),
      createTile("man", 5),
      createTile("man", 3),
      createTile("man", 6)
    ];

    expect(
      getChiCallOptions(
        createInput(
          calledTile,
          blockedTiles
        )
      )
    ).toEqual([]);

    expect(
      getChiCallOptions(
        createInput(
          calledTile,
          [
            ...blockedTiles,
            createTile("honor", 1)
          ]
        )
      )
    ).toHaveLength(1);
  });

  it("ポン候補をチー候補より先に返す", () => {
    const options = getMeldCallOptions(
      createCombinedCallInput()
    );

    expect(
      options.map((option) => option.kind)
    ).toEqual([
      "pon",
      "chi"
    ]);
  });
});
