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
  getAkuukanPlayerSkill4_6DrawWeightMultiplier
} from "./redHandShantenDrawWeight";
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
    id: `red-hand-shanten-draw-${serialNumber}`,
    suit,
    rank,
    red
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
      ? [{ id: "4-6", level }]
      : []
  });
}

function createTenpaiHand(
  includeRedTile: boolean
): Tile[] {
  return [
    createTile("man", 4),
    createTile(
      "man",
      5,
      includeRedTile
    ),
    createTile("man", 6),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles(
      "sou",
      [1, 2, 3, 7, 8, 9]
    ),
    createTile("honor", 1)
  ];
}

function createOpenTenpaiHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [7, 8]),
    ...createTiles("honor", [1, 1])
  ];
}

describe(
  "プレイヤースキル4-6 加速装置【紅】",
  () => {
    it(
      "各レベルの倍率を赤ドラ所持中の向聴改善牌へ適用する",
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
            getAkuukanPlayerSkill4_6DrawWeightMultiplier({
              akuukan: createAkuukan(
                (index + 1) as SkillLevel
              ),
              drawerIsPlayer: true,
              hand: createTenpaiHand(
                true
              ),
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
      "手牌本体に赤ドラがなければ適用しない",
      () => {
        expect(
          getAkuukanPlayerSkill4_6DrawWeightMultiplier({
            akuukan: createAkuukan(5),
            drawerIsPlayer: true,
            hand: createTenpaiHand(
              false
            ),
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
      "副露面子にだけ赤ドラがあっても適用しない",
      () => {
        const meld: Meld = {
          kind: "chi",
          tiles: [
            createTile("man", 4),
            createTile(
              "man",
              5,
              true
            ),
            createTile("man", 6)
          ]
        };

        expect(
          getAkuukanPlayerSkill4_6DrawWeightMultiplier({
            akuukan: createAkuukan(5),
            drawerIsPlayer: true,
            hand:
              createOpenTenpaiHand(),
            melds: [meld],
            candidate: createTile(
              "sou",
              6
            )
          })
        ).toBe(1);
      }
    );

    it(
      "赤ドラ所持中でも向聴数が進まない候補には適用しない",
      () => {
        expect(
          getAkuukanPlayerSkill4_6DrawWeightMultiplier({
            akuukan: createAkuukan(5),
            drawerIsPlayer: true,
            hand: createTenpaiHand(
              true
            ),
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
            "player-skill:4-6"
          );
        const hand = createTenpaiHand(
          true
        );
        const candidate = createTile(
          "honor",
          1
        );

        expect(
          getAkuukanPlayerSkill4_6DrawWeightMultiplier({
            akuukan: enabled,
            drawerIsPlayer: false,
            hand,
            melds: [],
            candidate
          })
        ).toBe(1);

        expect(
          getAkuukanPlayerSkill4_6DrawWeightMultiplier({
            akuukan:
              createAkuukan(1, false),
            drawerIsPlayer: true,
            hand,
            melds: [],
            candidate
          })
        ).toBe(1);

        expect(
          getAkuukanPlayerSkill4_6DrawWeightMultiplier({
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
