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
  getAkuukanPlayerSkill4_12DrawWeightMultiplier
} from "./manTileDrawWeight";
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
  rank: number,
  red = false
): Tile {
  serialNumber += 1;

  return {
    id: `man-tile-draw-${serialNumber}`,
    suit,
    rank,
    red
  };
}

function createAkuukan(
  level: SkillLevel = 1,
  equipped = true
) {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: equipped
      ? [{ id: "4-12", level }]
      : []
  });
}

describe("プレイヤースキル4-12 数牌引寄【萬】", () => {
  it("各レベルの倍率を萬子へ適用する", () => {
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
        getAkuukanPlayerSkill4_12DrawWeightMultiplier({
          akuukan: createAkuukan(
            (index + 1) as SkillLevel
          ),
          drawerIsPlayer: true,
          candidate: createTile("man", 1)
        })
      ).toBe(multipliers[index]);
    }
  });

  it("萬子の1から9まですべてへ倍率を適用する", () => {
    const akuukan = createAkuukan(5);

    for (let rank = 1; rank <= 9; rank += 1) {
      expect(
        getAkuukanPlayerSkill4_12DrawWeightMultiplier({
          akuukan,
          drawerIsPlayer: true,
          candidate: createTile("man", rank)
        })
      ).toBe(2);
    }
  });

  it("赤五萬にも倍率を適用する", () => {
    expect(
      getAkuukanPlayerSkill4_12DrawWeightMultiplier({
        akuukan: createAkuukan(5),
        drawerIsPlayer: true,
        candidate: createTile("man", 5, true)
      })
    ).toBe(2);
  });

  it("筒子・索子・字牌には適用しない", () => {
    const akuukan = createAkuukan(5);

    for (
      const suit of [
        "pin",
        "sou",
        "honor"
      ] as const
    ) {
      expect(
        getAkuukanPlayerSkill4_12DrawWeightMultiplier({
          akuukan,
          drawerIsPlayer: true,
          candidate: createTile(suit, 1)
        })
      ).toBe(1);
    }
  });

  it("CPU・未装備・発動元無効化中には適用しない", () => {
    const enabled = createAkuukan(5);
    const disabled = disableAkuukanSource(
      enabled,
      "player-skill:4-12"
    );
    const candidate = createTile("man", 9);

    expect(
      getAkuukanPlayerSkill4_12DrawWeightMultiplier({
        akuukan: enabled,
        drawerIsPlayer: false,
        candidate
      })
    ).toBe(1);

    expect(
      getAkuukanPlayerSkill4_12DrawWeightMultiplier({
        akuukan: createAkuukan(1, false),
        drawerIsPlayer: true,
        candidate
      })
    ).toBe(1);

    expect(
      getAkuukanPlayerSkill4_12DrawWeightMultiplier({
        akuukan: disabled,
        drawerIsPlayer: true,
        candidate
      })
    ).toBe(1);
  });
});
