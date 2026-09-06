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
  isPlayerSkill3_6NakedSingleProtected
} from "./nakedSingleProtection";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `naked-single-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createTriplet(
  suit: TileSuit,
  rank: number
): Tile[] {
  return Array.from(
    { length: 3 },
    () => createTile(suit, rank)
  );
}

function createOpenMelds(): Meld[] {
  return [
    {
      kind: "pon",
      tiles: createTriplet("man", 1),
      calledFrom: 1
    },
    {
      kind: "pon",
      tiles: createTriplet("pin", 2),
      calledFrom: 2
    },
    {
      kind: "pon",
      tiles: createTriplet("sou", 3),
      calledFrom: 3
    },
    {
      kind: "pon",
      tiles: createTriplet("honor", 1),
      calledFrom: 1
    }
  ];
}

function createAkuukan() {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: [{
      id: "3-6",
      level: 1
    }]
  });
}

describe("プレイヤースキル3-6 防御結界【裸】", () => {
  it("4副露後の残り1枚が単騎待ちなら保護する", () => {
    expect(
      isPlayerSkill3_6NakedSingleProtected({
        akuukan: createAkuukan(),
        concealedTiles: [
          createTile("honor", 7)
        ],
        melds: createOpenMelds()
      })
    ).toBe(true);
  });

  it("副露が3組以下なら保護しない", () => {
    expect(
      isPlayerSkill3_6NakedSingleProtected({
        akuukan: createAkuukan(),
        concealedTiles: [
          createTile("honor", 7)
        ],
        melds: createOpenMelds().slice(0, 3)
      })
    ).toBe(false);
  });

  it("門前部分が2枚以上なら保護しない", () => {
    expect(
      isPlayerSkill3_6NakedSingleProtected({
        akuukan: createAkuukan(),
        concealedTiles: [
          createTile("honor", 7),
          createTile("honor", 7)
        ],
        melds: createOpenMelds()
      })
    ).toBe(false);
  });

  it("暗槓を含む場合は保護しない", () => {
    const melds = createOpenMelds();

    melds[0] = {
      kind: "closedKan",
      tiles: [
        ...createTriplet("man", 1),
        createTile("man", 1)
      ]
    };

    expect(
      isPlayerSkill3_6NakedSingleProtected({
        akuukan: createAkuukan(),
        concealedTiles: [
          createTile("honor", 7)
        ],
        melds
      })
    ).toBe(false);
  });

  it("物理牌が4枚使われていて単騎和了不能なら保護しない", () => {
    const pairTile = createTile(
      "honor",
      7
    );
    const melds = createOpenMelds();

    melds[0] = {
      kind: "openKan",
      tiles: Array.from(
        { length: 4 },
        () => createTile("honor", 7)
      ),
      calledFrom: 1
    };

    expect(
      isPlayerSkill3_6NakedSingleProtected({
        akuukan: createAkuukan(),
        concealedTiles: [pairTile],
        melds
      })
    ).toBe(false);
  });

  it("未装備または無効化中なら保護しない", () => {
    const unequipped =
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: []
      });
    const disabled = disableAkuukanSource(
      createAkuukan(),
      "player-skill:3-6"
    );

    for (const akuukan of [
      unequipped,
      disabled
    ]) {
      expect(
        isPlayerSkill3_6NakedSingleProtected({
          akuukan,
          concealedTiles: [
            createTile("honor", 7)
          ],
          melds: createOpenMelds()
        })
      ).toBe(false);
    }
  });
});
