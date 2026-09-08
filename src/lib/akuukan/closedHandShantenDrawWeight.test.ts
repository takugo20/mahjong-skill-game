import {
  describe,
  expect,
  it
} from "vitest";
import type {
  Meld,
  MeldKind,
  Tile,
  TileSuit
} from "../mahjong/types";
import {
  getAkuukanPlayerSkill4_4DrawWeightMultiplier
} from "./closedHandShantenDrawWeight";
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
    id: `closed-shanten-draw-${serialNumber}`,
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
      ? [{ id: "4-4", level }]
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

function createOneMeldTenpaiHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [7, 8]),
    ...createTiles("honor", [1, 1])
  ];
}

function createMeld(kind: MeldKind): Meld {
  return {
    kind,
    tiles:
      kind === "chi"
        ? createTiles(
            "sou",
            [1, 2, 3]
          )
        : createTiles(
            "man",
            kind === "pon"
              ? [9, 9, 9]
              : [9, 9, 9, 9]
          )
  };
}

describe(
  "プレイヤースキル4-4 加速装置【黙】",
  () => {
    it(
      "各レベルの倍率を門前の向聴改善牌へ適用する",
      () => {
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
            getAkuukanPlayerSkill4_4DrawWeightMultiplier({
              akuukan: createAkuukan(
                (index + 1) as SkillLevel
              ),
              drawerIsPlayer: true,
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
      "暗槓だけなら門前として倍率を適用する",
      () => {
        expect(
          getAkuukanPlayerSkill4_4DrawWeightMultiplier({
            akuukan: createAkuukan(5),
            drawerIsPlayer: true,
            hand:
              createOneMeldTenpaiHand(),
            melds: [
              createMeld("closedKan")
            ],
            candidate: createTile(
              "sou",
              6
            )
          })
        ).toBe(1.5);
      }
    );

    it(
      "チー・ポン・大明槓・加槓があれば適用しない",
      () => {
        const openMeldKinds = [
          "chi",
          "pon",
          "openKan",
          "addedKan"
        ] as const;

        for (const kind of openMeldKinds) {
          expect(
            getAkuukanPlayerSkill4_4DrawWeightMultiplier({
              akuukan: createAkuukan(5),
              drawerIsPlayer: true,
              hand:
                createOneMeldTenpaiHand(),
              melds: [createMeld(kind)],
              candidate: createTile(
                "sou",
                6
              )
            })
          ).toBe(1);
        }
      }
    );

    it(
      "門前でも向聴数が進まない候補には適用しない",
      () => {
        expect(
          getAkuukanPlayerSkill4_4DrawWeightMultiplier({
            akuukan: createAkuukan(5),
            drawerIsPlayer: true,
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
            "player-skill:4-4"
          );
        const hand =
          createStandardTenpaiHand();
        const candidate = createTile(
          "honor",
          1
        );

        expect(
          getAkuukanPlayerSkill4_4DrawWeightMultiplier({
            akuukan: enabled,
            drawerIsPlayer: false,
            hand,
            melds: [],
            candidate
          })
        ).toBe(1);

        expect(
          getAkuukanPlayerSkill4_4DrawWeightMultiplier({
            akuukan:
              createAkuukan(1, false),
            drawerIsPlayer: true,
            hand,
            melds: [],
            candidate
          })
        ).toBe(1);

        expect(
          getAkuukanPlayerSkill4_4DrawWeightMultiplier({
            akuukan: disabled,
            drawerIsPlayer: true,
            hand,
            melds: [],
            candidate
          })
        ).toBe(1);
      }
    );
  }
);
