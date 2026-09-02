import {
  describe,
  expect,
  it
} from "vitest";
import {
  disableAkuukanSource
} from "../akuukan/state";
import {
  canPlayerRon,
  createInitialGameState,
  createPlayerDiscardProgression,
  createPlayerReactionSkipProgression,
  declarePlayerMeldCall,
  declarePlayerRon
} from "./engine";
import type {
  CpuProgressPhase
} from "./engine";
import type {
  GameState,
  SeatIndex,
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
    id:
      `engine-akuukan-e25-` +
      serialNumber,
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

function createRiichiHand(): Tile[] {
  return [
    ...createTiles("man", [2, 3, 4]),
    ...createTiles("pin", [2, 3, 4]),
    ...createTiles("sou", [2, 3, 4]),
    ...createTiles("sou", [6, 7, 8]),
    createTile("man", 5),
    createTile("pin", 5)
  ];
}

function createPinfuWaitHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [3, 4, 5, 6, 7]
    ),
    ...createTiles(
      "pin",
      [2, 3, 4, 5, 5]
    ),
    ...createTiles(
      "sou",
      [6, 7, 8]
    )
  ];
}

function emptyCpuHands(
  state: GameState
): void {
  for (const seat of [1, 2, 3] as const) {
    state.round.players[seat] = {
      ...state.round.players[seat],
      hand: [],
      melds: [],
      discards: [],
      riichi: false,
      doubleRiichi: false,
      ippatsu: false,
      temporaryFuriten: false,
      riichiFuriten: false,
      drawnTileId: null,
      drawnTileSource: null
    };
  }
}

function prepareState(
  playerRemainingTiles: Tile[] = []
): {
  state: GameState;
  playerDiscard: Tile;
} {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-13",
      equippedSkills: []
    }
  );
  const playerDiscard = createTile(
    "honor",
    7
  );

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      ...playerRemainingTiles,
      playerDiscard
    ],
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };
  emptyCpuHands(state);
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;

  return {
    state,
    playerDiscard
  };
}

interface ExpectedCpuStep {
  readonly phase: CpuProgressPhase;
  readonly seat: SeatIndex;
}

function getCpuStepOrder(
  state: GameState,
  playerDiscardId: string
): {
  readonly steps: ExpectedCpuStep[];
  readonly finalState: GameState;
} {
  const progression =
    createPlayerDiscardProgression(
      state,
      playerDiscardId,
      () => 0.5
    );

  return {
    steps: progression.cpuSteps.map(
      ({ phase, seat }) => ({
        phase,
        seat
      })
    ),
    finalState: progression.finalState
  };
}

describe("敵13 E-25のエンジン統合", () => {
  it("敵13は通常ツモと打牌を2回行ってから次家へ進む", () => {
    const { state, playerDiscard } =
      prepareState();
    state.round.liveWall = [
      createTile("man", 1),
      createTile("pin", 2),
      createTile("sou", 3),
      createTile("honor", 4),
      createTile("man", 5)
    ];

    const result = getCpuStepOrder(
      state,
      playerDiscard.id
    );

    expect(result.steps).toEqual([
      { phase: "draw", seat: 1 },
      { phase: "action", seat: 1 },
      { phase: "draw", seat: 2 },
      { phase: "action", seat: 2 },
      { phase: "draw", seat: 2 },
      { phase: "action", seat: 2 },
      { phase: "draw", seat: 3 },
      { phase: "action", seat: 3 }
    ]);
    expect(
      result.finalState.round.players[2]
        .discards
    ).toHaveLength(2);
    expect(
      result.finalState.round.currentSeat
    ).toBe(0);
    expect(
      result.finalState.round.phase
    ).toBe("discarding");
  });

  it("E-25が無効化されている場合は通常行動を1回だけ行う", () => {
    const { state, playerDiscard } =
      prepareState();

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    state.akuukan = disableAkuukanSource(
      state.akuukan,
      "enemy-ability:E-25"
    );
    state.round.liveWall = [
      createTile("man", 1),
      createTile("pin", 2),
      createTile("sou", 3),
      createTile("honor", 4)
    ];

    const result = getCpuStepOrder(
      state,
      playerDiscard.id
    );

    expect(
      result.steps.filter(
        (step) =>
          step.phase === "draw" &&
          step.seat === 2
      )
    ).toHaveLength(1);
    expect(
      result.finalState.round.players[2]
        .discards
    ).toHaveLength(1);
  });

  it("1回目の打牌で通常山が尽きた場合は2回目へ進まない", () => {
    const { state, playerDiscard } =
      prepareState();
    state.round.liveWall = [
      createTile("man", 1),
      createTile("pin", 2)
    ];

    const result = getCpuStepOrder(
      state,
      playerDiscard.id
    );

    expect(
      result.steps.filter(
        (step) =>
          step.phase === "draw" &&
          step.seat === 2
      )
    ).toHaveLength(1);
    expect(
      result.finalState.round.players[2]
        .discards
    ).toHaveLength(1);
    expect(
      result.finalState.round.phase
    ).toBe("roundEnd");
  });

  it("プレイヤーが副露を見送ると敵13の2回目へ復帰する", () => {
    const selectedEnemyDiscard =
      createTile("honor", 5);
    const { state, playerDiscard } =
      prepareState([
        createTile("honor", 5),
        createTile("honor", 5),
        createTile("pin", 9)
      ]);
    state.round.liveWall = [
      createTile("man", 1),
      selectedEnemyDiscard,
      createTile("pin", 2),
      createTile("sou", 3),
      createTile("honor", 4)
    ];

    const firstProgression =
      createPlayerDiscardProgression(
        state,
        playerDiscard.id,
        () => 0.5
      );

    expect(
      firstProgression.finalState.round
        .phase
    ).toBe("reaction");
    expect(
      firstProgression.finalState.round
        .meldCallOptions
    ).toHaveLength(1);
    expect(
      firstProgression.finalState.round
        .players[2].discards
    ).toHaveLength(1);

    const resumed =
      createPlayerReactionSkipProgression(
        firstProgression.finalState,
        () => 0.5
      );

    expect(
      resumed.cpuSteps.slice(0, 2).map(
        ({ phase, seat }) => ({
          phase,
          seat
        })
      )
    ).toEqual([
      { phase: "draw", seat: 2 },
      { phase: "action", seat: 2 }
    ]);
    expect(
      resumed.finalState.round.players[2]
        .discards
    ).toHaveLength(2);
  });

  it("プレイヤーが副露すると敵13は2回目の行動を失う", () => {
    const selectedEnemyDiscard =
      createTile("honor", 5);
    const { state, playerDiscard } =
      prepareState([
        createTile("honor", 5),
        createTile("honor", 5),
        createTile("pin", 9)
      ]);
    state.round.liveWall = [
      createTile("man", 1),
      selectedEnemyDiscard,
      createTile("pin", 2),
      createTile("sou", 3),
      createTile("honor", 4)
    ];

    const reaction =
      createPlayerDiscardProgression(
        state,
        playerDiscard.id,
        () => 0.5
      ).finalState;
    const option =
      reaction.round.meldCallOptions?.[0];

    expect(option).toBeDefined();

    const called = declarePlayerMeldCall(
      reaction,
      option?.id ?? "missing-option"
    );

    expect(called.round.currentSeat).toBe(0);
    expect(called.round.phase).toBe(
      "discarding"
    );
    expect(
      called.round.players[2].discards
    ).toHaveLength(1);
    expect(
      called.akuukan?.activeEffects.some(
        (effect) =>
          effect.sourceId ===
          "enemy-ability:E-25"
      )
    ).toBe(false);
  });

  it("1回目の打牌でロンされると局を終了して2回目へ進まない", () => {
    const winningTile = createTile(
      "man",
      2
    );
    const { state, playerDiscard } =
      prepareState(
        createPinfuWaitHand()
      );
    state.round.liveWall = [
      createTile("honor", 1),
      winningTile,
      createTile("pin", 2),
      createTile("sou", 3),
      createTile("honor", 4)
    ];

    const reaction =
      createPlayerDiscardProgression(
        state,
        playerDiscard.id,
        () => 0.5
      );

    expect(
      reaction.finalState.round.phase
    ).toBe("reaction");
    expect(
      canPlayerRon(reaction.finalState)
    ).toBe(true);
    expect(
      reaction.cpuSteps.filter(
        (step) =>
          step.phase === "draw" &&
          step.seat === 2
      )
    ).toHaveLength(1);

    const result = declarePlayerRon(
      reaction.finalState
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toMatchObject({
      winMethod: "ron",
      winnerSeat: 0,
      loserSeat: 2,
      winningTile
    });
    expect(
      result.round.players[2].discards
    ).toHaveLength(1);
  });

  it("1回目の立直後に2回目でツモると一発が成立する", () => {
    const { state, playerDiscard } =
      prepareState();
    const completeHand = createRiichiHand();
    const firstDraw =
      completeHand[completeHand.length - 1];

    state.round.players[2] = {
      ...state.round.players[2],
      hand: completeHand.slice(0, -1),
      melds: [],
      discards: [],
      riichi: false,
      doubleRiichi: false,
      ippatsu: false,
      drawnTileId: null,
      drawnTileSource: null
    };
    state.round.liveWall = [
      createTile("honor", 1),
      firstDraw,
      createTile("man", 5),
      createTile("sou", 1),
      createTile("honor", 4),
      createTile("man", 9),
      createTile("pin", 9),
      createTile("sou", 9)
    ];

    const result =
      createPlayerDiscardProgression(
        state,
        playerDiscard.id,
        () => 0.5
      ).finalState;

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toMatchObject({
      winMethod: "tsumo",
      winnerSeat: 2
    });
    expect(
      result.round.winResult?.yakuNames
    ).toContain("一発");
    expect(
      result.round.players[2].discards[0]
        .riichiDeclaration
    ).toBe(true);
  });

  it("1回目に暗槓しても嶺上打牌後に2回目の通常ツモを行う", () => {
    const { state, playerDiscard } =
      prepareState();
    const closedKanTiles = createTiles(
      "man",
      [5, 5, 5, 5]
    );

    state.round.players[2] = {
      ...state.round.players[2],
      hand: [
        ...closedKanTiles,
        ...createTiles(
          "pin",
          [1, 2, 4, 6, 8]
        ),
        ...createTiles(
          "sou",
          [1, 4, 7, 9]
        )
      ],
      melds: [],
      discards: [],
      riichi: false,
      doubleRiichi: false,
      ippatsu: false,
      drawnTileId: null,
      drawnTileSource: null
    };
    state.round.deadWall[0] =
      createTile("honor", 2);
    state.round.liveWall = [
      createTile("honor", 1),
      createTile("pin", 3),
      createTile("sou", 3),
      createTile("honor", 4),
      createTile("man", 9),
      createTile("pin", 9),
      createTile("sou", 9)
    ];

    const progression =
      createPlayerDiscardProgression(
        state,
        playerDiscard.id,
        () => 0.5
      );
    const selectedEnemy =
      progression.finalState.round
        .players[2];

    expect(
      selectedEnemy.melds.some(
        (meld) =>
          meld.kind === "closedKan"
      )
    ).toBe(true);
    expect(
      progression.finalState.round.kanCount
    ).toBe(1);
    expect(
      progression.finalState.round
        .rinshanDrawCount
    ).toBe(1);
    expect(selectedEnemy.discards).toHaveLength(2);
    expect(
      progression.cpuSteps.filter(
        (step) =>
          step.phase === "draw" &&
          step.seat === 2
      )
    ).toHaveLength(2);
  });
});
