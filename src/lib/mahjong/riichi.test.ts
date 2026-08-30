import {
  describe,
  expect,
  it
} from "vitest";
import {
  canDeclareRiichi,
  getRiichiDiscardTileIds
} from "./riichi";
import type {
  RiichiCheckInput
} from "./riichi";
import type {
  Meld,
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
    id: `riichi-test-${serialNumber}`,
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

function createClosedRiichiHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [1, 2, 3]),
    ...createTiles("sou", [7, 8, 9]),
    ...createTiles("honor", [1, 2])
  ];
}

function createOneMeldRiichiHand(): Tile[] {
  return [
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [1, 2, 3]),
    ...createTiles("sou", [7, 8, 9]),
    ...createTiles("honor", [1, 2])
  ];
}

function createMeld(
  kind: Meld["kind"]
): Meld {
  const ranks = kind === "chi"
    ? [1, 2, 3]
    : kind === "pon"
      ? [1, 1, 1]
      : [1, 1, 1, 1];

  return {
    kind,
    tiles: createTiles("man", ranks)
  };
}

function createCheckInput(
  overrides:
    Partial<RiichiCheckInput> = {}
): RiichiCheckInput {
  return {
    concealedTiles:
      createClosedRiichiHand(),
    melds: [],
    score: 25000,
    liveWallTileCount: 20,
    alreadyRiichi: false,
    ...overrides
  };
}

describe("立直可能判定", () => {
  it("打牌後に聴牌する牌だけを宣言候補にする", () => {
    const input = createCheckInput();
    const hand = input.concealedTiles;

    expect(
      getRiichiDiscardTileIds(input)
    ).toEqual([
      hand[12].id,
      hand[13].id
    ]);

    expect(
      canDeclareRiichi(input)
    ).toBe(true);
  });

  it("持ち点が1000点ちょうどなら立直できる", () => {
    expect(
      canDeclareRiichi(
        createCheckInput({
          score: 1000
        })
      )
    ).toBe(true);
  });

  it("持ち点が1000点未満なら立直できない", () => {
    expect(
      canDeclareRiichi(
        createCheckInput({
          score: 999
        })
      )
    ).toBe(false);
  });

  it("通常山が4枚なら立直でき3枚ではできない", () => {
    expect(
      canDeclareRiichi(
        createCheckInput({
          liveWallTileCount: 4
        })
      )
    ).toBe(true);

    expect(
      canDeclareRiichi(
        createCheckInput({
          liveWallTileCount: 3
        })
      )
    ).toBe(false);
  });

  it("すでに立直している場合は再宣言できない", () => {
    expect(
      canDeclareRiichi(
        createCheckInput({
          alreadyRiichi: true
        })
      )
    ).toBe(false);
  });

  it("副露手では立直できない", () => {
    const openMeldKinds: Meld["kind"][] = [
      "chi",
      "pon",
      "openKan",
      "addedKan"
    ];

    for (const kind of openMeldKinds) {
      expect(
        canDeclareRiichi(
          createCheckInput({
            concealedTiles:
              createOneMeldRiichiHand(),
            melds: [createMeld(kind)]
          })
        )
      ).toBe(false);
    }
  });

    it("門前条件の例外が許可されれば副露手でも立直できる", () => {
    const concealedTiles =
      createOneMeldRiichiHand();
    const input = createCheckInput({
      concealedTiles,
      melds: [createMeld("chi")],
      allowOpenHand: true
    });

    expect(
      getRiichiDiscardTileIds(input)
    ).toEqual([
      concealedTiles[9].id,
      concealedTiles[10].id
    ]);

    expect(
      canDeclareRiichi(input)
    ).toBe(true);
  });

  it("暗槓だけなら門前として立直できる", () => {
    const concealedTiles =
      createOneMeldRiichiHand();

    const input = createCheckInput({
      concealedTiles,
      melds: [createMeld("closedKan")]
    });

    expect(
      getRiichiDiscardTileIds(input)
    ).toEqual([
      concealedTiles[9].id,
      concealedTiles[10].id
    ]);

    expect(
      canDeclareRiichi(input)
    ).toBe(true);
  });

  it("聴牌候補がない手牌や不正な枚数では立直できない", () => {
    const nonTenpaiHand = [
      ...createTiles(
        "man",
        [1, 1, 4, 4, 7, 7]
      ),
      ...createTiles(
        "pin",
        [1, 1, 4, 4]
      ),
      ...createTiles("sou", [1, 4]),
      ...createTiles("honor", [1, 2])
    ];

    expect(
      canDeclareRiichi(
        createCheckInput({
          concealedTiles: nonTenpaiHand
        })
      )
    ).toBe(false);

    expect(
      canDeclareRiichi(
        createCheckInput({
          concealedTiles:
            createClosedRiichiHand()
              .slice(0, 13)
        })
      )
    ).toBe(false);
  });
});
