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
  canActivateAkuukanPlayerSkill4_20,
  getAkuukanPlayerSkill4_20Config,
  tryActivateAkuukanPlayerSkill4_20
} from "./handExchangePlayerSkill4_20";
import {
  createInitialAkuukanGameState
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
    id: `player-skill-4-20-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createState(
  level: SkillLevel | null = 1,
  playerMp = 390
) {
  return {
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills:
        level === null
          ? []
          : [{ id: "4-20", level }]
    }),
    playerMp,
    maxMp: 900,
    hand: [
      createTile("pin", 1),
      createTile("sou", 2),
      createTile("man", 3),
      createTile("honor", 1)
    ],
    liveWall: [
      createTile("man", 4),
      createTile("man", 5),
      createTile("pin", 6)
    ],
    deadWall: [] as Tile[],
    doraIndicatorCount: 0,
    rinshanDrawCount: 0,
    riichi: false
  };
}

describe("プレイヤースキル4-20 手牌整理【萬】", () => {
  it("各レベルのMPと最大交換枚数を取得する", () => {
    const cases: readonly {
      level: SkillLevel;
      mpCost: number;
      maximumExchangeTileCount: number;
    }[] = [
      {
        level: 1,
        mpCost: 110,
        maximumExchangeTileCount: 1
      },
      {
        level: 2,
        mpCost: 100,
        maximumExchangeTileCount: 2
      },
      {
        level: 3,
        mpCost: 90,
        maximumExchangeTileCount: 2
      },
      {
        level: 4,
        mpCost: 80,
        maximumExchangeTileCount: 3
      },
      {
        level: 5,
        mpCost: 60,
        maximumExchangeTileCount: 3
      }
    ];

    for (const currentCase of cases) {
      expect(
        getAkuukanPlayerSkill4_20Config(
          createState(currentCase.level)
        )
      ).toEqual({
        mpCost: currentCase.mpCost,
        maximumExchangeTileCount:
          currentCase.maximumExchangeTileCount
      });
    }
  });

  it("筒子と索子を山の萬子に交換する", () => {
    const initial = createState(2);
    const outgoingTiles = initial.hand.slice(0, 2);

    const result =
      tryActivateAkuukanPlayerSkill4_20(
        initial,
        outgoingTiles.map((tile) => tile.id),
        () => 0
      );

    expect(result.succeeded).toBe(true);
    expect(result.state.playerMp).toBe(290);
    expect(result.exchanges).toHaveLength(2);

    expect(
      result.exchanges.every(
        (exchange) =>
          exchange.incomingTile.suit === "man"
      )
    ).toBe(true);

    expect(
      result.state.akuukan.usedSources.turn
    ).toContain("player-skill:4-20");
  });

  it("萬子と字牌は交換対象として選択できない", () => {
    const initial = createState(2);

    for (const tile of initial.hand.slice(2)) {
      const result =
        tryActivateAkuukanPlayerSkill4_20(
          initial,
          [tile.id],
          () => 0
        );

      expect(result.succeeded).toBe(false);
      expect(result.failureReason).toBe(
        "invalidSelection"
      );
    }
  });

  it("山の萬子が不足する場合は可能な枚数だけ交換する", () => {
    const initial = createState(2);
    const onlyManTile = initial.liveWall[0];

    const state = {
      ...initial,
      liveWall: [
        onlyManTile,
        createTile("pin", 9)
      ]
    };

    const result =
      tryActivateAkuukanPlayerSkill4_20(
        state,
        state.hand
          .slice(0, 2)
          .map((tile) => tile.id),
        () => 0
      );

    expect(result.succeeded).toBe(true);
    expect(result.exchanges).toHaveLength(1);

    expect(result.state.hand).toContain(
      onlyManTile
    );
    expect(result.state.hand).toContain(
      state.hand[1]
    );
  });

  it("立直中・MP不足・同じ手番の再発動を禁止する", () => {
    const initial = createState(1);

    const riichiState = {
      ...initial,
      riichi: true
    };

    const insufficient = createState(1, 109);

    expect(
      canActivateAkuukanPlayerSkill4_20(
        riichiState
      )
    ).toBe(false);

    expect(
      tryActivateAkuukanPlayerSkill4_20(
        riichiState,
        [riichiState.hand[0].id],
        () => 0
      ).failureReason
    ).toBe("riichi");

    expect(
      canActivateAkuukanPlayerSkill4_20(
        insufficient
      )
    ).toBe(false);

    const first =
      tryActivateAkuukanPlayerSkill4_20(
        initial,
        [initial.hand[0].id],
        () => 0
      );

    const second =
      tryActivateAkuukanPlayerSkill4_20(
        {
          ...first.state,
          playerMp: 390
        },
        [first.state.hand[1].id],
        () => 0
      );

    expect(first.succeeded).toBe(true);
    expect(second.succeeded).toBe(false);
    expect(second.failureReason).toBe(
      "sourceUnavailable"
    );
  });
});
