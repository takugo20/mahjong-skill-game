import {
  describe,
  expect,
  it
} from "vitest";
import {
  grantPlayerSkillMatchExperience
} from "../akuukan/playerSkillMatchExperience";
import {
  createInitialPlayerSkillGrowthState
} from "../akuukan/playerSkillProgress";
import type {
  AkuukanMatchSetup,
  EnemyId,
  EquippedPlayerSkill
} from "../akuukan/types";
import {
  createInitialGameState,
  getPlayerRiichiDiscardTileIds,
  startNextRound
} from "./engine";
import type {
  GameState,
  Meld,
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
    id: `engine-akuukan-e18-${serialNumber}`,
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

function createSetup(
  enemyId: EnemyId,
  equippedSkills:
    EquippedPlayerSkill[] = [
      {
        id: "1-1",
        level: 1
      },
      {
        id: "2-7",
        level: 1
      }
    ]
): AkuukanMatchSetup {
  return {
    enemyId,
    equippedSkills
  };
}

function createOpenRiichiHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [1, 2, 3]),
    ...createTiles("honor", [1, 2])
  ];
}

function createOpenMeld(): Meld {
  return {
    kind: "chi",
    tiles: createTiles(
      "man",
      [4, 5, 6]
    )
  };
}

function createPlayerOpenRiichiState(
  enemyId: EnemyId
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    createSetup(enemyId, [
      {
        id: "2-7",
        level: 1
      }
    ])
  );
  const hand = createOpenRiichiHand();

  state.round.players[0] = {
    ...state.round.players[0],
    hand,
    melds: [createOpenMeld()],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: hand[10].id,
    drawnTileSource: "liveWall"
  };
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.liveWall = createTiles(
    "honor",
    [3, 4, 5, 6, 7, 3, 4, 5]
  );

  return state;
}

function endRoundWithAbortiveDraw(
  state: GameState
): GameState {
  return {
    ...state,
    round: {
      ...state.round,
      phase: "roundEnd",
      abortiveDrawResult: {
        reason: "nineTerminals",
        declarerSeat: 0,
        distinctYaochuCount: 9
      }
    }
  };
}

describe("敵6 E-18のエンジン統合", () => {
  it("装備情報を保持したまま全装備スキルを無効化する", () => {
    const setup = createSetup("enemy-6");
    const state = createInitialGameState(
      () => 0.5,
      setup
    );

    expect(state.akuukan?.setup).toEqual(
      setup
    );
    expect(
      state.akuukan?.disabledSources
    ).toEqual([
      "player-skill:1-1",
      "player-skill:2-7"
    ]);
  });

  it("副露立直スキル2-7の実際の効果を止める", () => {
    const enabledState =
      createPlayerOpenRiichiState(
        "enemy-1"
      );
    const disabledState =
      createPlayerOpenRiichiState(
        "enemy-6"
      );
    const enabledHand =
      enabledState.round.players[0].hand;

    expect(
      getPlayerRiichiDiscardTileIds(
        enabledState
      )
    ).toEqual([
      enabledHand[9].id,
      enabledHand[10].id
    ]);
    expect(
      getPlayerRiichiDiscardTileIds(
        disabledState
      )
    ).toEqual([]);
  });

  it("局が変わっても装備スキルの無効化を維持する", () => {
    const setup = createSetup("enemy-6");
    const state = createInitialGameState(
      () => 0.5,
      setup
    );
    const nextState = startNextRound(
      endRoundWithAbortiveDraw(state),
      () => 0.5
    );

    expect(
      nextState.akuukan?.disabledSources
    ).toEqual([
      "player-skill:1-1",
      "player-skill:2-7"
    ]);
    expect(
      nextState.akuukan?.setup
        .equippedSkills
    ).toEqual(setup.equippedSkills);
  });

  it("無効化された装備スキルも対局後EXPの対象にする", () => {
    const state = createInitialGameState(
      () => 0.5,
      createSetup("enemy-6", [
        {
          id: "1-1",
          level: 1
        }
      ])
    );

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    const result =
      grantPlayerSkillMatchExperience(
        createInitialPlayerSkillGrowthState(),
        state.akuukan.setup,
        500,
        2
      );

    expect(result.awards).toEqual([
      expect.objectContaining({
        skillId: "1-1",
        experience: 500,
        succeeded: true,
        experienceApplied: 500
      })
    ]);
    expect(
      result.state.skills["1-1"]
    ).toEqual({
      isUnlocked: true,
      level: 1,
      currentExp: 500
    });
  });
});
