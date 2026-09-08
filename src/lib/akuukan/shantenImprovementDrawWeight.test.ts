import {
  describe,
  expect,
  it
} from "vitest";
import type {
  Meld,
  Tile,
  TileSuit
} from "../mahjong/types";
import {
  doesDrawCandidateImproveShanten,
  getAkuukanPlayerSkill4_3DrawWeightMultiplier
} from "./shantenImprovementDrawWeight";
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
    id: `shanten-draw-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createTiles(
  suit: TileSuit,
  ranks: readonly number[]
): Tile[] {
  return ranks.map(
    (rank) => createTile(suit, rank)
  );
}

function createAkuukan(
  level: SkillLevel = 1,
  equipped = true
) {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: equipped
      ? [{ id: "4-3", level }]
      : []
  });
}

function createStandardTenpaiHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [1, 2, 3, 7, 8, 9]),
    createTile("honor", 1)
  ];
}

describe("プレイヤースキル4-3 加速装置【汎用】", () => {
  it("各レベルの倍率を通常形の向聴改善牌へ適用する", () => {
    const multipliers = [
      1.05,
      1.1,
      1.15,
      1.2,
      1.25
    ] as const;

    for (
      let index = 0;
      index < multipliers.length;
      index += 1
    ) {
      expect(
        getAkuukanPlayerSkill4_3DrawWeightMultiplier({
          akuukan: createAkuukan(
            (index + 1) as SkillLevel
          ),
          drawerIsPlayer: true,
          hand: createStandardTenpaiHand(),
          melds: [],
          candidate: createTile("honor", 1)
        })
      ).toBe(multipliers[index]);
    }
  });

  it("七対子を聴牌から完成させる牌を対象にする", () => {
    const hand = createTiles(
      "man",
      [
        1, 1,
        2, 2,
        3, 3,
        4, 4,
        5, 5,
        6, 6,
        9
      ]
    );

    expect(
      doesDrawCandidateImproveShanten(
        hand,
        [],
        createTile("man", 9)
      )
    ).toBe(true);
  });

  it("国士無双を聴牌から完成させる牌を対象にする", () => {
    const hand = [
      ...createTiles("man", [1, 9]),
      ...createTiles("pin", [1, 9]),
      ...createTiles("sou", [1, 9]),
      ...createTiles(
        "honor",
        [1, 2, 3, 4, 5, 6, 7]
      )
    ];

    expect(
      doesDrawCandidateImproveShanten(
        hand,
        [],
        createTile("honor", 7)
      )
    ).toBe(true);
  });

  it("向聴数が変わらない候補には適用しない", () => {
    expect(
      getAkuukanPlayerSkill4_3DrawWeightMultiplier({
        akuukan: createAkuukan(5),
        drawerIsPlayer: true,
        hand: createStandardTenpaiHand(),
        melds: [],
        candidate: createTile("honor", 2)
      })
    ).toBe(1);
  });

  it("副露時は七対子状の対子追加だけでは対象にしない", () => {
    const meld: Meld = {
      kind: "chi",
      tiles: createTiles(
        "man",
        [1, 2, 3]
      )
    };
    const hand = createTiles(
      "honor",
      [
        1, 1,
        2, 2,
        3, 3,
        4, 4,
        5, 6
      ]
    );

    expect(
      doesDrawCandidateImproveShanten(
        hand,
        [meld],
        createTile("honor", 5)
      )
    ).toBe(false);
  });

  it("CPU・未装備・発動元無効化中には適用しない", () => {
    const enabled = createAkuukan(5);
    const disabled = disableAkuukanSource(
      enabled,
      "player-skill:4-3"
    );
    const hand = createStandardTenpaiHand();
    const candidate = createTile(
      "honor",
      1
    );

    expect(
      getAkuukanPlayerSkill4_3DrawWeightMultiplier({
        akuukan: enabled,
        drawerIsPlayer: false,
        hand,
        melds: [],
        candidate
      })
    ).toBe(1);
    expect(
      getAkuukanPlayerSkill4_3DrawWeightMultiplier({
        akuukan: createAkuukan(1, false),
        drawerIsPlayer: true,
        hand,
        melds: [],
        candidate
      })
    ).toBe(1);
    expect(
      getAkuukanPlayerSkill4_3DrawWeightMultiplier({
        akuukan: disabled,
        drawerIsPlayer: true,
        hand,
        melds: [],
        candidate
      })
    ).toBe(1);
  });
});
