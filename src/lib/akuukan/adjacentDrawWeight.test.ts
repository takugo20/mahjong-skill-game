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
  getAkuukanPlayerSkill4_1DrawWeightMultiplier
} from "./adjacentDrawWeight";
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
    id: `adjacent-draw-${serialNumber}`,
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
      ? [{ id: "4-1", level }]
      : []
  });
}

describe("プレイヤースキル4-1 加速装置【横】", () => {
  it("各レベルの倍率を同色の隣接数牌へ適用する", () => {
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
        getAkuukanPlayerSkill4_1DrawWeightMultiplier({
          akuukan: createAkuukan(
            (index + 1) as SkillLevel
          ),
          drawerIsPlayer: true,
          hand: [createTile("man", 5)],
          candidate: createTile("man", 6)
        })
      ).toBe(multipliers[index]);
    }
  });

  it("下側と上側の隣接牌をどちらも対象にする", () => {
    const akuukan = createAkuukan(5);
    const hand = [createTile("pin", 5)];

    for (const rank of [4, 6]) {
      expect(
        getAkuukanPlayerSkill4_1DrawWeightMultiplier({
          akuukan,
          drawerIsPlayer: true,
          hand,
          candidate: createTile("pin", rank)
        })
      ).toBe(1.5);
    }
  });

  it("異なる色・字牌・2以上離れた数牌には適用しない", () => {
    const akuukan = createAkuukan(5);
    const hand = [createTile("sou", 5)];

    for (
      const candidate of [
        createTile("man", 4),
        createTile("honor", 4),
        createTile("sou", 3),
        createTile("sou", 5)
      ]
    ) {
      expect(
        getAkuukanPlayerSkill4_1DrawWeightMultiplier({
          akuukan,
          drawerIsPlayer: true,
          hand,
          candidate
        })
      ).toBe(1);
    }
  });

  it("1と9を循環する隣接牌として扱わない", () => {
    const akuukan = createAkuukan(5);

    expect(
      getAkuukanPlayerSkill4_1DrawWeightMultiplier({
        akuukan,
        drawerIsPlayer: true,
        hand: [createTile("man", 1)],
        candidate: createTile("man", 9)
      })
    ).toBe(1);
  });

  it("複数の手牌に隣接しても倍率を重複させない", () => {
    expect(
      getAkuukanPlayerSkill4_1DrawWeightMultiplier({
        akuukan: createAkuukan(5),
        drawerIsPlayer: true,
        hand: [
          createTile("man", 4),
          createTile("man", 6)
        ],
        candidate: createTile("man", 5)
      })
    ).toBe(1.5);
  });

  it("CPU・未装備・発動元無効化中には適用しない", () => {
    const enabled = createAkuukan(5);
    const disabled = disableAkuukanSource(
      enabled,
      "player-skill:4-1"
    );
    const hand = [createTile("sou", 7)];
    const candidate = createTile("sou", 8);

    expect(
      getAkuukanPlayerSkill4_1DrawWeightMultiplier({
        akuukan: enabled,
        drawerIsPlayer: false,
        hand,
        candidate
      })
    ).toBe(1);
    expect(
      getAkuukanPlayerSkill4_1DrawWeightMultiplier({
        akuukan: createAkuukan(1, false),
        drawerIsPlayer: true,
        hand,
        candidate
      })
    ).toBe(1);
    expect(
      getAkuukanPlayerSkill4_1DrawWeightMultiplier({
        akuukan: disabled,
        drawerIsPlayer: true,
        hand,
        candidate
      })
    ).toBe(1);
  });
});
