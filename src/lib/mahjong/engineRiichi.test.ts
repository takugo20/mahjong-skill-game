import {
  describe,
  expect,
  it
} from "vitest";
import {
  canPlayerRiichi,
  canPlayerTsumo,
  createInitialGameState,
  declarePlayerRiichi,
  declarePlayerTsumo,
  discardTile,
  getPlayerRiichiDiscardTileIds
} from "./engine";
import type {
  Discard,
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
    id: `engine-riichi-${serialNumber}`,
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

function createNonWinningHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [1, 2, 4, 5, 7, 8]
    ),
    ...createTiles(
      "pin",
      [1, 2, 4, 6, 7, 9]
    ),
    createTile("honor", 7)
  ];
}

function createNormalDiscard(): Discard {
  return {
    tile: createTile("honor", 1),
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };
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
    ippatsu: false,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: null
  };
}

function createRiichiState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );
  const playerHand = createRiichiHand();

  setPlayerHand(state, 0, playerHand);
  state.round.players[0].drawnTileId =
    playerHand[13].id;

  setPlayerHand(
    state,
    1,
    createNonWinningHand()
  );
  setPlayerHand(
    state,
    2,
    createNonWinningHand()
  );
  setPlayerHand(
    state,
    3,
    createNonWinningHand()
  );

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;
  state.round.riichiPool = 0;
  state.round.liveWall = [
    createTile("honor", 6),
    createTile("honor", 5),
    createTile("honor", 4),
    createTile("pin", 5),
    createTile("honor", 3),
    createTile("honor", 2),
    createTile("honor", 1),
    createTile("honor", 7)
  ];

  return state;
}

function getDeclarationTile(
  state: GameState
): Tile {
  const tile = state.round.players[0]
    .hand[12];

  if (!tile) {
    throw new Error(
      "立直宣言牌が見つかりません。"
    );
  }

  return tile;
}

describe("ゲーム本体の立直", () => {
  it("プレイヤーの打牌手番だけ立直可能牌を返す", () => {
    const state = createRiichiState();
    const playerHand =
      state.round.players[0].hand;

    expect(
      getPlayerRiichiDiscardTileIds(state)
    ).toEqual([
      playerHand[0].id,
      playerHand[3].id,
      playerHand[12].id,
      playerHand[13].id
    ]);
    expect(canPlayerRiichi(state)).toBe(
      true
    );

    state.round.phase = "drawing";

    expect(
      getPlayerRiichiDiscardTileIds(state)
    ).toEqual([]);
    expect(canPlayerRiichi(state)).toBe(
      false
    );
  });

    it("第1打まで副露と槓がなければダブル立直を成立させる", () => {
    const state = createRiichiState();
    const declarationTile =
      getDeclarationTile(state);

    const result = declarePlayerRiichi(
      state,
      declarationTile.id,
      () => 0.5
    );

    const player = result.round.players[0];

    expect(player.riichi).toBe(true);
    expect(player.doubleRiichi).toBe(
      true
    );
    expect(result.notice).toContain(
      "ダブル立直が成立しました。"
    );
  });

  it("他家の通常の第1打はダブル立直を妨げない", () => {
    const state = createRiichiState();
    const declarationTile =
      getDeclarationTile(state);

    for (const seat of [1, 2, 3] as const) {
      state.round.players[seat].discards = [
        createNormalDiscard()
      ];
    }

    state.round.turnNumber = 3;

    const result = declarePlayerRiichi(
      state,
      declarationTile.id,
      () => 0.5
    );

    expect(
      result.round.players[0].doubleRiichi
    ).toBe(true);
  });

  it("既打牌、副露、槓がある場合は通常立直にする", () => {
    const blockers: Array<
      (state: GameState) => void
    > = [
      (state) => {
        state.round.players[0].discards = [
          createNormalDiscard()
        ];
      },
      (state) => {
        state.round.players[1].melds = [
          {
            kind: "pon",
            tiles: createTiles(
              "honor",
              [2, 2, 2]
            ),
            calledFrom: 2
          }
        ];
      },
      (state) => {
        state.round.kanCount = 1;
      }
    ];

    for (const applyBlocker of blockers) {
      const state = createRiichiState();
      const declarationTile =
        getDeclarationTile(state);

      applyBlocker(state);

      const result = declarePlayerRiichi(
        state,
        declarationTile.id,
        () => 0.5
      );

      expect(
        result.round.players[0]
          .doubleRiichi
      ).toBe(false);
      expect(result.notice).not.toContain(
        "ダブル立直"
      );
    }
  });

  it("宣言牌がロンされなければ供託して立直を成立させる", () => {
    const state = createRiichiState();
    const declarationTile =
      getDeclarationTile(state);

    const result = declarePlayerRiichi(
      state,
      declarationTile.id,
      () => 0.5
    );

    const player = result.round.players[0];

    expect(player.score).toBe(24000);
    expect(result.round.riichiPool).toBe(
      1000
    );
    expect(player.riichi).toBe(true);
    expect(player.ippatsu).toBe(true);
    expect(player.discards[0]).toMatchObject({
      tile: {
        id: declarationTile.id
      },
      tsumogiri: false,
      riichiDeclaration: true
    });
    expect(result.round.currentSeat).toBe(0);
    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(result.notice).toContain(
      "立直が成立しました。"
    );
  });

  it("立直可能牌以外では宣言できない", () => {
    const state = createRiichiState();
    const invalidTile =
      state.round.players[0].hand[1];

    const result = declarePlayerRiichi(
      state,
      invalidTile.id,
      () => 0.5
    );

    expect(result.round.turnNumber).toBe(
      state.round.turnNumber
    );
    expect(result.round.players[0].score).toBe(
      25000
    );
    expect(result.round.riichiPool).toBe(0);
    expect(
      result.round.players[0].riichi
    ).toBe(false);
    expect(
      result.round.players[0].discards
    ).toHaveLength(0);
    expect(result.notice).toBe(
      "選択した牌では立直を宣言できません。"
    );
  });

  it("宣言牌がロンされた場合は供託せず立直も成立しない", () => {
    const state = createRiichiState();
    const declarationTile =
      getDeclarationTile(state);

    const cpuWinningHand =
      createRiichiHand().filter(
        (_, index) => index !== 13
      );

    setPlayerHand(
      state,
      1,
      cpuWinningHand
    );

    const result = declarePlayerRiichi(
      state,
      declarationTile.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.winResult?.winnerSeat
    ).toBe(1);
    expect(
      result.round.players[0].riichi
    ).toBe(false);
    expect(
      result.round.players[0].ippatsu
    ).toBe(false);
    expect(result.round.riichiPool).toBe(0);
    expect(
      result.round.players[0].discards[0]
        .riichiDeclaration
    ).toBe(true);

    const playerChange =
      result.round.winResult
        ?.pointChanges.find(
          (change) => change.seat === 0
        );

    expect(playerChange?.change).toBe(
      -(result.round.winResult
        ?.totalPoints ?? 0)
    );
  });

  it("立直後はツモ切りだけを認め次の打牌で一発を終了する", () => {
    const state = createRiichiState();
    const declarationTile =
      getDeclarationTile(state);

    const riichiState =
      declarePlayerRiichi(
        state,
        declarationTile.id,
        () => 0.5
      );

    const player =
      riichiState.round.players[0];
    const drawnTileId =
      player.drawnTileId;
    const handTile = player.hand.find(
      (tile) =>
        tile.id !== drawnTileId
    );

    if (!drawnTileId || !handTile) {
      throw new Error(
        "立直後の打牌対象が見つかりません。"
      );
    }

    const blockedState = discardTile(
      riichiState,
      handTile.id
    );

    expect(
      blockedState.round.turnNumber
    ).toBe(riichiState.round.turnNumber);
    expect(
      blockedState.round.players[0]
        .ippatsu
    ).toBe(true);
    expect(blockedState.notice).toBe(
      "立直後はツモ切り以外の牌を捨てられません。"
    );

    const discardedState = discardTile(
      riichiState,
      drawnTileId
    );

    expect(
      discardedState.round.turnNumber
    ).toBe(
      riichiState.round.turnNumber + 1
    );
    expect(
      discardedState.round.lastDiscard
        ?.discard.tsumogiri
    ).toBe(true);
    expect(
      discardedState.round.players[0]
        .ippatsu
    ).toBe(false);
  });

  it("一発期間のツモ和了に立直と一発を付ける", () => {
    const state = createRiichiState();

    state.round.players[0].discards = [
      createNormalDiscard()
    ];

    const declarationTile =
      getDeclarationTile(state);

    const riichiState =
      declarePlayerRiichi(
        state,
        declarationTile.id,
        () => 0.5
      );

    expect(
      canPlayerTsumo(riichiState)
    ).toBe(true);

    const result =
      declarePlayerTsumo(riichiState);
    const yakuNames =
      result.round.winResult?.yakuNames ??
      [];

    expect(yakuNames).toContain("立直");
    expect(yakuNames).toContain("一発");
    expect(yakuNames).toContain(
      "門前清自摸和"
    );
    expect(result.round.riichiPool).toBe(0);
  });
});
