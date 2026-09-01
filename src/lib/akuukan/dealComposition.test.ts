import {
  describe,
  expect,
  it
} from "vitest";
import type {
  Tile,
  TileSuit
} from "../mahjong/types";
import {
  calculateShanten
} from "../mahjong/hand";
import {
  AKUUKAN_E16_DORA_TRIPLET_SIZE,
  AKUUKAN_E26_TENPAI_HAND_SIZE,
  reserveAkuukanE16DoraTriplet,
  reserveAkuukanE26TenpaiHand
} from "./dealComposition";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number,
  red = false
): Tile {
  serialNumber += 1;

  return {
    id:
      `deal-composition-${serialNumber}`,
    suit,
    rank,
    red
  };
}

function createAkuukan(
  enemyId:
    | "enemy-8"
    | "enemy-9"
    | "enemy-14"
) {
  return createInitialAkuukanGameState({
    enemyId,
    equippedSkills: []
  });
}

function createTiles(
  suit: TileSuit,
  ranks: readonly number[]
): Tile[] {
  return ranks.map((rank) =>
    createTile(suit, rank)
  );
}

describe("E-16のドラ暗刻配牌予約", () => {
  it("残り牌から実ドラ3枚を予約する", () => {
    const doraIndicator =
      createTile("man", 4);
    const firstDora =
      createTile("man", 5, true);
    const secondDora =
      createTile("man", 5);
    const thirdDora =
      createTile("man", 5);
    const availableTiles = [
      createTile("man", 4),
      firstDora,
      createTile("pin", 5),
      secondDora,
      thirdDora,
      createTile("honor", 1)
    ];

    const result =
      reserveAkuukanE16DoraTriplet({
        akuukan:
          createAkuukan("enemy-9"),
        doraIndicator,
        availableTiles
      });

    expect(result.reservedTiles).toEqual([
      firstDora,
      secondDora,
      thirdDora
    ]);
    expect(result.remainingTiles).toEqual([
      availableTiles[0],
      availableTiles[2],
      availableTiles[5]
    ]);
  });

  it("実ドラが4枚あっても先頭の3枚だけを予約する", () => {
    const doraIndicator =
      createTile("pin", 4);
    const doraTiles = [
      createTile("pin", 5, true),
      createTile("pin", 5),
      createTile("pin", 5),
      createTile("pin", 5)
    ];
    const availableTiles = [
      doraTiles[0],
      createTile("sou", 5),
      doraTiles[1],
      doraTiles[2],
      doraTiles[3]
    ];
    const originalTiles = [
      ...availableTiles
    ];

    const result =
      reserveAkuukanE16DoraTriplet({
        akuukan:
          createAkuukan("enemy-9"),
        doraIndicator,
        availableTiles
      });

    expect(
      result.reservedTiles
    ).toHaveLength(
      AKUUKAN_E16_DORA_TRIPLET_SIZE
    );
    expect(result.reservedTiles).toEqual(
      doraTiles.slice(0, 3)
    );
    expect(result.remainingTiles).toEqual([
      availableTiles[1],
      doraTiles[3]
    ]);
    expect(availableTiles).toEqual(
      originalTiles
    );
  });

  it("実ドラが3枚未満なら存在する枚数だけを予約する", () => {
    const doraIndicator =
      createTile("sou", 8);
    const firstDora =
      createTile("sou", 9);
    const secondDora =
      createTile("sou", 9);
    const nonDora =
      createTile("sou", 8);

    const result =
      reserveAkuukanE16DoraTriplet({
        akuukan:
          createAkuukan("enemy-9"),
        doraIndicator,
        availableTiles: [
          firstDora,
          nonDora,
          secondDora
        ]
      });

    expect(result.reservedTiles).toEqual([
      firstDora,
      secondDora
    ]);
    expect(result.remainingTiles).toEqual([
      nonDora
    ]);
  });

  it("数牌・風牌・三元牌の循環後の牌を実ドラとして扱う", () => {
    const cases = [
      {
        indicator: createTile("man", 9),
        dora: createTile("man", 1)
      },
      {
        indicator: createTile("honor", 4),
        dora: createTile("honor", 1)
      },
      {
        indicator: createTile("honor", 7),
        dora: createTile("honor", 5)
      }
    ];

    for (const currentCase of cases) {
      const nonDora = createTile(
        currentCase.dora.suit,
        currentCase.dora.rank === 1
          ? 2
          : 6
      );
      const result =
        reserveAkuukanE16DoraTriplet({
          akuukan:
            createAkuukan("enemy-9"),
          doraIndicator:
            currentCase.indicator,
          availableTiles: [
            nonDora,
            currentCase.dora
          ]
        });

      expect(result.reservedTiles).toEqual([
        currentCase.dora
      ]);
      expect(result.remainingTiles).toEqual([
        nonDora
      ]);
    }
  });

  it("E-16を持たない敵では牌を予約しない", () => {
    const availableTiles = [
      createTile("man", 5),
      createTile("man", 5),
      createTile("man", 5)
    ];

    const result =
      reserveAkuukanE16DoraTriplet({
        akuukan:
          createAkuukan("enemy-8"),
        doraIndicator:
          createTile("man", 4),
        availableTiles
      });

    expect(result.reservedTiles).toEqual([]);
    expect(result.remainingTiles).toEqual(
      availableTiles
    );
    expect(result.remainingTiles).not.toBe(
      availableTiles
    );
  });

  it("E-16が無効なら牌を予約しない", () => {
    const akuukan = disableAkuukanSource(
      createAkuukan("enemy-9"),
      "enemy-ability:E-16"
    );
    const availableTiles = [
      createTile("honor", 5),
      createTile("honor", 5),
      createTile("honor", 5)
    ];

    const result =
      reserveAkuukanE16DoraTriplet({
        akuukan,
        doraIndicator:
          createTile("honor", 7),
        availableTiles
      });

    expect(result.reservedTiles).toEqual([]);
    expect(result.remainingTiles).toEqual(
      availableTiles
    );
  });
});

describe("E-26の配牌聴牌保証", () => {
  it("通常形で聴牌する13枚を残り牌から予約する", () => {
    const unreservedTile =
      createTile("honor", 4);
    const availableTiles = [
      ...createTiles(
        "man",
        [1, 2, 3, 4, 5, 6, 7, 8, 9]
      ),
      ...createTiles("pin", [1, 2, 3]),
      createTile("sou", 5),
      unreservedTile
    ];
    const originalTiles = [
      ...availableTiles
    ];

    const result =
      reserveAkuukanE26TenpaiHand({
        akuukan:
          createAkuukan("enemy-14"),
        availableTiles
      });

    expect(result.tenpaiGuaranteed).toBe(
      true
    );
    expect(
      result.reservedTiles
    ).toHaveLength(
      AKUUKAN_E26_TENPAI_HAND_SIZE
    );
    expect(
      calculateShanten(
        result.reservedTiles
      ).minimum
    ).toBe(0);
    expect(result.remainingTiles).toEqual([
      unreservedTile
    ]);
    expect(availableTiles).toEqual(
      originalTiles
    );
  });

  it("通常形を作れない場合は七対子の聴牌形を予約する", () => {
    const availableTiles = createTiles(
      "honor",
      [
        1,
        1,
        2,
        2,
        3,
        3,
        4,
        4,
        5,
        5,
        6,
        6,
        7
      ]
    );

    const result =
      reserveAkuukanE26TenpaiHand({
        akuukan:
          createAkuukan("enemy-14"),
        availableTiles
      });
    const shanten = calculateShanten(
      result.reservedTiles
    );

    expect(result.tenpaiGuaranteed).toBe(
      true
    );
    expect(shanten.minimum).toBe(0);
    expect(shanten.sevenPairs).toBe(0);
    expect(result.remainingTiles).toEqual(
      []
    );
  });

  it("通常形と七対子を作れない場合は国士無双の聴牌形を予約する", () => {
    const availableTiles = [
      ...createTiles("man", [1, 9]),
      ...createTiles("pin", [1, 9]),
      ...createTiles("sou", [1, 9]),
      ...createTiles(
        "honor",
        [1, 2, 3, 4, 5, 6, 7]
      )
    ];

    const result =
      reserveAkuukanE26TenpaiHand({
        akuukan:
          createAkuukan("enemy-14"),
        availableTiles
      });
    const shanten = calculateShanten(
      result.reservedTiles
    );

    expect(result.tenpaiGuaranteed).toBe(
      true
    );
    expect(shanten.minimum).toBe(0);
    expect(shanten.thirteenOrphans).toBe(
      0
    );
    expect(result.remainingTiles).toEqual(
      []
    );
  });

  it("E-26を持たない敵では牌を予約しない", () => {
    const availableTiles = [
      ...createTiles(
        "man",
        [1, 2, 3, 4, 5, 6, 7, 8, 9]
      ),
      ...createTiles("pin", [1, 2, 3]),
      createTile("sou", 5)
    ];

    const result =
      reserveAkuukanE26TenpaiHand({
        akuukan:
          createAkuukan("enemy-9"),
        availableTiles
      });

    expect(result.tenpaiGuaranteed).toBe(
      false
    );
    expect(result.reservedTiles).toEqual(
      []
    );
    expect(result.remainingTiles).toEqual(
      availableTiles
    );
    expect(result.remainingTiles).not.toBe(
      availableTiles
    );
  });

  it("E-26が無効なら牌を予約しない", () => {
    const akuukan = disableAkuukanSource(
      createAkuukan("enemy-14"),
      "enemy-ability:E-26"
    );
    const availableTiles = [
      ...createTiles(
        "man",
        [1, 2, 3, 4, 5, 6, 7, 8, 9]
      ),
      ...createTiles("pin", [1, 2, 3]),
      createTile("sou", 5)
    ];

    const result =
      reserveAkuukanE26TenpaiHand({
        akuukan,
        availableTiles
      });

    expect(result.tenpaiGuaranteed).toBe(
      false
    );
    expect(result.reservedTiles).toEqual(
      []
    );
    expect(result.remainingTiles).toEqual(
      availableTiles
    );
  });

  it("残り牌が13枚未満なら牌を予約しない", () => {
    const availableTiles = createTiles(
      "man",
      [1, 2, 3, 4, 5, 6, 7, 8, 9]
    );

    const result =
      reserveAkuukanE26TenpaiHand({
        akuukan:
          createAkuukan("enemy-14"),
        availableTiles
      });

    expect(result.tenpaiGuaranteed).toBe(
      false
    );
    expect(result.reservedTiles).toEqual(
      []
    );
    expect(result.remainingTiles).toEqual(
      availableTiles
    );
  });

  it("13枚あっても聴牌形を構成できなければ牌を予約しない", () => {
    const availableTiles = createTiles(
      "honor",
      [
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        4
      ]
    );

    const result =
      reserveAkuukanE26TenpaiHand({
        akuukan:
          createAkuukan("enemy-14"),
        availableTiles
      });

    expect(result.tenpaiGuaranteed).toBe(
      false
    );
    expect(result.reservedTiles).toEqual(
      []
    );
    expect(result.remainingTiles).toEqual(
      availableTiles
    );
  });
});
