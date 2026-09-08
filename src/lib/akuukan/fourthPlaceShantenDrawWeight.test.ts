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
  getAkuukanPlayerSkill4_8DrawWeightMultiplier
} from "./fourthPlaceShantenDrawWeight";
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
    id: `fourth-place-shanten-draw-${serialNumber}`,
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
      ? [{ id: "4-8", level }]
      : []
  });
}

function createStandardTenpaiHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles(
      "sou",
      [1, 2, 3, 7, 8, 9]
    ),
    createTile("honor", 1)
  ];
}

describe(
  "プレイヤースキル4-8 起死回生",
  () => {
    it(
      "各レベルの倍率を4着時の向聴改善牌へ適用する",
      () => {
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
            getAkuukanPlayerSkill4_8DrawWeightMultiplier({
              akuukan: createAkuukan(
                (index + 1) as SkillLevel
              ),
              drawerIsPlayer: true,
              playerIsFourth: true,
              hand:
                createStandardTenpaiHand(),
              melds: [],
              candidate: createTile(
                "honor",
                1
              )
            })
          ).toBe(multipliers[index]);
        }
      }
    );

    it(
      "プレイヤーが4着でなければ適用しない",
      () => {
        expect(
          getAkuukanPlayerSkill4_8DrawWeightMultiplier({
            akuukan: createAkuukan(5),
            drawerIsPlayer: true,
            playerIsFourth: false,
            hand:
              createStandardTenpaiHand(),
            melds: [],
            candidate: createTile(
              "honor",
              1
            )
          })
        ).toBe(1);
      }
    );

    it(
      "4着でも向聴数が進まない候補には適用しない",
      () => {
        expect(
          getAkuukanPlayerSkill4_8DrawWeightMultiplier({
            akuukan: createAkuukan(5),
            drawerIsPlayer: true,
            playerIsFourth: true,
            hand:
              createStandardTenpaiHand(),
            melds: [],
            candidate: createTile(
              "honor",
              2
            )
          })
        ).toBe(1);
      }
    );

    it(
      "CPU・未装備・発動元無効化中には適用しない",
      () => {
        const enabled = createAkuukan(5);
        const disabled =
          disableAkuukanSource(
            enabled,
            "player-skill:4-8"
          );
        const hand =
          createStandardTenpaiHand();
        const candidate = createTile(
          "honor",
          1
        );

        expect(
          getAkuukanPlayerSkill4_8DrawWeightMultiplier({
            akuukan: enabled,
            drawerIsPlayer: false,
            playerIsFourth: true,
            hand,
            melds: [],
            candidate
          })
        ).toBe(1);

        expect(
          getAkuukanPlayerSkill4_8DrawWeightMultiplier({
            akuukan:
              createAkuukan(1, false),
            drawerIsPlayer: true,
            playerIsFourth: true,
            hand,
            melds: [],
            candidate
          })
        ).toBe(1);

        expect(
          getAkuukanPlayerSkill4_8DrawWeightMultiplier({
            akuukan: disabled,
            drawerIsPlayer: true,
            playerIsFourth: true,
            hand,
            melds: [],
            candidate
          })
        ).toBe(1);
      }
    );
  }
);
