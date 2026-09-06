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
  reservePlayerSkill2_20AfterWin
} from "./nextRoundSuitGuarantee";
import {
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
  equipped = true
) {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: equipped
      ? [{
          id: "2-20",
          level: 5
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
});
