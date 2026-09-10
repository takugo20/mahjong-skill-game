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
  getAkuukanPlayerSkill4_10DrawWeightMultiplier
} from "./souTileDrawWeight";
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
    id: `sou-tile-draw-${serialNumber}`,
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
      ? [{ id: "4-10", level }]
      : []
  });
}

describe("プレイヤースキル4-10 数牌引寄【索】", () => {
  it("各レベルの倍率を索子へ適用する", () => {
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
        getAkuukanPlayerSkill4_10DrawWeightMultiplier({
          akuukan: createAkuukan(
            (index + 1) as SkillLevel
          ),
          drawerIsPlayer: true,
          candidate: createTile("sou", 1)
        })
      ).toBe(multipliers[index]);
    }
  });

  it("索子の1から9まですべてへ倍率を適用する", () => {
    const akuukan = createAkuukan(5);

    for (let rank = 1; rank <= 9; rank += 1) {
      expect(
        getAkuukanPlayerSkill4_10DrawWeightMultiplier({
          akuukan,
          drawerIsPlayer: true,
          candidate: createTile("sou", rank)
        })
      ).toBe(2);
    }
  });

  it("赤五索にも倍率を適用する", () => {
    expect(
      getAkuukanPlayerSkill4_10DrawWeightMultiplier({
        akuukan: createAkuukan(5),
        drawerIsPlayer: true,
        candidate: createTile("sou", 5, true)
      })
    ).toBe(2);
  });

  it("萬子・筒子・字牌には適用しない", () => {
    const akuukan = createAkuukan(5);

    for (
      const suit of [
        "man",
        "pin",
        "honor"
      ] as const
    ) {
      expect(
        getAkuukanPlayerSkill4_10DrawWeightMultiplier({
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
      "player-skill:4-10"
    );
    const candidate = createTile("sou", 9);

    expect(
      getAkuukanPlayerSkill4_10DrawWeightMultiplier({
        akuukan: enabled,
        drawerIsPlayer: false,
        candidate
      })
    ).toBe(1);

    expect(
      getAkuukanPlayerSkill4_10DrawWeightMultiplier({
        akuukan: createAkuukan(1, false),
        drawerIsPlayer: true,
        candidate
      })
    ).toBe(1);

    expect(
      getAkuukanPlayerSkill4_10DrawWeightMultiplier({
        akuukan: disabled,
        drawerIsPlayer: true,
        candidate
      })
    ).toBe(1);
  });
});
