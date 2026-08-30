import {
  describe,
  expect,
  it
} from "vitest";
import type {
  AkuukanMatchSetup
} from "../akuukan/types";
import {
  canPlayerTsumo,
  createInitialGameState,
  declarePlayerRon,
  declarePlayerTsumo,
  getRonCandidates,
  playPlayerDiscard,
  skipPlayerRon
} from "./engine";
import type {
  Discard,
  GameState,
  Meld,
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
      `engine-akuukan-win-${serialNumber}`,
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
  tile: Tile
): Discard {
  return {
    tile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };
}

function createSevenPairsHand(): {
  hand: Tile[];
  winningTile: Tile;
} {
  const waitingTile =
    createTile("honor", 1);
  const winningTile =
    createTile("honor", 1);

  return {
    hand: [
      ...createTiles(
        "man",
        [1, 1, 4, 4, 7, 7]
      ),
      ...createTiles(
        "pin",
        [2, 2, 5, 5]
      ),
      ...createTiles(
        "sou",
        [8, 8]
      ),
      waitingTile,
      winningTile
    ],
    winningTile
  };
}

function createPinfuWaitHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [2, 3, 4, 5, 6]
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

function createOpenSanshokuWait(): {
  hand: Tile[];
  meld: Meld;
  winningTile: Tile;
} {
  const winningTile =
    createTile("sou", 1);

  return {
    hand: [
      ...createTiles(
        "pin",
        [1, 2, 3]
      ),
      ...createTiles(
        "sou",
        [2, 3]
      ),
      ...createTiles(
        "man",
        [4, 5, 6]
      ),
      ...createTiles(
        "honor",
        [6, 6]
      )
    ],
    meld: {
      kind: "chi",
      tiles: createTiles(
        "man",
        [1, 2, 3]
      )
    },
    winningTile
  };
}

function createNonWinningHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [1, 2, 4, 5, 7, 8]
    ),
    ...createTiles(
      "pin",
      [1, 2, 4, 5, 7, 8]
    ),
    createTile("honor", 1)
  ];
}

function setPlayerHand(
  state: GameState,
  seat: SeatIndex,
  hand: Tile[]
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand,
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

function createBaseState(
  setup: AkuukanMatchSetup
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    setup
  );

  state.round.deadWall = Array.from(
    { length: 14 },
    () => createTile("honor", 7)
  );
  state.round.liveWall = [
    createTile("honor", 2)
  ];
  state.round.honba = 0;
  state.round.riichiPool = 0;
  state.round.winResult = null;
  state.round.doubleRonResult = null;
  state.round.drawResult = null;
  state.round.abortiveDrawResult = null;

  return state;
}

function preparePlayerTsumoState(
  setup: AkuukanMatchSetup
): GameState {
  const state = createBaseState(setup);
  const {
    hand,
    winningTile
  } = createSevenPairsHand();

  setPlayerHand(state, 0, hand);
  state.round.players[0] = {
    ...state.round.players[0],
    drawnTileId: winningTile.id,
    drawnTileSource: "liveWall"
  };
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.turnNumber = 4;
  state.round.lastDiscard = null;

  return state;
}

function prepareRonState(
  setup: AkuukanMatchSetup,
  discarderSeat: SeatIndex
): {
  state: GameState;
  winningTile: Tile;
} {
  const state = createBaseState(setup);
  const winningTile =
    createTile("man", 1);

  for (
    let seat = 0 as SeatIndex;
    seat < 4;
    seat = (seat + 1) as SeatIndex
  ) {
    setPlayerHand(
      state,
      seat,
      createNonWinningHand()
    );
  }

  state.round.players[
    discarderSeat
  ].discards = [
    createDiscard(winningTile)
  ];
  state.round.currentSeat =
    ((discarderSeat + 1) % 4) as SeatIndex;
  state.round.phase = "reaction";
  state.round.lastDiscard = {
    seat: discarderSeat,
    discard: createDiscard(winningTile)
  };

  return {
    state,
    winningTile
  };
}

function prepareE4SelectedEnemyTsumoState(
  ippatsu: boolean,
  afterHandChange: boolean
): {
  state: GameState;
  playerDiscard: Tile;
  uraIndicator: Tile;
} {
  const state = createBaseState({
    enemyId: "enemy-2",
    equippedSkills: []
  });
  const playerDiscard = createTile(
    "honor",
    7
  );
  const winningTile = createTile(
    "man",
    6
  );
  const uraIndicator = createTile(
    "man",
    3
  );
  const waitingHand = [
    ...createTiles("man", [1, 2, 3, 4, 5]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [1, 2, 3]),
    ...createTiles("honor", [1, 1])
  ];
  const declarationDiscard = {
    ...createDiscard(
      createTile("pin", 9)
    ),
    riichiDeclaration: true
  };
  const disguisedHandChange = {
    ...createDiscard(
      createTile("pin", 8)
    ),
    tsumogiri: true
  };

  setPlayerHand(
    state,
    0,
    [playerDiscard]
  );
  setPlayerHand(state, 1, []);
  setPlayerHand(
    state,
    2,
    waitingHand
  );
  setPlayerHand(state, 3, []);

  state.round.players[0] = {
    ...state.round.players[0],
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };
  state.round.players[2] = {
    ...state.round.players[2],
    score: 24000,
    riichi: true,
    doubleRiichi: true,
    ippatsu,
    discards: [
      declarationDiscard,
      ...(afterHandChange
        ? [disguisedHandChange]
        : [])
    ]
  };
  state.round.deadWall = Array.from(
    { length: 14 },
    () => createTile("honor", 7)
  );
  state.round.deadWall[5] =
    uraIndicator;
  state.round.doraIndicatorCount = 1;
  state.round.liveWall = [
    createTile("honor", 6),
    winningTile,
    ...createTiles(
      "pin",
      [7, 8, 9, 7, 8, 9]
    )
  ];
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.turnNumber = 8;
  state.round.riichiPool = 1000;
  state.round.lastDiscard = null;

  return {
    state,
    playerDiscard,
    uraIndicator
  };
}

describe("ゲーム本体の亜空間和了判定", () => {
  it("E-4で手替わり後に和了してもダブル立直と裏ドラを適用する", () => {
    const {
      state,
      playerDiscard,
      uraIndicator
    } = prepareE4SelectedEnemyTsumoState(
      false,
      true
    );

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );

    expect(result.round.winResult).toMatchObject({
      winnerSeat: 2,
      winMethod: "tsumo",
      doraCount: 1
    });
    expect(
      result.round.winResult?.yakuNames
    ).toEqual(
      expect.arrayContaining([
        "ダブル立直",
        "門前清自摸和"
      ])
    );
    expect(
      result.round.winResult?.yakuNames
    ).not.toContain("一発");
    expect(
      result.round.winResult
        ?.uraDoraIndicatorTiles
    ).toEqual([uraIndicator]);
  });

  it("E-4所有者が一発期間中に和了すれば一発も適用する", () => {
    const {
      state,
      playerDiscard,
      uraIndicator
    } = prepareE4SelectedEnemyTsumoState(
      true,
      false
    );

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );

    expect(result.round.winResult).toMatchObject({
      winnerSeat: 2,
      winMethod: "tsumo",
      doraCount: 1
    });
    expect(
      result.round.winResult?.yakuNames
    ).toEqual(
      expect.arrayContaining([
        "ダブル立直",
        "一発",
        "門前清自摸和"
      ])
    );
    expect(
      result.round.winResult
        ?.uraDoraIndicatorTiles
    ).toEqual([uraIndicator]);
  });
  
  it("七対子強化をプレイヤーの実際の得点へ反映する", () => {
    const state = preparePlayerTsumoState({
      enemyId: "enemy-1",
      equippedSkills: [
        {
          id: "2-14",
          level: 5
        }
      ]
    });

    expect(canPlayerTsumo(state)).toBe(true);

    const result =
      declarePlayerTsumo(state);

    expect(result.round.winResult).toMatchObject({
      winnerSeat: 0,
      winMethod: "tsumo",
      han: 5,
      fu: 25,
      totalPoints: 12000
    });
    expect(
      result.round.winResult?.yakuNames
    ).toEqual(
      expect.arrayContaining([
        "門前清自摸和",
        "七対子"
      ])
    );
    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      37000,
      21000,
      21000,
      21000
    ]);
  });

  it("E-7で七対子形を失ったプレイヤーを和了不可にする", () => {
    const state = preparePlayerTsumoState({
      enemyId: "enemy-7",
      equippedSkills: []
    });

    expect(canPlayerTsumo(state)).toBe(false);

    const result =
      declarePlayerTsumo(state);

    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(result.round.winResult).toBeNull();
    expect(result.notice).toBe(
      "現在の手牌ではツモ和了できません。"
    );
  });

  it("E-6で能力者CPUの前回と同じ役を2倍にする", () => {
    const {
      state
    } = prepareRonState(
      {
        enemyId: "enemy-3",
        equippedSkills: []
      },
      1
    );

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    state.akuukan = {
      ...state.akuukan,
      e6LastWinningNormalYakuIds: [
        "pinfu"
      ]
    };
    setPlayerHand(
      state,
      2,
      createPinfuWaitHand()
    );

    const candidate =
      getRonCandidates(state).find(
        (result) =>
          result.winnerSeat === 2
      );

    expect(candidate).toBeDefined();
    expect(
      candidate?.evaluation.best.normalYaku
    ).toEqual([
      {
        id: "pinfu",
        name: "平和",
        han: 2
      }
    ]);
    expect(
      candidate?.evaluation.best.totalHan
    ).toBe(2);
    expect(
      candidate?.evaluation.best.score
        .totalPoints
    ).toBe(2000);

    const result = skipPlayerRon(state);

    expect(result.round.winResult).toMatchObject({
      winnerSeat: 2,
      loserSeat: 1,
      han: 2,
      fu: 30,
      totalPoints: 2000
    });
    expect(
      result.akuukan
        ?.e6LastWinningNormalYakuIds
    ).toEqual(["pinfu"]);
  });

  it("E-6の履歴を能力者CPUを含むダブロン後に更新する", () => {
    const {
      state
    } = prepareRonState(
      {
        enemyId: "enemy-3",
        equippedSkills: []
      },
      1
    );

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    state.akuukan = {
      ...state.akuukan,
      e6LastWinningNormalYakuIds: [
        "tanyao"
      ]
    };
    setPlayerHand(
      state,
      2,
      createPinfuWaitHand()
    );
    setPlayerHand(
      state,
      3,
      createPinfuWaitHand()
    );

    const result = skipPlayerRon(state);

    expect(
      result.round.doubleRonResult
        ?.winResults.map(
          (winResult) =>
            winResult.winnerSeat
        )
    ).toEqual([2, 3]);
    expect(
      result.akuukan
        ?.e6LastWinningNormalYakuIds
    ).toEqual(["pinfu"]);
  });

  it("三家和ではE-6の履歴を更新しない", () => {
    const {
      state
    } = prepareRonState(
      {
        enemyId: "enemy-3",
        equippedSkills: []
      },
      1
    );

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    state.akuukan = {
      ...state.akuukan,
      e6LastWinningNormalYakuIds: [
        "tanyao"
      ]
    };
    setPlayerHand(
      state,
      0,
      createPinfuWaitHand()
    );
    setPlayerHand(
      state,
      2,
      createPinfuWaitHand()
    );
    setPlayerHand(
      state,
      3,
      createPinfuWaitHand()
    );

    const result =
      declarePlayerRon(state);

    expect(
      result.round.abortiveDrawResult
    ).toMatchObject({
      reason: "tripleRon"
    });
    expect(
      result.akuukan
        ?.e6LastWinningNormalYakuIds
    ).toEqual(["tanyao"]);
  });

  it("能力者CPUの流し満貫後にE-6の通常役履歴を空にする", () => {
    const state = createBaseState({
      enemyId: "enemy-3",
      equippedSkills: []
    });
    const finalDiscard =
      createTile("honor", 7);

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    state.akuukan = {
      ...state.akuukan,
      e6LastWinningNormalYakuIds: [
        "pinfu"
      ]
    };
    state.round.liveWall = [];
    setPlayerHand(
      state,
      0,
      [finalDiscard]
    );
    state.round.players[0] = {
      ...state.round.players[0],
      discards: [
        createDiscard(
          createTile("man", 5)
        )
      ],
      drawnTileId: finalDiscard.id,
      drawnTileSource: "liveWall"
    };
    setPlayerHand(state, 1, []);
    setPlayerHand(state, 2, []);
    setPlayerHand(state, 3, []);
    state.round.players[2].discards = [
      createDiscard(
        createTile("pin", 9)
      )
    ];
    state.round.currentSeat = 0;
    state.round.phase = "discarding";
    state.round.lastDiscard = null;

    const result = playPlayerDiscard(
      state,
      finalDiscard.id,
      () => 0.5
    );

    expect(
      result.round.nagashiManganResult
        ?.winnerSeats
    ).toEqual([2]);
    expect(
      result.akuukan
        ?.e6LastWinningNormalYakuIds
    ).toEqual([]);
  });

  it("E-17を通常CPUだけに適用して能力者CPUには適用しない", () => {
    const {
      state
    } = prepareRonState(
      {
        enemyId: "enemy-9",
        equippedSkills: []
      },
      0
    );

    setPlayerHand(
      state,
      1,
      createPinfuWaitHand()
    );
    setPlayerHand(
      state,
      2,
      createPinfuWaitHand()
    );

    const candidates =
      getRonCandidates(state);

    expect(
      candidates.map(
        (candidate) =>
          candidate.winnerSeat
      )
    ).toEqual([2]);
    expect(
      candidates[0]?.evaluation.best
        .normalYaku
    ).toEqual([
      {
        id: "pinfu",
        name: "平和",
        han: 1
      }
    ]);
  });

  it("E-14で能力者CPUの副露ロンへ門前ロン10符を加える", () => {
    const {
      state
    } = prepareRonState(
      {
        enemyId: "enemy-5",
        equippedSkills: []
      },
      1
    );
    const {
      hand,
      meld,
      winningTile
    } = createOpenSanshokuWait();

    setPlayerHand(state, 2, hand);
    state.round.players[2].melds = [meld];
    state.round.players[1].discards = [
      createDiscard(winningTile)
    ];
    state.round.lastDiscard = {
      seat: 1,
      discard: createDiscard(
        winningTile
      )
    };

    const candidate =
      getRonCandidates(state).find(
        (result) =>
          result.winnerSeat === 2
      );

    expect(
      candidate?.evaluation.best.normalYaku
    ).toEqual([
      {
        id: "sanshokuDoujun",
        name: "三色同順",
        han: 2
      }
    ]);
    expect(
      candidate?.evaluation.best.fu?.fu
    ).toBe(40);
    expect(
      candidate?.evaluation.best.fu
        ?.components
    ).toEqual(
      expect.arrayContaining([
        {
          id: "closedRon",
          name: "門前ロン",
          fu: 10
        }
      ])
    );
    expect(
      candidate?.evaluation.best.score
        .totalPoints
    ).toBe(2600);
  });

  it("発動中の門前回帰でプレイヤーの副露ロンへ門前ロン10符を加える", () => {
    const {
      state
    } = prepareRonState(
      {
        enemyId: "enemy-1",
        equippedSkills: [
          {
            id: "1-15",
            level: 1
          }
        ]
      },
      1
    );
    const {
      hand,
      meld,
      winningTile
    } = createOpenSanshokuWait();

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    state.akuukan = {
      ...state.akuukan,
      activeEffects: [
        {
          instanceId:
            "menzen-kaiki-active",
          sourceId:
            "player-skill:1-15",
          remainingTurns: 1
        }
      ]
    };
    setPlayerHand(state, 0, hand);
    state.round.players[0].melds = [meld];
    state.round.players[1].discards = [
      createDiscard(winningTile)
    ];
    state.round.lastDiscard = {
      seat: 1,
      discard: createDiscard(
        winningTile
      )
    };

    const candidate =
      getRonCandidates(state).find(
        (result) =>
          result.winnerSeat === 0
      );

    expect(
      candidate?.evaluation.best.normalYaku
    ).toEqual([
      {
        id: "sanshokuDoujun",
        name: "三色同順",
        han: 2
      }
    ]);
    expect(
      candidate?.evaluation.best.fu?.fu
    ).toBe(40);
    expect(
      candidate?.evaluation.best.fu
        ?.components
    ).toEqual(
      expect.arrayContaining([
        {
          id: "closedRon",
          name: "門前ロン",
          fu: 10
        }
      ])
    );
    expect(
      candidate?.evaluation.best.score
        .totalPoints
    ).toBe(3900);
  });
});
