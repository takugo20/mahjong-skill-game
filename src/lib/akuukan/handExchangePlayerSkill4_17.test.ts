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
  canActivateAkuukanPlayerSkill4_17,
  getAkuukanPlayerSkill4_17Config,
  tryActivateAkuukanPlayerSkill4_17
} from "./handExchangePlayerSkill4_17";
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
    id: `player-skill-4-17-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createState(
  level: SkillLevel | null = 1,
  playerMp = 390
) {
  const hand = [
    createTile("man", 1),
    createTile("pin", 2)
  ];

  return {
    akuukan:
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: level === null
          ? []
          : [{ id: "4-17", level }]
      }),
    playerMp,
    maxMp: 900,
    hand,
    liveWall: [createTile("sou", 3)],
    deadWall: [] as Tile[],
    doraIndicatorCount: 0,
    rinshanDrawCount: 0
  };
}

describe("プレイヤースキル4-17 手牌整理【序】", () => {
  it("各レベルのMPと最大交換枚数を取得する", () => {
    const cases: readonly {
      level: SkillLevel;
      mpCost: number;
      maximumExchangeTileCount: number;
    }[] = [
      {
        level: 1,
        mpCost: 120,
        maximumExchangeTileCount: 1
      },
      {
        level: 2,
        mpCost: 110,
        maximumExchangeTileCount: 2
      },
      {
        level: 3,
        mpCost: 100,
        maximumExchangeTileCount: 3
      },
      {
        level: 4,
        mpCost: 90,
        maximumExchangeTileCount: 4
      },
      {
        level: 5,
        mpCost: 80,
        maximumExchangeTileCount: 6
      }
    ];

    for (const currentCase of cases) {
      expect(
        getAkuukanPlayerSkill4_17Config(
          createState(currentCase.level)
        )
      ).toEqual({
        mpCost: currentCase.mpCost,
        maximumExchangeTileCount:
          currentCase.maximumExchangeTileCount
      });
    }
  });

  it("交換成立時にMPを消費して局内使用済みにする", () => {
    const initial = createState(1, 390);
    const outgoingTile = initial.hand[0];
    const incomingTile = initial.liveWall[0];
    const result =
      tryActivateAkuukanPlayerSkill4_17(
        initial,
        [outgoingTile.id],
        () => 0
      );

    expect(result.succeeded).toBe(true);
    expect(result.failureReason).toBeNull();
    expect(result.state.playerMp).toBe(270);
    expect(result.state.hand).toContain(
      incomingTile
    );
    expect(result.state.liveWall).toContain(
      outgoingTile
    );
    expect(
      result.state.akuukan.usedSources.round
    ).toContain("player-skill:4-17");
  });

  it("レベル別上限を超える選択では発動しない", () => {
    const initial = createState(1, 390);
    const result =
      tryActivateAkuukanPlayerSkill4_17(
        initial,
        initial.hand.map((tile) => tile.id),
        () => 0
      );

    expect(result.succeeded).toBe(false);
    expect(result.failureReason).toBe(
      "invalidSelection"
    );
    expect(result.state).toBe(initial);
    expect(result.state.playerMp).toBe(390);
  });

  it("同じ局では再発動できない", () => {
    const initial = createState(5, 390);
    const first =
      tryActivateAkuukanPlayerSkill4_17(
        initial,
        [initial.hand[0].id],
        () => 0
      );
    const second =
      tryActivateAkuukanPlayerSkill4_17(
        {
          ...first.state,
          playerMp: 390
        },
        [first.state.hand[0].id],
        () => 0
      );

    expect(first.succeeded).toBe(true);
    expect(second.succeeded).toBe(false);
    expect(second.failureReason).toBe(
      "sourceUnavailable"
    );
    expect(second.state.playerMp).toBe(390);
  });

  it("MP不足・未装備・無効化中は発動できない", () => {
    const insufficient = createState(1, 119);
    const notEquipped = createState(null);
    const enabled = createState(1, 390);
    const disabled = {
      ...enabled,
      akuukan: disableAkuukanSource(
        enabled.akuukan,
        "player-skill:4-17"
      )
    };

    expect(
      canActivateAkuukanPlayerSkill4_17(
        insufficient
      )
    ).toBe(false);
    expect(
      tryActivateAkuukanPlayerSkill4_17(
        insufficient,
        [insufficient.hand[0].id],
        () => 0
      ).failureReason
    ).toBe("insufficientMp");
    expect(
      canActivateAkuukanPlayerSkill4_17(
        notEquipped
      )
    ).toBe(false);
    expect(
      tryActivateAkuukanPlayerSkill4_17(
        notEquipped,
        [notEquipped.hand[0].id],
        () => 0
      ).failureReason
    ).toBe("skillNotEquipped");
    expect(
      canActivateAkuukanPlayerSkill4_17(
        disabled
      )
    ).toBe(false);
    expect(
      tryActivateAkuukanPlayerSkill4_17(
        disabled,
        [disabled.hand[0].id],
        () => 0
      ).failureReason
    ).toBe("sourceUnavailable");
  });

  it("交換候補がなければMPを消費しない", () => {
    const initial = {
      ...createState(1, 390),
      liveWall: [],
      deadWall: []
    };
    const result =
      tryActivateAkuukanPlayerSkill4_17(
        initial,
        [initial.hand[0].id],
        () => 0
      );

    expect(result.succeeded).toBe(false);
    expect(result.failureReason).toBe(
      "noExchangeCandidate"
    );
    expect(result.state).toBe(initial);
    expect(result.state.playerMp).toBe(390);
  });
});
