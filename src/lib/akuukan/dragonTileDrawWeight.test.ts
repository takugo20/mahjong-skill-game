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
  getAkuukanPlayerSkill4_15DrawWeightMultiplier
} from "./dragonTileDrawWeight";
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
    id: `dragon-tile-draw-${serialNumber}`,
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
      ? [{ id: "4-15", level }]
      : []
  });
}

describe("プレイヤースキル4-15 字牌引寄【龍】", () => {
  it("各レベルの倍率を三元牌へ適用する", () => {
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
        getAkuukanPlayerSkill4_15DrawWeightMultiplier({
          akuukan: createAkuukan(
            (index + 1) as SkillLevel
          ),
          drawerIsPlayer: true,
          candidate: createTile("honor", 5)
        })
      ).toBe(multipliers[index]);
    }
  });

  it("白・發・中へ倍率を適用する", () => {
    const akuukan = createAkuukan(5);

    for (const rank of [5, 6, 7]) {
      expect(
        getAkuukanPlayerSkill4_15DrawWeightMultiplier({
          akuukan,
          drawerIsPlayer: true,
          candidate: createTile("honor", rank)
        })
      ).toBe(2);
    }
  });

  it("東・南・西・北には適用しない", () => {
    const akuukan = createAkuukan(5);

    for (const rank of [1, 2, 3, 4]) {
      expect(
        getAkuukanPlayerSkill4_15DrawWeightMultiplier({
          akuukan,
          drawerIsPlayer: true,
          candidate: createTile("honor", rank)
        })
      ).toBe(1);
    }
  });

  it("数牌には適用しない", () => {
    const akuukan = createAkuukan(5);

    for (
      const suit of [
        "man",
        "pin",
        "sou"
      ] as const
    ) {
      expect(
        getAkuukanPlayerSkill4_15DrawWeightMultiplier({
          akuukan,
          drawerIsPlayer: true,
          candidate: createTile(suit, 5)
        })
      ).toBe(1);
    }
  });

  it("CPU・未装備・発動元無効化中には適用しない", () => {
    const enabled = createAkuukan(5);
    const disabled = disableAkuukanSource(
      enabled,
      "player-skill:4-15"
    );
    const candidate = createTile("honor", 7);

    expect(
      getAkuukanPlayerSkill4_15DrawWeightMultiplier({
        akuukan: enabled,
        drawerIsPlayer: false,
        candidate
      })
    ).toBe(1);
    expect(
      getAkuukanPlayerSkill4_15DrawWeightMultiplier({
        akuukan: createAkuukan(1, false),
        drawerIsPlayer: true,
        candidate
      })
    ).toBe(1);
    expect(
      getAkuukanPlayerSkill4_15DrawWeightMultiplier({
        akuukan: disabled,
        drawerIsPlayer: true,
        candidate
      })
    ).toBe(1);
  });
});
