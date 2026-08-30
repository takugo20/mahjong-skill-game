import {
  describe,
  expect,
  it
} from "vitest";
import {
  getAkuukanE2RestrictedPlayerIds
} from "../akuukan/drawTileSelection";
import {
  canPlayerRon,
  createInitialGameState,
  createPlayerDiscardProgression,
  drawTile,
  playPlayerDiscard,
  startNextRound
} from "./engine";
import type {
  Discard,
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
    id: `engine-akuukan-e2-${serialNumber}`,
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

function createDiscard(
  tile: Tile,
  riichiDeclaration = false
): Discard {
  return {
    tile,
    tsumogiri: false,
    riichiDeclaration,
    faceDown: false,
    called: false
  };
}

function createCpuRiichiHand(): Tile[] {
  return [
    ...createTiles("man", [2, 3, 4]),
    ...createTiles("pin", [2, 3, 4]),
    ...createTiles("sou", [2, 3, 4]),
    ...createTiles("sou", [6, 7, 8]),
    createTile("man", 5),
    createTile("pin", 5)
  ];
}

function createPinFiveWaitHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [1, 2, 3]),
    ...createTiles("honor", [1, 1, 1]),
    createTile("pin", 5)
  ];
}

function createPinFiveRonHand(): Tile[] {
  return [
    ...createTiles("man", [2, 3, 4]),
    ...createTiles("man", [6, 7, 8]),
    ...createTiles("sou", [2, 3, 4]),
    ...createTiles("honor", [5, 5, 5]),
    createTile("pin", 5)
  ];
}

function setEmptyCpu(
  state: GameState,
  seat: 1 | 3
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand: [],
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: null,
    drawnTileSource: null
  };
}

interface E2ActivationScenario {
  state: GameState;
  playerDiscard: Tile;
  selectedEnemyDraw: Tile;
}

function createE2ActivationScenario(
  playerWaitingHand: Tile[] = [],
  cpu1AlreadyRiichi = true
): E2ActivationScenario {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: []
    }
  );
  const playerDiscard = createTile(
    "honor",
    7
  );
  const selectedEnemyHand =
    createCpuRiichiHand();
  const selectedEnemyDraw =
    selectedEnemyHand[
      selectedEnemyHand.length - 1
    ];

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      ...playerWaitingHand,
      playerDiscard
    ],
    melds: [],
    discards: [
      createDiscard(
        createTile("honor", 1),
        true
      )
    ],
    riichi: true,
    doubleRiichi: false,
    ippatsu: false,
    score: 24000,
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall",
    temporaryFuriten: false,
    riichiFuriten: false
  };

  if (cpu1AlreadyRiichi) {
    state.round.players[1] = {
      ...state.round.players[1],
      hand: [],
      melds: [],
      discards: [
        createDiscard(
          createTile("honor", 2),
          true
        )
      ],
      riichi: true,
      doubleRiichi: false,
      ippatsu: false,
      score: 24000,
      drawnTileId: null,
      drawnTileSource: null
    };
  } else {
    setEmptyCpu(state, 1);
  }

  state.round.players[2] = {
    ...state.round.players[2],
    hand: selectedEnemyHand.slice(0, -1),
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: null,
    drawnTileSource: null
  };
  setEmptyCpu(state, 3);

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;
  state.round.riichiPool =
    cpu1AlreadyRiichi ? 2000 : 1000;
  state.round.liveWall = [
    createTile("honor", 6),
    selectedEnemyDraw,
    createTile("honor", 4),
    createTile("man", 9),
    createTile("pin", 9),
    createTile("sou", 9),
    createTile("honor", 2),
    createTile("honor", 3)
  ];

  return {
    state,
    playerDiscard,
    selectedEnemyDraw
  };
}

function getSelectedEnemyRiichiState(
  scenario: E2ActivationScenario
): GameState {
  const progression =
    createPlayerDiscardProgression(
      scenario.state,
      scenario.playerDiscard.id,
      () => 0.5
    );
  const selectedEnemyAction =
    progression.cpuSteps.find(
      (step) =>
        step.phase === "action" &&
        step.seat === 2
    );

  if (!selectedEnemyAction) {
    throw new Error(
      "敵1の立直成立状態が見つかりません。"
    );
  }

  return selectedEnemyAction.state;
}

function getRestrictedPlayerIds(
  state: GameState
): readonly string[] {
  if (!state.akuukan) {
    throw new Error(
      "亜空間状態が初期化されていません。"
    );
  }

  return getAkuukanE2RestrictedPlayerIds(
    state.akuukan
  );
}

function createSeededRandom(
  initialSeed: number
): () => number {
  let seed = initialSeed >>> 0;

  return () => {
    seed = (
      seed * 1664525 +
      1013904223
    ) >>> 0;

    return seed / 4294967296;
  };
}

describe("E-2のエンジン統合", () => {
  it("敵1の立直成立時に先行立直者だけを記録する", () => {
    const scenario =
      createE2ActivationScenario();
    const result =
      getSelectedEnemyRiichiState(
        scenario
      );

    expect(
      result.round.players[2].riichi
    ).toBe(true);
    expect(
      getRestrictedPlayerIds(result)
    ).toEqual([
      result.round.players[0].id,
      result.round.players[1].id
    ]);
    expect(
      getRestrictedPlayerIds(result)
    ).not.toContain(
      result.round.players[3].id
    );
  });

  it("敵1の立直宣言牌にロンできる間は発動しない", () => {
    const scenario =
      createE2ActivationScenario(
        createPinFiveRonHand(),
        false
      );
    const result = playPlayerDiscard(
      scenario.state,
      scenario.playerDiscard.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "reaction"
    );
    expect(canPlayerRon(result)).toBe(true);
    expect(
      result.round.players[2].riichi
    ).toBe(false);
    expect(
      result.round.lastDiscard?.discard
        .tile.id
    ).toBe(scenario.selectedEnemyDraw.id);
    expect(
      getRestrictedPlayerIds(result)
    ).toEqual([]);
  });

  it("制限対象者は和了牌を山に残して別の牌を通常ツモする", () => {
    const state =
      getSelectedEnemyRiichiState(
        createE2ActivationScenario()
      );
    const winningTile = createTile(
      "pin",
      5
    );
    const allowedTile = createTile(
      "man",
      9
    );
    const remainingTile = createTile(
      "honor",
      7
    );

    state.round.players[0] = {
      ...state.round.players[0],
      hand: createPinFiveWaitHand(),
      melds: [],
      drawnTileId: null,
      drawnTileSource: null
    };
    state.round.currentSeat = 0;
    state.round.phase = "drawing";
    state.round.liveWall = [
      winningTile,
      allowedTile,
      remainingTile
    ];

    const result = drawTile(state, 0);

    expect(
      result.round.players[0].drawnTileId
    ).toBe(allowedTile.id);
    expect(
      result.round.liveWall.map(
        (tile) => tile.id
      )
    ).toEqual([
      winningTile.id,
      remainingTile.id
    ]);
  });

  it("発動後に立直した者は先頭の和了牌を通常どおり引く", () => {
    const state =
      getSelectedEnemyRiichiState(
        createE2ActivationScenario()
      );
    const winningTile = createTile(
      "pin",
      5
    );
    const nextTile = createTile(
      "man",
      9
    );

    state.round.players[3] = {
      ...state.round.players[3],
      hand: createPinFiveWaitHand(),
      melds: [],
      riichi: true,
      drawnTileId: null,
      drawnTileSource: null
    };
    state.round.currentSeat = 3;
    state.round.phase = "drawing";
    state.round.liveWall = [
      winningTile,
      nextTile
    ];

    const result = drawTile(state, 3);

    expect(
      result.round.players[3].drawnTileId
    ).toBe(winningTile.id);
    expect(
      result.round.liveWall.map(
        (tile) => tile.id
      )
    ).toEqual([nextTile.id]);
  });

  it("制限対象者でもロン判定は通常どおり行う", () => {
    const state =
      getSelectedEnemyRiichiState(
        createE2ActivationScenario()
      );
    const winningTile = createTile(
      "pin",
      5
    );
    const discard = createDiscard(
      winningTile
    );

    state.round.players[0] = {
      ...state.round.players[0],
      hand: createPinFiveWaitHand(),
      melds: [],
      temporaryFuriten: false,
      riichiFuriten: false,
      drawnTileId: null,
      drawnTileSource: null
    };
    state.round.phase = "reaction";
    state.round.currentSeat = 3;
    state.round.lastDiscard = {
      seat: 2,
      discard
    };
    state.round.meldCallOptions = [];

    expect(canPlayerRon(state)).toBe(true);
  });

  it("次局開始時に制限対象記録を消去する", () => {
    const state =
      getSelectedEnemyRiichiState(
        createE2ActivationScenario()
      );

    state.round.phase = "roundEnd";
    state.round.winResult = {
      winMethod: "tsumo",
      winnerSeat: 0,
      loserSeat: null,
      winningTile: createTile("man", 1),
      yakuNames: ["門前清自摸和"],
      han: 1,
      fu: 30,
      yakumanMultiplier: 0,
      limitName: null,
      totalPoints: 1000,
      pointChanges: []
    };

    const result = startNextRound(
      state,
      createSeededRandom(7)
    );

    expect(
      getRestrictedPlayerIds(result)
    ).toEqual([]);
    expect(
      result.akuukan?.e2DrawRestriction
    ).toBeUndefined();
  });
});
