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
  getAkuukanPlayerSkill4_13DrawWeightMultiplier
} from "./outerNumberTileDrawWeight";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  SkillLevel
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `outer-number-tile-draw-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createAkuukan(
  level: SkillLevel = 1,
  equipped = true
) {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: equipped
      ? [{ id: "4-13", level }]
      : []
  });
}

describe("プレイヤースキル4-13 数牌引寄【外】", () => {
  it("各レベルの倍率を外側の数牌へ適用する", () => {
    const multipliers = [
      1.1,
      1.2,
      1.3,
      1.5,
      2
    ] as const;

    for (
      let index = 0;
      index < multipliers.length;
      index += 1
    ) {
      expect(
        getAkuukanPlayerSkill4_13DrawWeightMultiplier({
          akuukan: createAkuukan(
            (index + 1) as SkillLevel
          ),
          drawerIsPlayer: true,
          candidate: createTile("man", 1)
        })
      ).toBe(multipliers[index]);
    }
  });

  it("3種類すべての1・2・3・7・8・9へ適用する", () => {
    const akuukan = createAkuukan(5);
    const suits: readonly NumberSuit[] = [
      "man",
      "pin",
      "sou"
    ];
    const ranks = [
      1,
      2,
      3,
      7,
      8,
      9
    ];

    for (const suit of suits) {
      for (const rank of ranks) {
        expect(
          getAkuukanPlayerSkill4_13DrawWeightMultiplier({
            akuukan,
            drawerIsPlayer: true,
            candidate: createTile(suit, rank)
          })
        ).toBe(2);
      }
    }
  });

  it("4・5・6の数牌には適用しない", () => {
    const akuukan = createAkuukan(5);

    for (const rank of [4, 5, 6]) {
      expect(
        getAkuukanPlayerSkill4_13DrawWeightMultiplier({
          akuukan,
          drawerIsPlayer: true,
          candidate: createTile("pin", rank)
        })
      ).toBe(1);
    }
  });

  it("同じ数字でも字牌には適用しない", () => {
    const akuukan = createAkuukan(5);

    for (let rank = 1; rank <= 7; rank += 1) {
      expect(
        getAkuukanPlayerSkill4_13DrawWeightMultiplier({
          akuukan,
          drawerIsPlayer: true,
          candidate: createTile("honor", rank)
        })
      ).toBe(1);
    }
  });

  it("CPU・未装備・発動元無効化中には適用しない", () => {
    const enabled = createAkuukan(5);
    const disabled = disableAkuukanSource(
      enabled,
      "player-skill:4-13"
    );
    const candidate = createTile("sou", 9);

    expect(
      getAkuukanPlayerSkill4_13DrawWeightMultiplier({
        akuukan: enabled,
        drawerIsPlayer: false,
        candidate
      })
    ).toBe(1);

    expect(
      getAkuukanPlayerSkill4_13DrawWeightMultiplier({
        akuukan: createAkuukan(1, false),
        drawerIsPlayer: true,
        candidate
      })
    ).toBe(1);

    expect(
      getAkuukanPlayerSkill4_13DrawWeightMultiplier({
        akuukan: disabled,
        drawerIsPlayer: true,
        candidate
      })
    ).toBe(1);
  });
});
