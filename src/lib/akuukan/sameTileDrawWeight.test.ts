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
  getAkuukanPlayerSkill4_2DrawWeightMultiplier
} from "./sameTileDrawWeight";
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
    id: `same-tile-draw-${serialNumber}`,
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
      ? [{ id: "4-2", level }]
      : []
  });
}

describe("プレイヤースキル4-2 加速装置【縦】", () => {
  it("各レベルの倍率を同じ牌種へ適用する", () => {
    const multipliers = [
      1.1,
      1.2,
      1.3,
      1.4,
      1.5
    ] as const;

    for (
      let index = 0;
      index < multipliers.length;
      index += 1
    ) {
      expect(
        getAkuukanPlayerSkill4_2DrawWeightMultiplier({
          akuukan: createAkuukan(
            (index + 1) as SkillLevel
          ),
          drawerIsPlayer: true,
          hand: [createTile("pin", 5)],
          candidate: createTile("pin", 5)
        })
      ).toBe(multipliers[index]);
    }
  });

  it("赤牌と通常牌を同じ牌種として扱う", () => {
    expect(
      getAkuukanPlayerSkill4_2DrawWeightMultiplier({
        akuukan: createAkuukan(5),
        drawerIsPlayer: true,
        hand: [createTile("man", 5, true)],
        candidate: createTile("man", 5)
      })
    ).toBe(1.5);
  });

  it("同じ字牌にも倍率を適用する", () => {
    expect(
      getAkuukanPlayerSkill4_2DrawWeightMultiplier({
        akuukan: createAkuukan(5),
        drawerIsPlayer: true,
        hand: [createTile("honor", 7)],
        candidate: createTile("honor", 7)
      })
    ).toBe(1.5);
  });

  it("異なる色または数字の牌には適用しない", () => {
    const akuukan = createAkuukan(5);
    const hand = [createTile("sou", 5)];

    for (
      const candidate of [
        createTile("man", 5),
        createTile("sou", 4),
        createTile("sou", 6)
      ]
    ) {
      expect(
        getAkuukanPlayerSkill4_2DrawWeightMultiplier({
          akuukan,
          drawerIsPlayer: true,
          hand,
          candidate
        })
      ).toBe(1);
    }
  });

  it("手牌に同じ牌が複数あっても倍率を重複させない", () => {
    expect(
      getAkuukanPlayerSkill4_2DrawWeightMultiplier({
        akuukan: createAkuukan(5),
        drawerIsPlayer: true,
        hand: [
          createTile("pin", 3),
          createTile("pin", 3),
          createTile("pin", 3)
        ],
        candidate: createTile("pin", 3)
      })
    ).toBe(1.5);
  });

  it("CPU・未装備・発動元無効化中には適用しない", () => {
    const enabled = createAkuukan(5);
    const disabled = disableAkuukanSource(
      enabled,
      "player-skill:4-2"
    );
    const hand = [createTile("sou", 8)];
    const candidate = createTile("sou", 8);

    expect(
      getAkuukanPlayerSkill4_2DrawWeightMultiplier({
        akuukan: enabled,
        drawerIsPlayer: false,
        hand,
        candidate
      })
    ).toBe(1);
    expect(
      getAkuukanPlayerSkill4_2DrawWeightMultiplier({
        akuukan: createAkuukan(1, false),
        drawerIsPlayer: true,
        hand,
        candidate
      })
    ).toBe(1);
    expect(
      getAkuukanPlayerSkill4_2DrawWeightMultiplier({
        akuukan: disabled,
        drawerIsPlayer: true,
        hand,
        candidate
      })
    ).toBe(1);
  });
});
