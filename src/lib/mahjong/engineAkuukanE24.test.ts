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
  getPlayerMeldCallOptions,
  getPlayerOpenKanCallOptions,
  getPlayerSelfKanOptions,
  getRonCandidates,
  playPlayerDiscard
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
    id: `engine-akuukan-e24-${serialNumber}`,
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

type E24TestEnemyId =
  | "enemy-1"
  | "enemy-12";

function createState(
  enemyId:
    E24TestEnemyId = "enemy-12"
): GameState {
  return createInitialGameState(
    () => 0.5,
    {
      enemyId,
      equippedSkills: []
    }
  );
}

function setHand(
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

function prepareRonState(
  discarderSeat: SeatIndex
): {
  state: GameState;
  winningTile: Tile;
} {
  const state = createState();
  const winningTile = createTile(
    "man",
    2
  );
  const discard = createDiscard(
    winningTile
  );

  setHand(
    state,
    0,
    createPinfuWaitHand()
  );
  setHand(state, 1, []);
  setHand(state, 2, []);
  setHand(state, 3, []);
  state.round.players[
    discarderSeat
  ].discards = [discard];
  state.round.currentSeat =
    ((discarderSeat + 1) % 4) as SeatIndex;
  state.round.phase = "reaction";
  state.round.lastDiscard = {
    seat: discarderSeat,
    discard
  };

  return {
    state,
    winningTile
  };
}

function setShortLiveWall(
  state: GameState,
  selectedEnemyDraw: Tile
): void {
  state.round.liveWall = [
    createTile("honor", 1),
    selectedEnemyDraw,
    createTile("honor", 2),
    createTile("honor", 3),
    createTile("honor", 4),
    createTile("man", 1),
    createTile("pin", 9),
    createTile("sou", 1),
    createTile("sou", 9)
  ];
}

function preparePlayerPonFlow(
  enemyId: E24TestEnemyId
): {
  state: GameState;
  playerDiscard: Tile;
} {
  const state = createState(enemyId);
  const playerDiscard = createTile(
    "honor",
    7
  );
  const selectedEnemyDiscard = createTile(
    "honor",
    5
  );

  setHand(
    state,
    0,
    [
      ...createTiles("honor", [5, 5]),
      ...createTiles(
        "man",
        [1, 2, 3, 4, 6, 7]
      ),
      ...createTiles(
        "pin",
        [1, 2, 3, 4, 6]
      ),
      playerDiscard
    ]
  );
  state.round.players[0] = {
    ...state.round.players[0],
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };
  setHand(state, 1, []);
  setHand(state, 2, []);
  setHand(state, 3, []);
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  setShortLiveWall(
    state,
    selectedEnemyDiscard
  );

  return {
    state,
    playerDiscard
  };
}

function preparePlayerOpenKanState(
  discarderSeat: 1 | 2
): GameState {
  const state = createState();
  const calledTile = createTile(
    "man",
    2
  );
  const handTiles = createTiles(
    "man",
    [2, 2, 2]
  );
  const discard = createDiscard(
    calledTile
  );

  setHand(
    state,
    0,
    [
      ...handTiles,
      ...createTiles(
        "sou",
        [1, 2, 3, 4, 5, 6, 7, 8, 9]
      ),
      createTile("pin", 1)
    ]
  );
  state.round.players[
    discarderSeat
  ].discards = [discard];
  state.round.phase = "reaction";
  state.round.lastDiscard = {
    seat: discarderSeat,
    discard
  };
  state.round.meldCallOptions = [{
    id: "engine-akuukan-e24-pon",
    kind: "pon",
    callerSeat: 0,
    discarderSeat,
    calledTileId: calledTile.id,
    handTileIds: [
      handTiles[0].id,
      handTiles[1].id
    ]
  }];

  return state;
}

type CpuOpenCallKind =
  | "pon"
  | "openKan";

function createCpuCallHand(
  kind: CpuOpenCallKind
): Tile[] {
  return kind === "pon"
    ? [
        ...createTiles(
          "honor",
          [5, 5]
        ),
        ...createTiles(
          "man",
          [2, 2, 9]
        ),
        ...createTiles(
          "pin",
          [1, 2, 3, 4, 5, 6]
        ),
        ...createTiles("sou", [7, 8])
      ]
    : [
        ...createTiles(
          "honor",
          [5, 5, 5]
        ),
        ...createTiles("man", [2, 2]),
        ...createTiles(
          "pin",
          [1, 2, 3, 4, 5, 6]
        ),
        ...createTiles("sou", [7, 8])
      ];
}

function prepareCpuCallFlow(
  enemyId: E24TestEnemyId,
  kind: CpuOpenCallKind
): {
  state: GameState;
  playerDiscard: Tile;
} {
  const state = createState(enemyId);
  const playerDiscard = createTile(
    "honor",
    7
  );
  const selectedEnemyDiscard = createTile(
    "honor",
    5
  );

  setHand(state, 0, [playerDiscard]);
  state.round.players[0] = {
    ...state.round.players[0],
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };
  setHand(state, 1, []);
  setHand(state, 2, []);
  setHand(
    state,
    3,
    createCpuCallHand(kind)
  );
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  setShortLiveWall(
    state,
    selectedEnemyDiscard
  );

  return {
    state,
    playerDiscard
  };
}

function createPlayerSelfKanState():
  GameState {
  const state = createState();
  const ponTiles = createTiles(
    "honor",
    [6, 6, 6]
  );
  const addedTile = createTile(
    "honor",
    6
  );
  const closedKanTiles = createTiles(
    "man",
    [5, 5, 5, 5]
  );
  const otherTiles = createTiles(
    "pin",
    [1, 2, 3, 4, 6, 7]
  );
  const pon: Meld = {
    kind: "pon",
    tiles: ponTiles,
    calledFrom: 3,
    calledTileId: ponTiles[0].id
  };

  setHand(
    state,
    0,
    [
      addedTile,
      ...closedKanTiles,
      ...otherTiles
    ]
  );
  state.round.players[0] = {
    ...state.round.players[0],
    melds: [pon],
    drawnTileId:
      otherTiles[otherTiles.length - 1].id,
    drawnTileSource: "liveWall"
  };
  state.round.currentSeat = 0;
  state.round.phase = "discarding";

  return state;
}

describe("E-24のエンジン統合", () => {
  it("敵12の捨て牌ではプレイヤーと通常CPUのロン候補を除外する", () => {
    const restricted =
      prepareRonState(2).state;

    setHand(
      restricted,
      3,
      createPinfuWaitHand()
    );

    expect(canPlayerRon(restricted)).toBe(
      false
    );
    expect(
      getRonCandidates(restricted)
    ).toEqual([]);

    const disabled =
      prepareRonState(2).state;

    setHand(
      disabled,
      3,
      createPinfuWaitHand()
    );

    if (!disabled.akuukan) {
      throw new Error(
        "亜空間状態がありません。"
      );
    }

    disabled.akuukan =
      disableAkuukanSource(
        disabled.akuukan,
        "enemy-ability:E-24"
      );

    expect(
      getRonCandidates(disabled).map(
        (candidate) =>
          candidate.winnerSeat
      )
    ).toEqual([3, 0]);
  });

  it("通常CPUの捨て牌ならプレイヤーはロンできる", () => {
    const { state } =
      prepareRonState(1);

    expect(canPlayerRon(state)).toBe(true);
    expect(
      getRonCandidates(state).map(
        (candidate) =>
          candidate.winnerSeat
      )
    ).toEqual([0]);
  });

  it("敵12の加槓には槍槓できる", () => {
    const state = createState();
    const winningTile = createTile(
      "man",
      2
    );

    setHand(
      state,
      0,
      createPinfuWaitHand()
    );
    setHand(state, 1, []);
    setHand(state, 2, [winningTile]);
    setHand(state, 3, []);
    state.round.phase = "reaction";
    state.round.lastDiscard = null;
    state.round.pendingKan = {
      id: "engine-akuukan-e24-added-kan",
      kind: "addedKan",
      declarerSeat: 2,
      meldIndex: 0,
      tileId: winningTile.id,
      chankanTileId: winningTile.id
    };

    const candidates =
      getRonCandidates(state);

    expect(
      candidates.map(
        (candidate) =>
          candidate.winnerSeat
      )
    ).toEqual([0]);
    expect(
      candidates[0].evaluation.best
        .normalYaku.map(
          (yaku) => yaku.id
        )
    ).toContain("chankan");
  });

  it("敵12の捨て牌ではプレイヤーのポン確認を表示しない", () => {
    const normal = preparePlayerPonFlow(
      "enemy-1"
    );
    const restricted =
      preparePlayerPonFlow(
        "enemy-12"
      );
    const normalProgression =
      createPlayerDiscardProgression(
        normal.state,
        normal.playerDiscard.id,
        () => 0.5
      );
    const restrictedProgression =
      createPlayerDiscardProgression(
        restricted.state,
        restricted.playerDiscard.id,
        () => 0.5
      );

    expect(
      getPlayerMeldCallOptions(
        normalProgression.finalState
      ).some(
        (option) =>
          option.kind === "pon" &&
          option.discarderSeat === 2
      )
    ).toBe(true);
    expect(
      getPlayerMeldCallOptions(
        restrictedProgression.finalState
      )
    ).toEqual([]);
  });

  it("プレイヤーの大明槓は敵12の捨て牌だけ禁止する", () => {
    expect(
      getPlayerOpenKanCallOptions(
        preparePlayerOpenKanState(2)
      )
    ).toEqual([]);
    expect(
      getPlayerOpenKanCallOptions(
        preparePlayerOpenKanState(1)
      )
    ).toHaveLength(1);
  });

  it("通常CPUも敵12の捨て牌をポン・大明槓しない", () => {
    for (const kind of [
      "pon",
      "openKan"
    ] as const) {
      const normal = prepareCpuCallFlow(
        "enemy-1",
        kind
      );
      const restricted =
        prepareCpuCallFlow(
          "enemy-12",
          kind
        );
      const normalResult =
        playPlayerDiscard(
          normal.state,
          normal.playerDiscard.id,
          () => 0.5
        );
      const restrictedResult =
        playPlayerDiscard(
          restricted.state,
          restricted.playerDiscard.id,
          () => 0.5
        );

      expect(
        normalResult.round.players[3]
          .melds[0]
      ).toMatchObject({ kind });
      expect(
        restrictedResult.round.players[3]
          .melds
      ).toHaveLength(0);
    }
  });

  it("プレイヤー自身の暗槓・加槓候補は残す", () => {
    const options =
      getPlayerSelfKanOptions(
        createPlayerSelfKanState()
      );

    expect(
      options.map(
        (option) => option.kind
      ).sort()
    ).toEqual([
      "addedKan",
      "closedKan"
    ]);
  });
});
