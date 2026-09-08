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
  getAkuukanPlayerSkill4_7DrawWeightMultiplier
} from "./closedKanSameTileDrawWeight";
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
    id: `closed-kan-same-tile-${serialNumber}`,
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
      ? [{ id: "4-7", level }]
      : []
  });
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
  "プレイヤースキル4-7 加速装置【槓】",
  () => {
    it(
      "各レベルの倍率を暗槓後の同牌種候補へ適用する",
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
            getAkuukanPlayerSkill4_7DrawWeightMultiplier({
              akuukan: createAkuukan(
                (index + 1) as SkillLevel
              ),
              drawerIsPlayer: true,
              hand: [
                createTile("pin", 5)
              ],
              melds: [
                createMeld("closedKan")
              ],
              candidate: createTile(
                "pin",
                5
              )
            })
          ).toBe(multipliers[index]);
        }
      }
    );

    it(
      "暗槓がなく他の副露や槓だけなら適用しない",
      () => {
        const meldCases:
          readonly Meld[][] = [
            [],
            [createMeld("chi")],
            [createMeld("pon")],
            [createMeld("openKan")],
            [createMeld("addedKan")]
          ];

        for (const melds of meldCases) {
          expect(
            getAkuukanPlayerSkill4_7DrawWeightMultiplier({
              akuukan: createAkuukan(5),
              drawerIsPlayer: true,
              hand: [
                createTile("pin", 5)
              ],
              melds,
              candidate: createTile(
                "pin",
                5
              )
            })
          ).toBe(1);
        }
      }
    );

    it(
      "暗槓した牌が槓子にしかなければ同牌種候補へ適用しない",
      () => {
        expect(
          getAkuukanPlayerSkill4_7DrawWeightMultiplier({
            akuukan: createAkuukan(5),
            drawerIsPlayer: true,
            hand: [
              createTile("pin", 5)
            ],
            melds: [
              createMeld("closedKan")
            ],
            candidate: createTile(
              "man",
              9
            )
          })
        ).toBe(1);
      }
    );

    it(
      "通常五と赤五を同じ牌種として扱う",
      () => {
        expect(
          getAkuukanPlayerSkill4_7DrawWeightMultiplier({
            akuukan: createAkuukan(5),
            drawerIsPlayer: true,
            hand: [
              createTile("sou", 5)
            ],
            melds: [
              createMeld("closedKan")
            ],
            candidate: createTile(
              "sou",
              5,
              true
            )
          })
        ).toBe(2);
      }
    );

    it(
      "CPU・未装備・発動元無効化中には適用しない",
      () => {
        const enabled = createAkuukan(5);
        const disabled =
          disableAkuukanSource(
            enabled,
            "player-skill:4-7"
          );
        const hand = [
          createTile("pin", 5)
        ];
        const melds = [
          createMeld("closedKan")
        ];
        const candidate = createTile(
          "pin",
          5
        );

        expect(
          getAkuukanPlayerSkill4_7DrawWeightMultiplier({
            akuukan: enabled,
            drawerIsPlayer: false,
            hand,
            melds,
            candidate
          })
        ).toBe(1);

        expect(
          getAkuukanPlayerSkill4_7DrawWeightMultiplier({
            akuukan:
              createAkuukan(1, false),
            drawerIsPlayer: true,
            hand,
            melds,
            candidate
          })
        ).toBe(1);

        expect(
          getAkuukanPlayerSkill4_7DrawWeightMultiplier({
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
