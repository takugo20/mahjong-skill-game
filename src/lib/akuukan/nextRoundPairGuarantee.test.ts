import {
  describe,
  expect,
  it
} from "vitest";
import {
  AKUUKAN_PLAYER_SKILL_2_19_INSTANCE_ID,
  applyPlayerSkill2_19AtDeal,
  reservePlayerSkill2_19AfterWin
} from "./nextRoundPairGuarantee";
import {
  beginAkuukanRound,
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  Tile,
  TileSuit
} from "../mahjong/types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `pair-guarantee-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createTiles(
  suit: TileSuit,
  rank: number,
  count: number
): Tile[] {
  return Array.from(
    { length: count },
    () => createTile(suit, rank)
  );
}

function createAkuukan(
  equipped = true,
  level: 1 | 2 | 3 | 4 | 5 = 5
) {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: equipped
      ? [
          {
            id: "2-19",
            level
          }
        ]
      : []
  });
}

describe("恩恵享受【縦】の次局予約", () => {
  it.each([
    "sevenPairs",
    "toitoi",
    "sanshokuDoukou",
    "sanankou",
    "sankantsu"
  ] as const)(
    "%sが成立した和了後に対子保証を予約する",
    (yakuId) => {
      const result =
        reservePlayerSkill2_19AfterWin({
          akuukan: createAkuukan(),
          normalYakuIds: [yakuId]
        });

      expect(result.nextRoundEffects).toEqual([
        {
          instanceId:
            AKUUKAN_PLAYER_SKILL_2_19_INSTANCE_ID,
          sourceId: "player-skill:2-19",
          remainingTurns: null
        }
      ]);
    }
  );

  it("対象役が複数成立しても予約は1件だけにする", () => {
    const initial = createAkuukan();
    const first =
      reservePlayerSkill2_19AfterWin({
        akuukan: initial,
        normalYakuIds: [
          "toitoi",
          "sanankou"
        ]
      });
    const second =
      reservePlayerSkill2_19AfterWin({
        akuukan: first,
        normalYakuIds: ["sankantsu"]
      });

    expect(second).toBe(first);
    expect(second.nextRoundEffects).toHaveLength(
      1
    );
  });

  it("対象外の役では予約しない", () => {
    const initial = createAkuukan();

    expect(
      reservePlayerSkill2_19AfterWin({
        akuukan: initial,
        normalYakuIds: ["pinfu"]
      })
    ).toBe(initial);
  });

  it("未装備なら予約しない", () => {
    const initial = createAkuukan(false);

    expect(
      reservePlayerSkill2_19AfterWin({
        akuukan: initial,
        normalYakuIds: ["sevenPairs"]
      })
    ).toBe(initial);
  });

  it("スキルが無効なら予約しない", () => {
    const disabled = disableAkuukanSource(
      createAkuukan(),
      "player-skill:2-19"
    );

    expect(
      reservePlayerSkill2_19AfterWin({
        akuukan: disabled,
        normalYakuIds: ["sevenPairs"]
      })
    ).toBe(disabled);
  });

  it.each([
    [1, 2],
    [2, 2],
    [3, 3],
    [4, 3],
    [5, 4]
  ] as const)(
    "Lv.%sでは最低%s対子を配牌用に確保する",
    (level, expectedPairCount) => {
      const reserved =
        reservePlayerSkill2_19AfterWin({
          akuukan: createAkuukan(
            true,
            level
          ),
          normalYakuIds: ["toitoi"]
        });
      const active = beginAkuukanRound(
        reserved
      );
      const availableTiles = [
        ...createTiles("man", 1, 2),
        ...createTiles("man", 2, 2),
        ...createTiles("pin", 3, 2),
        ...createTiles("sou", 4, 2),
        createTile("honor", 1)
      ];

      const result =
        applyPlayerSkill2_19AtDeal({
          akuukan: active,
          availableTiles
        });

      expect(result.minimumPairCount).toBe(
        expectedPairCount
      );
      expect(result.guaranteedPairCount).toBe(
        expectedPairCount
      );
      expect(result.reservedTiles).toHaveLength(
        expectedPairCount * 2
      );
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
            AKUUKAN_PLAYER_SKILL_2_19_INSTANCE_ID
        })
      );
    }
  );

  it("同じ牌が3枚または4枚あっても各1対子として数える", () => {
    const reserved =
      reservePlayerSkill2_19AfterWin({
        akuukan: createAkuukan(
          true,
          3
        ),
        normalYakuIds: ["sanankou"]
      });
    const active = beginAkuukanRound(
      reserved
    );

    const result =
      applyPlayerSkill2_19AtDeal({
        akuukan: active,
        availableTiles: [
          ...createTiles("man", 1, 3),
          ...createTiles("pin", 2, 4),
          ...createTiles("sou", 3, 2),
          createTile("honor", 1)
        ]
      });

    expect(result.guaranteedPairCount).toBe(
      3
    );
    expect(result.reservedTiles).toHaveLength(
      6
    );
  });

  it("次局効果がなければ牌を確保しない", () => {
    const akuukan = createAkuukan(
      true,
      5
    );
    const availableTiles = [
      ...createTiles("man", 1, 2),
      ...createTiles("pin", 2, 2)
    ];

    const result =
      applyPlayerSkill2_19AtDeal({
        akuukan,
        availableTiles
      });

    expect(result.akuukan).toBe(akuukan);
    expect(result.reservedTiles).toEqual([]);
    expect(result.remainingTiles).toEqual(
      availableTiles
    );
    expect(result.consumed).toBe(false);
  });

    it("後続の色保証があれば同じ色の対子を優先する", () => {
    const reserved =
      reservePlayerSkill2_19AfterWin({
        akuukan: createAkuukan(
          true,
          1
        ),
        normalYakuIds: ["toitoi"]
      });
    const active = beginAkuukanRound(
      reserved
    );

    const result =
      applyPlayerSkill2_19AtDeal({
        akuukan: active,
        availableTiles: [
          ...createTiles("pin", 1, 2),
          ...createTiles("sou", 2, 2),
          ...createTiles("man", 3, 2),
          ...createTiles("man", 4, 2)
        ],
        preferredSuit: "man"
      });

    expect(
      result.reservedTiles.every(
        (tile) => tile.suit === "man"
      )
    ).toBe(true);
    expect(result.reservedTiles).toHaveLength(
      4
    );
  });
});
