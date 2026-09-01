import {
  describe,
  expect,
  it
} from "vitest";
import {
  getAkuukanE19ForbiddenTileIds
} from "../akuukan/discardLegality";
import {
  disableAkuukanSource
} from "../akuukan/state";
import {
  completePlayerSelfKan,
  createInitialGameState,
  createPlayerDiscardProgression,
  declarePlayerMeldCall,
  declarePlayerSelfKan,
  discardTile,
  getPlayerRiichiDiscardTileIds,
  getPlayerSelfKanOptions,
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
    id: `engine-e19-${serialNumber}`,
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

function createDiscard(tile: Tile): Discard {
  return {
    tile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };
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

    return seed / 0x100000000;
  };
}

function createState(): GameState {
  return createInitialGameState(
    createSeededRandom(123456789),
    {
      enemyId: "enemy-10",
      equippedSkills: []
    }
  );
}

function getForbiddenIds(
  state: GameState,
  playerId: string
): readonly string[] {
  if (!state.akuukan) {
    throw new Error(
      "亜空間状態がありません。"
    );
  }

  return getAkuukanE19ForbiddenTileIds(
    state.akuukan,
    playerId
  );
}

function endRound(state: GameState): GameState {
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

describe("敵10 E-19のエンジン統合", () => {
  it("配牌13枚から他家3人へ3枚ずつ指定する", () => {
    const state = createState();

    expect(
      state.akuukan?.e19DiscardRestrictions
    ).toHaveLength(9);

    for (const seat of [0, 1, 3] as const) {
      const player =
        state.round.players[seat];
      const forbiddenIds =
        getForbiddenIds(
          state,
          player.id
        );

      expect(forbiddenIds).toHaveLength(3);
      expect(
        new Set(forbiddenIds).size
      ).toBe(3);
      expect(
        forbiddenIds.every((tileId) =>
          player.hand.some(
            (tile) => tile.id === tileId
          )
        )
      ).toBe(true);
    }

    expect(
      getForbiddenIds(
        state,
        state.round.players[2].id
      )
    ).toEqual([]);
    expect(
      getForbiddenIds(
        state,
        state.round.players[0].id
      )
    ).not.toContain(
      state.round.players[0].drawnTileId
    );
    expect(
      state.round.players.map(
        (player) => player.hand.length
      )
    ).toEqual([14, 13, 13, 13]);

    const allTileIds = [
      ...state.round.players.flatMap(
        (player) =>
          player.hand.map(
            (tile) => tile.id
          )
      ),
      ...state.round.liveWall.map(
        (tile) => tile.id
      ),
      ...state.round.deadWall.map(
        (tile) => tile.id
      )
    ];

    expect(allTileIds).toHaveLength(136);
    expect(new Set(allTileIds).size).toBe(136);
  });

  it("指定牌の打牌を拒否し指定外の第1ツモ牌は打牌できる", () => {
    const state = createState();
    const player = state.round.players[0];
    const forbiddenTileId =
      getForbiddenIds(state, player.id)[0];

    if (!forbiddenTileId) {
      throw new Error(
        "禁止牌が指定されていません。"
      );
    }

    const rejected = discardTile(
      state,
      forbiddenTileId
    );

    expect(rejected.round.turnNumber).toBe(
      state.round.turnNumber
    );
    expect(rejected.round.lastDiscard).toBeNull();
    expect(rejected.notice).toContain(
      "敵10の能力"
    );

    const drawnTileId = player.drawnTileId;

    if (!drawnTileId) {
      throw new Error(
        "親の第1ツモ牌がありません。"
      );
    }

    const accepted = discardTile(
      state,
      drawnTileId
    );

    expect(accepted.round.turnNumber).toBe(
      state.round.turnNumber + 1
    );
    expect(
      accepted.round.lastDiscard?.discard
        .tile.id
    ).toBe(drawnTileId);
  });

  it("CPUはE-19の指定牌を残して指定外のツモ牌を捨てる", () => {
    const state = createState();
    const playerDiscard = createTile(
      "man",
      9
    );
    const cpuForbiddenTile = createTile(
      "man",
      1
    );
    const cpuDrawnTile = createTile(
      "pin",
      9
    );

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [playerDiscard],
      drawnTileId: playerDiscard.id,
      drawnTileSource: "liveWall"
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: [cpuForbiddenTile],
      melds: [],
      discards: [],
      drawnTileId: null,
      drawnTileSource: null
    };

    for (const seat of [2, 3] as const) {
      state.round.players[seat] = {
        ...state.round.players[seat],
        hand: [],
        melds: [],
        discards: [],
        drawnTileId: null,
        drawnTileSource: null
      };
    }

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態がありません。"
      );
    }

    state.akuukan = {
      ...state.akuukan,
      e19DiscardRestrictions: [{
        playerId:
          state.round.players[1].id,
        tileId: cpuForbiddenTile.id
      }]
    };
    state.round.currentSeat = 0;
    state.round.phase = "discarding";
    state.round.lastDiscard = null;
    state.round.liveWall = [
      cpuDrawnTile,
      createTile("sou", 9),
      createTile("honor", 7),
      createTile("man", 2)
    ];

    const progression =
      createPlayerDiscardProgression(
        state,
        playerDiscard.id,
        () => 0.5
      );
    const cpuAction =
      progression.cpuSteps.find(
        (step) =>
          step.phase === "action" &&
          step.seat === 1
      );

    expect(cpuAction).toBeDefined();
    expect(
      cpuAction?.state.round.lastDiscard
        ?.discard.tile.id
    ).toBe(cpuDrawnTile.id);
    expect(
      cpuAction?.state.round.players[1]
        .hand.map((tile) => tile.id)
    ).toContain(cpuForbiddenTile.id);
  });

  it("立直候補からE-19の指定牌だけを除外する", () => {
    const state = createState();
    const hand = [
      ...createTiles("man", [2, 3, 4]),
      ...createTiles("pin", [2, 3, 4]),
      ...createTiles("sou", [2, 3, 4]),
      ...createTiles("sou", [6, 7, 8]),
      createTile("man", 5),
      createTile("pin", 5)
    ];

    state.round.players[0] = {
      ...state.round.players[0],
      hand,
      melds: [],
      discards: [],
      riichi: false,
      drawnTileId: hand[13].id,
      drawnTileSource: "liveWall"
    };

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態がありません。"
      );
    }

    state.akuukan = {
      ...state.akuukan,
      e19DiscardRestrictions: [{
        playerId:
          state.round.players[0].id,
        tileId: hand[12].id
      }]
    };

    expect(
      getPlayerRiichiDiscardTileIds(state)
    ).toEqual([
      hand[0].id,
      hand[3].id,
      hand[13].id
    ]);
  });

  it("副露または暗槓に使った指定牌の禁止状態を解除する", () => {
    const callState = createState();
    const calledTile = createTile(
      "honor",
      5
    );
    const restrictedCallTile = createTile(
      "honor",
      5
    );
    const secondCallTile = createTile(
      "honor",
      5
    );
    const retainedRestrictedTile =
      createTile("man", 9);
    const discard = createDiscard(
      calledTile
    );
    const option = {
      id: "engine-e19-pon",
      kind: "pon" as const,
      callerSeat: 0 as const,
      discarderSeat: 1 as const,
      calledTileId: calledTile.id,
      handTileIds: [
        restrictedCallTile.id,
        secondCallTile.id
      ] as [string, string]
    };

    callState.round.players[0] = {
      ...callState.round.players[0],
      hand: [
        restrictedCallTile,
        secondCallTile,
        retainedRestrictedTile
      ],
      melds: [],
      drawnTileId: null,
      drawnTileSource: null
    };

    for (const seat of [1, 2, 3] as const) {
      callState.round.players[seat] = {
        ...callState.round.players[seat],
        hand: [],
        melds: [],
        drawnTileId: null,
        drawnTileSource: null,
        ...(seat === 1
          ? { discards: [discard] }
          : {})
      };
    }

    if (!callState.akuukan) {
      throw new Error(
        "亜空間状態がありません。"
      );
    }

    callState.akuukan = {
      ...callState.akuukan,
      e19DiscardRestrictions: [
        {
          playerId:
            callState.round.players[0].id,
          tileId: restrictedCallTile.id
        },
        {
          playerId:
            callState.round.players[0].id,
          tileId:
            retainedRestrictedTile.id
        }
      ]
    };
    callState.round.phase = "reaction";
    callState.round.lastDiscard = {
      seat: 1,
      discard
    };
    callState.round.meldCallOptions = [
      option
    ];

    const callResult =
      declarePlayerMeldCall(
        callState,
        option.id
      );

    expect(
      getForbiddenIds(
        callResult,
        callResult.round.players[0].id
      )
    ).toEqual([
      retainedRestrictedTile.id
    ]);

    const kanState = createState();
    const closedKanTiles = createTiles(
      "pin",
      [5, 5, 5, 5]
    );
    const otherTiles = createTiles(
      "sou",
      [1, 2, 3, 4, 6, 7, 8, 9, 1, 2]
    );

    kanState.round.players[0] = {
      ...kanState.round.players[0],
      hand: [
        ...closedKanTiles,
        ...otherTiles
      ],
      melds: [],
      drawnTileId:
        otherTiles[otherTiles.length - 1].id,
      drawnTileSource: "liveWall"
    };

    if (!kanState.akuukan) {
      throw new Error(
        "亜空間状態がありません。"
      );
    }

    kanState.akuukan = {
      ...kanState.akuukan,
      e19DiscardRestrictions: [{
        playerId:
          kanState.round.players[0].id,
        tileId: closedKanTiles[0].id
      }]
    };

    const closedKanOption =
      getPlayerSelfKanOptions(kanState)
        .find(
          (candidate) =>
            candidate.kind === "closedKan" &&
            candidate.tileIds.includes(
              closedKanTiles[0].id
            )
        );

    if (!closedKanOption) {
      throw new Error(
        "暗槓候補がありません。"
      );
    }

    const declared = declarePlayerSelfKan(
      kanState,
      closedKanOption.id
    );
    const completed =
      completePlayerSelfKan(declared);

    expect(
      getForbiddenIds(
        completed,
        completed.round.players[0].id
      )
    ).toEqual([]);
  });

  it("次局で指定を作り直しE-19無効時は指定を消す", () => {
    const state = createState();

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態がありません。"
      );
    }

    state.akuukan = {
      ...state.akuukan,
      e19DiscardRestrictions: [{
        playerId: "player-0",
        tileId: "stale-e19-tile"
      }]
    };

    const nextState = startNextRound(
      endRound(state),
      createSeededRandom(987654321)
    );

    expect(
      nextState.akuukan
        ?.e19DiscardRestrictions
    ).toHaveLength(9);
    expect(
      nextState.akuukan
        ?.e19DiscardRestrictions
        ?.some(
          (restriction) =>
            restriction.tileId ===
            "stale-e19-tile"
        )
    ).toBe(false);
    expect(
      getForbiddenIds(
        nextState,
        nextState.round.players[0].id
      )
    ).not.toContain(
      nextState.round.players[0].drawnTileId
    );

    const disabledState: GameState = {
      ...state,
      akuukan: disableAkuukanSource(
        state.akuukan,
        "enemy-ability:E-19"
      )
    };
    const disabledNextState = startNextRound(
      endRound(disabledState),
      createSeededRandom(987654321)
    );

    expect(
      disabledNextState.akuukan
        ?.e19DiscardRestrictions
    ).toBeUndefined();
  });
});
