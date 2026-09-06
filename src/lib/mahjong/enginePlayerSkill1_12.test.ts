import {
  describe,
  expect,
  it
} from "vitest";
import type {
  EnemyId,
  SkillLevel
} from "../akuukan/types";
import {
  createInitialGameState,
  declarePlayerTsumo
} from "./engine";
import type {
  GameState,
  Tile,
  TileSuit
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `engine-player-skill-1-12-${serialNumber}`,
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

function createSevenPairsWaitHand(): Tile[] {
  return [
    ...createTiles("man", [1, 1, 2, 2]),
    ...createTiles("pin", [3, 3, 4, 4]),
    ...createTiles("sou", [5, 5, 6, 6]),
    createTile("honor", 1)
  ];
}

function preparePlayerTsumoState(
  level: SkillLevel | null,
  enemyId: EnemyId = "enemy-1"
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId,
      equippedSkills: level === null
        ? []
        : [{ id: "1-12", level }]
    }
  );
  const winningTile = createTile(
    "honor",
    1
  );

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      ...createSevenPairsWaitHand(),
      winningTile
    ],
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: winningTile.id,
    drawnTileSource: "liveWall"
  };
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.turnNumber = 16;
  state.round.lastDiscard = null;
  state.round.winResult = null;

  return state;
}

function setScores(
  state: GameState,
  scores: readonly [
    number,
    number,
    number,
    number
  ]
): void {
  state.round.players =
    state.round.players.map(
      (player, seat) => ({
        ...player,
        score: scores[seat]
      })
    );
}

function getWinHan(state: GameState): number {
  const resolved = declarePlayerTsumo(
    state
  );
  const han = resolved.round.winResult?.han;

  if (han === undefined) {
    throw new Error(
      "ツモ和了の翻数が見つかりません。"
    );
  }

  return han;
}

describe("プレイヤースキル1-12のエンジン統合", () => {
  it("4位でのツモ和了へ各レベルのボーナス翻を加算する", () => {
    const cases: readonly {
      level: SkillLevel;
      expectedBonusHan: number;
    }[] = [
      { level: 1, expectedBonusHan: 1 },
      { level: 2, expectedBonusHan: 1 },
      { level: 3, expectedBonusHan: 2 },
      { level: 4, expectedBonusHan: 2 },
      { level: 5, expectedBonusHan: 3 }
    ];

    for (const currentCase of cases) {
      const normal =
        preparePlayerTsumoState(null);
      const skill =
        preparePlayerTsumoState(
          currentCase.level
        );
      setScores(
        normal,
        [10000, 25000, 30000, 35000]
      );
      setScores(
        skill,
        [10000, 25000, 30000, 35000]
      );

      expect(getWinHan(skill)).toBe(
        getWinHan(normal) +
          currentCase.expectedBonusHan
      );
    }
  });

  it("和了前が4位なら和了後に順位が上がる場合も適用する", () => {
    const normal =
      preparePlayerTsumoState(null);
    const skill =
      preparePlayerTsumoState(5);
    setScores(
      normal,
      [24900, 25000, 25000, 25100]
    );
    setScores(
      skill,
      [24900, 25000, 25000, 25100]
    );

    expect(getWinHan(skill)).toBe(
      getWinHan(normal) + 3
    );
  });

  it("和了前が4位でなければ適用しない", () => {
    const normal =
      preparePlayerTsumoState(null);
    const skill =
      preparePlayerTsumoState(5);
    setScores(
      normal,
      [30000, 20000, 25000, 25000]
    );
    setScores(
      skill,
      [30000, 20000, 25000, 25000]
    );

    expect(getWinHan(skill)).toBe(
      getWinHan(normal)
    );
  });

  it("同点時は起家からの席順で4位を判定する", () => {
    const fourthNormal =
      preparePlayerTsumoState(null);
    const fourthSkill =
      preparePlayerTsumoState(5);
    const firstNormal =
      preparePlayerTsumoState(null);
    const firstSkill =
      preparePlayerTsumoState(5);

    for (const state of [
      fourthNormal,
      fourthSkill,
      firstNormal,
      firstSkill
    ]) {
      setScores(
        state,
        [25000, 25000, 25000, 25000]
      );
    }

    fourthNormal.initialDealerSeat = 1;
    fourthSkill.initialDealerSeat = 1;
    firstNormal.initialDealerSeat = 0;
    firstSkill.initialDealerSeat = 0;

    expect(getWinHan(fourthSkill)).toBe(
      getWinHan(fourthNormal) + 3
    );
    expect(getWinHan(firstSkill)).toBe(
      getWinHan(firstNormal)
    );
  });

  it("敵6のE-18で無効化中は適用しない", () => {
    const normal =
      preparePlayerTsumoState(null);
    const disabled =
      preparePlayerTsumoState(
        5,
        "enemy-6"
      );
    setScores(
      normal,
      [10000, 25000, 30000, 35000]
    );
    setScores(
      disabled,
      [10000, 25000, 30000, 35000]
    );

    expect(
      disabled.akuukan?.disabledSources
    ).toContain("player-skill:1-12");
    expect(getWinHan(disabled)).toBe(
      getWinHan(normal)
    );
  });
});
