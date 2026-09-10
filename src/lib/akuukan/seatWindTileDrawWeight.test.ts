import {
  describe,
  expect,
  it
} from "vitest";
import type {
  Tile,
  TileSuit,
  Wind
} from "../mahjong/types";
import {
  getAkuukanPlayerSkill4_16DrawWeightMultiplier
} from "./seatWindTileDrawWeight";
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
    id: `seat-wind-tile-draw-${serialNumber}`,
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
      ? [{ id: "4-16", level }]
      : []
  });
}

describe("プレイヤースキル4-16 字牌引寄【門】", () => {
  it("各レベルの倍率を自風牌へ適用する", () => {
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
        getAkuukanPlayerSkill4_16DrawWeightMultiplier({
          akuukan: createAkuukan(
            (index + 1) as SkillLevel
          ),
          drawerIsPlayer: true,
          seatWind: "east",
          candidate: createTile("honor", 1)
        })
      ).toBe(multipliers[index]);
    }
  });

  it("東・南・西・北の各自風に対応する牌へ適用する", () => {
    const akuukan = createAkuukan(5);
    const windRanks: readonly [Wind, number][] = [
      ["east", 1],
      ["south", 2],
      ["west", 3],
      ["north", 4]
    ];

    for (const [seatWind, rank] of windRanks) {
      expect(
        getAkuukanPlayerSkill4_16DrawWeightMultiplier({
          akuukan,
          drawerIsPlayer: true,
          seatWind,
          candidate: createTile("honor", rank)
        })
      ).toBe(2);
    }
  });

  it("自風以外の風牌と三元牌には適用しない", () => {
    const akuukan = createAkuukan(5);

    for (const rank of [1, 3, 4, 5, 6, 7]) {
      expect(
        getAkuukanPlayerSkill4_16DrawWeightMultiplier({
          akuukan,
          drawerIsPlayer: true,
          seatWind: "south",
          candidate: createTile("honor", rank)
        })
      ).toBe(1);
    }
  });

  it("同じ数字でも数牌には適用しない", () => {
    const akuukan = createAkuukan(5);

    for (
      const suit of [
        "man",
        "pin",
        "sou"
      ] as const
    ) {
      expect(
        getAkuukanPlayerSkill4_16DrawWeightMultiplier({
          akuukan,
          drawerIsPlayer: true,
          seatWind: "west",
          candidate: createTile(suit, 3)
        })
      ).toBe(1);
    }
  });

  it("CPU・未装備・発動元無効化中には適用しない", () => {
    const enabled = createAkuukan(5);
    const disabled = disableAkuukanSource(
      enabled,
      "player-skill:4-16"
    );
    const candidate = createTile("honor", 4);

    expect(
      getAkuukanPlayerSkill4_16DrawWeightMultiplier({
        akuukan: enabled,
        drawerIsPlayer: false,
        seatWind: "north",
        candidate
      })
    ).toBe(1);
    expect(
      getAkuukanPlayerSkill4_16DrawWeightMultiplier({
        akuukan: createAkuukan(1, false),
        drawerIsPlayer: true,
        seatWind: "north",
        candidate
      })
    ).toBe(1);
    expect(
      getAkuukanPlayerSkill4_16DrawWeightMultiplier({
        akuukan: disabled,
        drawerIsPlayer: true,
        seatWind: "north",
        candidate
      })
    ).toBe(1);
  });
});
