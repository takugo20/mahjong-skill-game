import {
  describe,
  expect,
  it
} from "vitest";
import type {
  NumberSuit,
  Tile,
  TileSuit
} from "../mahjong/types";
import {
  AKUUKAN_PLAYER_SKILL_2_20_INSTANCE_ID,
  applyPlayerSkill2_20AtDeal,
  reservePlayerSkill2_20AfterWin
} from "./nextRoundSuitGuarantee";
import {
  beginAkuukanRound,
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `suit-guarantee-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createWinningTiles(
  suit: NumberSuit
): Tile[] {
  return [
    createTile(suit, 1),
    createTile(suit, 2),
    createTile(suit, 3),
    createTile("honor", 1),
    createTile("honor", 1)
  ];
}

function createAkuukan(
  equipped = true,
  level: 1 | 2 | 3 | 4 | 5 = 5
) {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: equipped
      ? [{
          id: "2-20",
          level
        }]
      : []
  });
}

describe("恩恵享受【色】の次局予約", () => {
  it.each([
    ["honitsu", "man"],
    ["honitsu", "pin"],
    ["honitsu", "sou"],
    ["chinitsu", "man"],
    ["chinitsu", "pin"],
    ["chinitsu", "sou"]
  ] as const)(
    "%sで使用した%sを記録して次局効果を予約する",
    (yakuId, suit) => {
      const result =
        reservePlayerSkill2_20AfterWin({
          akuukan: createAkuukan(),
          normalYakuIds: [yakuId],
          winningTiles:
            createWinningTiles(suit)
        });

      expect(
        result.playerSkill2_20ReservedSuit
      ).toBe(suit);
      expect(result.nextRoundEffects).toEqual([
        {
          instanceId:
            AKUUKAN_PLAYER_SKILL_2_20_INSTANCE_ID,
          sourceId: "player-skill:2-20",
          remainingTurns: null
        }
      ]);
    }
  );

  it("混一色と清一色が同時に渡されても予約は1件だけにする", () => {
    const initial = createAkuukan();
    const first =
      reservePlayerSkill2_20AfterWin({
        akuukan: initial,
        normalYakuIds: [
          "honitsu",
          "chinitsu"
        ],
        winningTiles:
          createWinningTiles("man")
      });
    const second =
      reservePlayerSkill2_20AfterWin({
        akuukan: first,
        normalYakuIds: ["chinitsu"],
        winningTiles:
          createWinningTiles("man")
      });

    expect(second).toBe(first);
    expect(second.nextRoundEffects).toHaveLength(
      1
    );
  });

  it("対象役がなければ予約しない", () => {
    const initial = createAkuukan();

    expect(
      reservePlayerSkill2_20AfterWin({
        akuukan: initial,
        normalYakuIds: ["pinfu"],
        winningTiles:
          createWinningTiles("pin")
      })
    ).toBe(initial);
  });

  it("複数の数牌色が混在していれば予約しない", () => {
    const initial = createAkuukan();

    expect(
      reservePlayerSkill2_20AfterWin({
        akuukan: initial,
        normalYakuIds: ["honitsu"],
        winningTiles: [
          createTile("man", 1),
          createTile("pin", 1),
          createTile("honor", 1)
        ]
      })
    ).toBe(initial);
  });

  it("未装備なら予約しない", () => {
    const initial = createAkuukan(false);

    expect(
      reservePlayerSkill2_20AfterWin({
        akuukan: initial,
        normalYakuIds: ["chinitsu"],
        winningTiles:
          createWinningTiles("sou")
      })
    ).toBe(initial);
  });

  it("スキルが無効なら予約しない", () => {
    const disabled = disableAkuukanSource(
      createAkuukan(),
      "player-skill:2-20"
    );

    expect(
      reservePlayerSkill2_20AfterWin({
        akuukan: disabled,
        normalYakuIds: ["honitsu"],
        winningTiles:
          createWinningTiles("man")
      })
    ).toBe(disabled);
  });

  it.each([
    [1, 4],
    [2, 5],
    [3, 6],
    [4, 7],
    [5, 9]
  ] as const)(
    "Lv.%sでは予約色を最低%s枚確保する",
    (level, expectedTileCount) => {
      const reserved =
        reservePlayerSkill2_20AfterWin({
          akuukan: createAkuukan(
            true,
            level
          ),
          normalYakuIds: ["chinitsu"],
          winningTiles:
            createWinningTiles("pin")
        });
      const active = beginAkuukanRound(
        reserved
      );
      const availableTiles = [
        ...Array.from(
          { length: 12 },
          (_, index) =>
            createTile(
              "pin",
              (index % 9) + 1
            )
        ),
        createTile("man", 1),
        createTile("sou", 1),
        createTile("honor", 1)
      ];

      const result =
        applyPlayerSkill2_20AtDeal({
          akuukan: active,
          availableTiles,
          alreadyReservedTiles: []
        });

      expect(
        result.minimumSuitTileCount
      ).toBe(expectedTileCount);
      expect(
        result.guaranteedSuitTileCount
      ).toBe(expectedTileCount);
      expect(
        result.reservedTiles
      ).toHaveLength(expectedTileCount);
      expect(
        result.reservedTiles.every(
          (tile) => tile.suit === "pin"
        )
      ).toBe(true);
      expect(
        result.remainingTiles.length +
          result.reservedTiles.length
      ).toBe(availableTiles.length);
      expect(result.consumed).toBe(true);
      expect(
        result.akuukan.activeEffects
      ).not.toContainEqual(
        expect.objectContaining({
          instanceId:
            AKUUKAN_PLAYER_SKILL_2_20_INSTANCE_ID
        })
      );
      expect(
        result.akuukan
          .playerSkill2_20ReservedSuit
      ).toBeUndefined();
    }
  );

  it("先に確保済みの同色牌を保証枚数へ含める", () => {
    const reserved =
      reservePlayerSkill2_20AfterWin({
        akuukan: createAkuukan(
          true,
          3
        ),
        normalYakuIds: ["honitsu"],
        winningTiles:
          createWinningTiles("sou")
      });
    const active = beginAkuukanRound(
      reserved
    );
    const alreadyReservedTiles = [
      createTile("sou", 1),
      createTile("sou", 1),
      createTile("sou", 2)
    ];

    const result =
      applyPlayerSkill2_20AtDeal({
        akuukan: active,
        availableTiles: [
          createTile("sou", 3),
          createTile("sou", 4),
          createTile("sou", 5),
          createTile("sou", 6),
          createTile("man", 1)
        ],
        alreadyReservedTiles
      });

    expect(result.minimumSuitTileCount).toBe(
      6
    );
    expect(result.reservedTiles).toHaveLength(
      3
    );
    expect(
      result.guaranteedSuitTileCount
    ).toBe(6);
  });

  it("次局効果がなければ牌を確保しない", () => {
    const akuukan = createAkuukan();
    const availableTiles = [
      createTile("man", 1),
      createTile("man", 2)
    ];

    const result =
      applyPlayerSkill2_20AtDeal({
        akuukan,
        availableTiles,
        alreadyReservedTiles: []
      });

    expect(result.akuukan).toBe(akuukan);
    expect(result.reservedTiles).toEqual([]);
    expect(result.remainingTiles).toEqual(
      availableTiles
    );
    expect(result.consumed).toBe(false);
  });
});
