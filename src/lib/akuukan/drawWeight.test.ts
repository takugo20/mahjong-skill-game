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
  getAkuukanPlayerSkill1_4LiveWallDrawIndex
} from "./drawWeight";
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
    id: `draw-weight-${serialNumber}`,
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
      ? [{
          id: "1-4",
          level
        }]
      : []
  });
}

function createRandom(
  value: number
): {
  readonly random: () => number;
  readonly getCallCount: () => number;
} {
  let callCount = 0;

  return {
    random: () => {
      callCount += 1;
      return value;
    },
    getCallCount: () => callCount
  };
}

describe("プレイヤースキル1-4の重量抽選", () => {
  it("レベル1では表ドラ牌の抽選重量を1.1倍にする", () => {
    const liveWall = [
      createTile("pin", 1),
      createTile("man", 4)
    ];
    const indicator = createTile(
      "man",
      3
    );
    const boundary = 1 / 2.1;

    expect(
      getAkuukanPlayerSkill1_4LiveWallDrawIndex({
        akuukan: createAkuukan(),
        drawerIsPlayer: true,
        liveWall,
        candidateIndexes: [0, 1],
        doraIndicators: [indicator],
        random: () => boundary - 0.000001
      })
    ).toBe(0);
    expect(
      getAkuukanPlayerSkill1_4LiveWallDrawIndex({
        akuukan: createAkuukan(),
        drawerIsPlayer: true,
        liveWall,
        candidateIndexes: [0, 1],
        doraIndicators: [indicator],
        random: () => boundary
      })
    ).toBe(1);
  });

  it("レベル5では表ドラ牌1枚ごとに抽選重量を2倍にする", () => {
    const liveWall = [
      createTile("pin", 1),
      createTile("man", 4),
      createTile("man", 4)
    ];

    expect(
      getAkuukanPlayerSkill1_4LiveWallDrawIndex({
        akuukan: createAkuukan(5),
        drawerIsPlayer: true,
        liveWall,
        candidateIndexes: [0, 1, 2],
        doraIndicators: [
          createTile("man", 3)
        ],
        random: () => 0.2
      })
    ).toBe(1);
    expect(
      getAkuukanPlayerSkill1_4LiveWallDrawIndex({
        akuukan: createAkuukan(5),
        drawerIsPlayer: true,
        liveWall,
        candidateIndexes: [0, 1, 2],
        doraIndicators: [
          createTile("man", 3)
        ],
        random: () => 0.6
      })
    ).toBe(2);
  });

  it("強制・除外処理後に残った候補だけで重量抽選する", () => {
    const liveWall = [
      createTile("man", 4),
      createTile("pin", 1),
      createTile("man", 4)
    ];

    expect(
      getAkuukanPlayerSkill1_4LiveWallDrawIndex({
        akuukan: createAkuukan(),
        drawerIsPlayer: true,
        liveWall,
        candidateIndexes: [1, 2],
        doraIndicators: [
          createTile("man", 3)
        ],
        random: () => 1 / 2.1
      })
    ).toBe(2);
  });

  it("赤ドラだけに該当する牌は補正対象にしない", () => {
    const random = createRandom(0.999);
    const liveWall = [
      createTile("pin", 1),
      createTile("man", 5, true)
    ];

    expect(
      getAkuukanPlayerSkill1_4LiveWallDrawIndex({
        akuukan: createAkuukan(),
        drawerIsPlayer: true,
        liveWall,
        candidateIndexes: [0, 1],
        doraIndicators: [
          createTile("honor", 1)
        ],
        random: random.random
      })
    ).toBe(0);
    expect(random.getCallCount()).toBe(0);
  });

  it("CPUのツモには装備中でも適用しない", () => {
    const random = createRandom(0.999);
    const liveWall = [
      createTile("pin", 1),
      createTile("man", 4)
    ];

    expect(
      getAkuukanPlayerSkill1_4LiveWallDrawIndex({
        akuukan: createAkuukan(),
        drawerIsPlayer: false,
        liveWall,
        candidateIndexes: [0, 1],
        doraIndicators: [
          createTile("man", 3)
        ],
        random: random.random
      })
    ).toBe(0);
    expect(random.getCallCount()).toBe(0);
  });

  it("未装備またはE-18による無効化中は適用しない", () => {
    const notEquippedRandom =
      createRandom(0.999);
    const disabledRandom =
      createRandom(0.999);
    const liveWall = [
      createTile("pin", 1),
      createTile("man", 4)
    ];
    const disabled = disableAkuukanSource(
      createAkuukan(),
      "player-skill:1-4"
    );
    const createInput = (
      akuukan: ReturnType<
        typeof createAkuukan
      >,
      random: () => number
    ) => ({
      akuukan,
      drawerIsPlayer: true,
      liveWall,
      candidateIndexes: [0, 1],
      doraIndicators: [
        createTile("man", 3)
      ],
      random
    });

    expect(
      getAkuukanPlayerSkill1_4LiveWallDrawIndex(
        createInput(
          createAkuukan(1, false),
          notEquippedRandom.random
        )
      )
    ).toBe(0);
    expect(
      getAkuukanPlayerSkill1_4LiveWallDrawIndex(
        createInput(
          disabled,
          disabledRandom.random
        )
      )
    ).toBe(0);
    expect(
      notEquippedRandom.getCallCount()
    ).toBe(0);
    expect(
      disabledRandom.getCallCount()
    ).toBe(0);
  });

  it("有効な候補がなければ抽選しない", () => {
    const random = createRandom(0);

    expect(
      getAkuukanPlayerSkill1_4LiveWallDrawIndex({
        akuukan: createAkuukan(),
        drawerIsPlayer: true,
        liveWall: [],
        candidateIndexes: [],
        doraIndicators: [],
        random: random.random
      })
    ).toBeNull();
    expect(random.getCallCount()).toBe(0);
  });
});
