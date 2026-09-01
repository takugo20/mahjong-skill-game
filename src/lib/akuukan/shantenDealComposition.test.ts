import {
  describe,
  expect,
  it
} from "vitest";
import {
  calculateShanten
} from "../mahjong/hand";
import {
  createFullTileSet
} from "../mahjong/tiles";
import type {
  Tile
} from "../mahjong/types";
import {
  AKUUKAN_E29_HAND_SIZE,
  AKUUKAN_E29_OTHER_PLAYER_MIN_SHANTEN,
  AKUUKAN_E29_SELECTED_ENEMY_MAX_SHANTEN,
  reserveAkuukanE29ShantenHands
} from "./shantenDealComposition";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";

const E29_TEST_SEEDS = [
  1,
  2,
  3,
  123456789,
  987654321
] as const;

function createSeededRandom(
  initialSeed: number
): () => number {
  let seed = initialSeed >>> 0;

  return () => {
    seed = (
      seed * 1664525 +
      1013904223
    ) >>> 0;

    return seed / 0x100000000;
  };
}

function shuffleTiles(
  tiles: readonly Tile[],
  random: () => number
): Tile[] {
  const result = [...tiles];

  for (
    let index = result.length - 1;
    index > 0;
    index -= 1
  ) {
    const otherIndex = Math.floor(
      random() * (index + 1)
    );
    const current = result[index];

    result[index] = result[otherIndex];
    result[otherIndex] = current;
  }

  return result;
}

function createAvailableTiles(
  seed: number
): Tile[] {
  return shuffleTiles(
    createFullTileSet(),
    createSeededRandom(seed)
  ).slice(0, -14);
}

function createE29Akuukan() {
  return createInitialAkuukanGameState({
    enemyId: "enemy-16",
    equippedSkills: []
  });
}

function getShantenBySeat(
  reservedTilesBySeat:
    readonly (readonly Tile[])[]
): number[] {
  return reservedTilesBySeat.map(
    (tiles) =>
      calculateShanten(tiles).minimum
  );
}

describe("E-29の向聴数強制配牌", () => {
  it.each(E29_TEST_SEEDS)(
    "牌山が異なっても敵16を1向聴以下、他家を4向聴以上にする seed=%i",
    (seed) => {
      const availableTiles =
        createAvailableTiles(seed);
      const originalTiles = [
        ...availableTiles
      ];

      const result =
        reserveAkuukanE29ShantenHands({
          akuukan: createE29Akuukan(),
          availableTiles
        });
      const shantenBySeat =
        getShantenBySeat(
          result.reservedTilesBySeat
        );

      expect(
        result.constraintsSatisfied
      ).toBe(true);
      expect(
        result.reservedTilesBySeat.map(
          (hand) => hand.length
        )
      ).toEqual([
        AKUUKAN_E29_HAND_SIZE,
        AKUUKAN_E29_HAND_SIZE,
        AKUUKAN_E29_HAND_SIZE,
        AKUUKAN_E29_HAND_SIZE
      ]);
      expect(shantenBySeat[2]).toBeLessThanOrEqual(
        AKUUKAN_E29_SELECTED_ENEMY_MAX_SHANTEN
      );

      for (const seat of [0, 1, 3]) {
        expect(
          shantenBySeat[seat]
        ).toBeGreaterThanOrEqual(
          AKUUKAN_E29_OTHER_PLAYER_MIN_SHANTEN
        );
      }

      expect(
        result.remainingTiles
      ).toHaveLength(70);

      const allReservedAndRemainingIds = [
        ...result.reservedTilesBySeat.flatMap(
          (hand) =>
            hand.map((tile) => tile.id)
        ),
        ...result.remainingTiles.map(
          (tile) => tile.id
        )
      ];

      expect(
        allReservedAndRemainingIds
      ).toHaveLength(122);
      expect(
        new Set(
          allReservedAndRemainingIds
        ).size
      ).toBe(122);
      expect(availableTiles).toEqual(
        originalTiles
      );
    }
  );

  it("E-29を持たない敵では牌を予約しない", () => {
    const availableTiles =
      createAvailableTiles(1);
    const akuukan =
      createInitialAkuukanGameState({
        enemyId: "enemy-15",
        equippedSkills: []
      });

    const result =
      reserveAkuukanE29ShantenHands({
        akuukan,
        availableTiles
      });

    expect(
      result.constraintsSatisfied
    ).toBe(false);
    expect(
      result.reservedTilesBySeat
    ).toEqual([[], [], [], []]);
    expect(result.remainingTiles).toEqual(
      availableTiles
    );
    expect(result.remainingTiles).not.toBe(
      availableTiles
    );
  });

  it("E-29が無効なら牌を予約しない", () => {
    const availableTiles =
      createAvailableTiles(2);
    const akuukan = disableAkuukanSource(
      createE29Akuukan(),
      "enemy-ability:E-29"
    );

    const result =
      reserveAkuukanE29ShantenHands({
        akuukan,
        availableTiles
      });

    expect(
      result.constraintsSatisfied
    ).toBe(false);
    expect(
      result.reservedTilesBySeat
    ).toEqual([[], [], [], []]);
    expect(result.remainingTiles).toEqual(
      availableTiles
    );
  });

  it("4人分の52枚がなければ牌を予約しない", () => {
    const availableTiles =
      createAvailableTiles(3).slice(0, 51);

    const result =
      reserveAkuukanE29ShantenHands({
        akuukan: createE29Akuukan(),
        availableTiles
      });

    expect(
      result.constraintsSatisfied
    ).toBe(false);
    expect(
      result.reservedTilesBySeat
    ).toEqual([[], [], [], []]);
    expect(result.remainingTiles).toEqual(
      availableTiles
    );
  });

  it("52枚あっても条件を構成できなければ通常配牌へ戻す", () => {
    const availableTiles = Array.from(
      { length: 52 },
      (_, index): Tile => ({
        id: `e29-impossible-${index}`,
        suit: "honor",
        rank: 1,
        red: false
      })
    );

    const result =
      reserveAkuukanE29ShantenHands({
        akuukan: createE29Akuukan(),
        availableTiles
      });

    expect(
      result.constraintsSatisfied
    ).toBe(false);
    expect(
      result.reservedTilesBySeat
    ).toEqual([[], [], [], []]);
    expect(result.remainingTiles).toEqual(
      availableTiles
    );
  });
});
