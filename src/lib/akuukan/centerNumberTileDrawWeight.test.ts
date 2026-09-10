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
  getAkuukanPlayerSkill4_14DrawWeightMultiplier
} from "./centerNumberTileDrawWeight";
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
    id: `center-number-tile-draw-${serialNumber}`,
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
      ? [{ id: "4-14", level }]
      : []
  });
}

describe("プレイヤースキル4-14 数牌引寄【中】", () => {
  it("各レベルの倍率を中央寄りの数牌へ適用する", () => {
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
        getAkuukanPlayerSkill4_14DrawWeightMultiplier({
          akuukan: createAkuukan(
            (index + 1) as SkillLevel
          ),
          drawerIsPlayer: true,
          candidate: createTile("man", 5)
        })
      ).toBe(multipliers[index]);
    }
  });

  it("3種類すべての3・4・5・6・7へ適用する", () => {
    const akuukan = createAkuukan(5);
    const suits: readonly NumberSuit[] = [
      "man",
      "pin",
      "sou"
    ];

    for (const suit of suits) {
      for (let rank = 3; rank <= 7; rank += 1) {
        expect(
          getAkuukanPlayerSkill4_14DrawWeightMultiplier({
            akuukan,
            drawerIsPlayer: true,
            candidate: createTile(suit, rank)
          })
        ).toBe(2);
      }
    }
  });

  it("赤五牌にも倍率を適用する", () => {
    const akuukan = createAkuukan(5);

    for (
      const suit of [
        "man",
        "pin",
        "sou"
      ] as const
    ) {
      expect(
        getAkuukanPlayerSkill4_14DrawWeightMultiplier({
          akuukan,
          drawerIsPlayer: true,
          candidate: createTile(suit, 5, true)
        })
      ).toBe(2);
    }
  });

  it("1・2・8・9の数牌には適用しない", () => {
    const akuukan = createAkuukan(5);

    for (const rank of [1, 2, 8, 9]) {
      expect(
        getAkuukanPlayerSkill4_14DrawWeightMultiplier({
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
        getAkuukanPlayerSkill4_14DrawWeightMultiplier({
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
      "player-skill:4-14"
    );
    const candidate = createTile("sou", 5);

    expect(
      getAkuukanPlayerSkill4_14DrawWeightMultiplier({
        akuukan: enabled,
        drawerIsPlayer: false,
        candidate
      })
    ).toBe(1);

    expect(
      getAkuukanPlayerSkill4_14DrawWeightMultiplier({
        akuukan: createAkuukan(1, false),
        drawerIsPlayer: true,
        candidate
      })
    ).toBe(1);

    expect(
      getAkuukanPlayerSkill4_14DrawWeightMultiplier({
        akuukan: disabled,
        drawerIsPlayer: true,
        candidate
      })
    ).toBe(1);
  });
});
