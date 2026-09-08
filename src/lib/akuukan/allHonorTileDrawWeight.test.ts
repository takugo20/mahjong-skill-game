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
  getAkuukanPlayerSkill4_9DrawWeightMultiplier
} from "./allHonorTileDrawWeight";
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
    id: `all-honor-tile-draw-${serialNumber}`,
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
      ? [{ id: "4-9", level }]
      : []
  });
}

describe("プレイヤースキル4-9 字牌引寄【全】", () => {
  it("各レベルの倍率を字牌へ適用する", () => {
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
        getAkuukanPlayerSkill4_9DrawWeightMultiplier({
          akuukan: createAkuukan(
            (index + 1) as SkillLevel
          ),
          drawerIsPlayer: true,
          candidate: createTile("honor", 1)
        })
      ).toBe(multipliers[index]);
    }
  });

  it("すべての風牌と三元牌へ倍率を適用する", () => {
    const akuukan = createAkuukan(5);

    for (let rank = 1; rank <= 7; rank += 1) {
      expect(
        getAkuukanPlayerSkill4_9DrawWeightMultiplier({
          akuukan,
          drawerIsPlayer: true,
          candidate: createTile("honor", rank)
        })
      ).toBe(2);
    }
  });

  it("萬子・筒子・索子には適用しない", () => {
    const akuukan = createAkuukan(5);

    for (
      const suit of [
        "man",
        "pin",
        "sou"
      ] as const
    ) {
      expect(
        getAkuukanPlayerSkill4_9DrawWeightMultiplier({
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
      "player-skill:4-9"
    );
    const candidate = createTile("honor", 7);

    expect(
      getAkuukanPlayerSkill4_9DrawWeightMultiplier({
        akuukan: enabled,
        drawerIsPlayer: false,
        candidate
      })
    ).toBe(1);

    expect(
      getAkuukanPlayerSkill4_9DrawWeightMultiplier({
        akuukan: createAkuukan(1, false),
        drawerIsPlayer: true,
        candidate
      })
    ).toBe(1);

    expect(
      getAkuukanPlayerSkill4_9DrawWeightMultiplier({
        akuukan: disabled,
        drawerIsPlayer: true,
        candidate
      })
    ).toBe(1);
  });
});
