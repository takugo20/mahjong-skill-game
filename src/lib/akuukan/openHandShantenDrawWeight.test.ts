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
  getAkuukanPlayerSkill4_5DrawWeightMultiplier
} from "./openHandShantenDrawWeight";
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
    id: `open-shanten-draw-${serialNumber}`,
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
      ? [{ id: "4-5", level }]
      : []
  });
}

function createOpenTenpaiHand(): Tile[] {
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
  "プレイヤースキル4-5 加速装置【鳴】",
  () => {
    it(
      "各レベルの倍率を非門前の向聴改善牌へ適用する",
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
            getAkuukanPlayerSkill4_5DrawWeightMultiplier({
              akuukan: createAkuukan(
                (index + 1) as SkillLevel
              ),
              drawerIsPlayer: true,
              hand:
                createOpenTenpaiHand(),
              melds: [
                createMeld("chi")
              ],
              candidate: createTile(
                "sou",
                6
              )
            })
          ).toBe(multipliers[index]);
        }
      }
    );

    it(
      "チー・ポン・大明槓・加槓があれば適用する",
      () => {
        const openMeldKinds = [
          "chi",
          "pon",
          "openKan",
          "addedKan"
        ] as const;

        for (const kind of openMeldKinds) {
          expect(
            getAkuukanPlayerSkill4_5DrawWeightMultiplier({
              akuukan: createAkuukan(5),
              drawerIsPlayer: true,
              hand:
                createOpenTenpaiHand(),
              melds: [createMeld(kind)],
              candidate: createTile(
                "sou",
                6
              )
            })
          ).toBe(1.5);
        }
      }
    );

    it(
      "副露なしまたは暗槓だけなら適用しない",
      () => {
        const hand =
          createOpenTenpaiHand();
        const candidate = createTile(
          "sou",
          6
        );

        expect(
          getAkuukanPlayerSkill4_5DrawWeightMultiplier({
            akuukan: createAkuukan(5),
            drawerIsPlayer: true,
            hand,
            melds: [],
            candidate
          })
        ).toBe(1);

        expect(
          getAkuukanPlayerSkill4_5DrawWeightMultiplier({
            akuukan: createAkuukan(5),
            drawerIsPlayer: true,
            hand,
            melds: [
              createMeld("closedKan")
            ],
            candidate
          })
        ).toBe(1);
      }
    );

    it(
      "非門前でも向聴数が進まない候補には適用しない",
      () => {
        expect(
          getAkuukanPlayerSkill4_5DrawWeightMultiplier({
            akuukan: createAkuukan(5),
            drawerIsPlayer: true,
            hand:
              createOpenTenpaiHand(),
            melds: [
              createMeld("chi")
            ],
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
            "player-skill:4-5"
          );
        const hand =
          createOpenTenpaiHand();
        const melds = [
          createMeld("chi")
        ];
        const candidate = createTile(
          "sou",
          6
        );

        expect(
          getAkuukanPlayerSkill4_5DrawWeightMultiplier({
            akuukan: enabled,
            drawerIsPlayer: false,
            hand,
            melds,
            candidate
          })
        ).toBe(1);

        expect(
          getAkuukanPlayerSkill4_5DrawWeightMultiplier({
            akuukan:
              createAkuukan(1, false),
            drawerIsPlayer: true,
            hand,
            melds,
            candidate
          })
        ).toBe(1);

        expect(
          getAkuukanPlayerSkill4_5DrawWeightMultiplier({
            akuukan: disabled,
            drawerIsPlayer: true,
            hand,
            melds,
            candidate
          })
        ).toBe(1);
      }
    );
  }
);
