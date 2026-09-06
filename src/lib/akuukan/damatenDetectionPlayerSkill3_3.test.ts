import {
  describe,
  expect,
  it,
  vi
} from "vitest";
import type {
  Meld,
  SeatIndex,
  Tile,
  TileSuit
} from "../mahjong/types";
import type {
  DamatenDetectionPlayer
} from "./damatenDetection";
import {
  detectPlayerSkill3_3DamatenTransitions
} from "./damatenDetection";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  SkillLevel
} from "./types";

let nextTileId = 0;

function createTiles(
  suit: TileSuit,
  ranks: readonly number[]
): Tile[] {
  return ranks.map((rank) => ({
    id: `tile-${nextTileId += 1}`,
    suit,
    rank,
    red: false
  }));
}

function createTenpaiHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [1, 2, 3]),
    ...createTiles(
      "honor",
      [1, 1, 1, 2]
    )
  ];
}

function createOtherTenpaiHand(): Tile[] {
  return [
    ...createTiles("man", [4, 5, 6]),
    ...createTiles("pin", [4, 5, 6]),
    ...createTiles("sou", [4, 5, 6]),
    ...createTiles(
      "honor",
      [2, 2, 2, 3]
    )
  ];
}

function createNotenHand(): Tile[] {
  return [
    ...createTiles("man", [1, 4, 7]),
    ...createTiles("pin", [1, 4, 7]),
    ...createTiles("sou", [1, 4, 7]),
    ...createTiles(
      "honor",
      [1, 2, 3, 4]
    )
  ];
}

function createPlayer(
  seat: SeatIndex,
  overrides: Partial<
    DamatenDetectionPlayer
  > = {}
): DamatenDetectionPlayer {
  return {
    id: `player-${seat}`,
    seat,
    hand: createNotenHand(),
    melds: [],
    riichi: false,
    ...overrides
  };
}

function createAkuukan(
  level: SkillLevel = 1
) {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: [{
      id: "3-3",
      level
    }]
  });
}

describe("プレイヤースキル3-3 闇聴察知", () => {
  it.each([
    [1, 0.1],
    [2, 0.15],
    [3, 0.25],
    [4, 0.5],
    [5, 0.8]
  ] as const)(
    "Lv.%sの指定確率で配牌時の闇聴を察知する",
    (level, chance) => {
      const player = createPlayer(1, {
        hand: createTenpaiHand()
      });
      const detected =
        detectPlayerSkill3_3DamatenTransitions({
          akuukan: createAkuukan(level),
          players: [player],
          random: () => chance - 0.001
        });
      const missed =
        detectPlayerSkill3_3DamatenTransitions({
          akuukan: createAkuukan(level),
          players: [player],
          random: () => chance
        });

      expect(
        detected.detectedPlayerIds
      ).toEqual(["player-1"]);
      expect(
        missed.detectedPlayerIds
      ).toEqual([]);
    }
  );

  it("闇聴を継続している間は再抽選しない", () => {
    const random = vi.fn(() => 0);
    const first =
      detectPlayerSkill3_3DamatenTransitions({
        akuukan: createAkuukan(),
        players: [createPlayer(1, {
          hand: createTenpaiHand()
        })],
        random
      });
    const second =
      detectPlayerSkill3_3DamatenTransitions({
        akuukan: first.akuukan,
        players: [createPlayer(1, {
          hand: createTenpaiHand()
        })],
        random
      });

    expect(
      second.newlyDamatenPlayerIds
    ).toEqual([]);
    expect(
      second.detectedPlayerIds
    ).toEqual([]);
    expect(random).toHaveBeenCalledTimes(1);
  });

  it("闇聴中に待ちが変化しても再抽選しない", () => {
    const first =
      detectPlayerSkill3_3DamatenTransitions({
        akuukan: createAkuukan(),
        players: [createPlayer(1, {
          hand: createTenpaiHand()
        })],
        random: () => 0
      });
    const second =
      detectPlayerSkill3_3DamatenTransitions({
        akuukan: first.akuukan,
        players: [createPlayer(1, {
          hand: createOtherTenpaiHand()
        })],
        random: () => 0
      });

    expect(
      second.detectedPlayerIds
    ).toEqual([]);
  });

  it("闇聴解除後に再び闇聴へ移行すれば新たに抽選する", () => {
    const entered =
      detectPlayerSkill3_3DamatenTransitions({
        akuukan: createAkuukan(),
        players: [createPlayer(1, {
          hand: createTenpaiHand()
        })],
        random: () => 1
      });
    const exited =
      detectPlayerSkill3_3DamatenTransitions({
        akuukan: entered.akuukan,
        players: [createPlayer(1)],
        random: () => 0
      });
    const reentered =
      detectPlayerSkill3_3DamatenTransitions({
        akuukan: exited.akuukan,
        players: [createPlayer(1, {
          hand: createTenpaiHand()
        })],
        random: () => 0
      });

    expect(
      reentered.detectedPlayerIds
    ).toEqual(["player-1"]);
  });

  it("立直中・副露中・プレイヤー自身の聴牌を対象にしない", () => {
    const openMeld: Meld = {
      kind: "chi",
      tiles: createTiles(
        "man",
        [1, 2, 3]
      ),
      calledFrom: 2
    };
    const result =
      detectPlayerSkill3_3DamatenTransitions({
        akuukan: createAkuukan(),
        players: [
          createPlayer(0, {
            hand: createTenpaiHand()
          }),
          createPlayer(1, {
            hand: createTenpaiHand(),
            riichi: true
          }),
          createPlayer(2, {
            hand: [
              ...createTiles(
                "pin",
                [1, 2, 3]
              ),
              ...createTiles(
                "sou",
                [1, 2, 3]
              ),
              ...createTiles(
                "honor",
                [1, 1, 1, 2]
              )
            ],
            melds: [openMeld]
          })
        ],
        random: () => 0
      });

    expect(
      result.detectedPlayerIds
    ).toEqual([]);
    expect(
      result.akuukan
        .playerSkill3_3DamatenPlayerIds
    ).toEqual([]);
  });

  it("未装備または無効化中でも闇聴状態の追跡だけは更新する", () => {
    const unequipped =
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: []
      });
    const player = createPlayer(1, {
      hand: createTenpaiHand()
    });

    for (const akuukan of [
      unequipped,
      disableAkuukanSource(
        createAkuukan(),
        "player-skill:3-3"
      )
    ]) {
      const result =
        detectPlayerSkill3_3DamatenTransitions({
          akuukan,
          players: [player],
          random: () => 0
        });

      expect(
        result.detectedPlayerIds
      ).toEqual([]);
      expect(
        result.akuukan
          .playerSkill3_3DamatenPlayerIds
      ).toEqual(["player-1"]);
    }
  });
});
