import {
  describe,
  expect,
  it
} from "vitest";
import {
  disableAkuukanSource
} from "../akuukan/state";
import type {
  EnemyId,
  SkillLevel
} from "../akuukan/types";
import {
  createInitialGameState,
  declarePlayerRon,
  declarePlayerTsumo,
  playPlayerDiscard,
  skipPlayerRon
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
    id: `engine-player-skill-1-10-${serialNumber}`,
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
    ...createTiles("sou", [6, 7, 8])
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
  level: SkillLevel | null,
  enemyId: EnemyId = "enemy-1"
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId,
      equippedSkills: level === null
        ? []
        : [{
            id: "1-10",
            level
          }]
    }
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
  state.round.nagashiManganResult = null;
  state.round.abortiveDrawResult = null;
  state.round.pendingKan = null;

  return state;
}

function preparePlayerRonState(
  level: SkillLevel | null,
  enemyId: EnemyId = "enemy-1"
): GameState {
  const state = createBaseState(
    level,
    enemyId
  );
  const winningTile = createTile(
    "man",
    1
  );
  const discard = createDiscard(
    winningTile
  );

  setPlayerHand(
    state,
    0,
    createPinfuWaitHand()
  );

  for (
    const seat of [1, 2, 3] as const
  ) {
    setPlayerHand(
      state,
      seat,
      createNonWinningHand()
    );
  }

  state.round.players[1] = {
    ...state.round.players[1],
    discards: [discard]
  };
  state.round.currentSeat = 2;
  state.round.phase = "reaction";
  state.round.lastDiscard = {
    seat: 1,
    discard
  };

  return state;
}

function preparePlayerTsumoState(
  level: SkillLevel | null
): GameState {
  const state = createBaseState(level);
  const winningTile = createTile(
    "man",
    1
  );

  setPlayerHand(
    state,
    0,
    [
      ...createPinfuWaitHand(),
      winningTile
    ]
  );
  state.round.players[0] = {
    ...state.round.players[0],
    drawnTileId: winningTile.id,
    drawnTileSource: "liveWall"
  };
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.turnNumber = 16;
  state.round.lastDiscard = null;

  return state;
}

function prepareSelectedEnemyRonState(
  level: SkillLevel | null,
  enemyId: EnemyId
): GameState {
  const state = createBaseState(
    level,
    enemyId
  );
  const winningTile = createTile(
    "man",
    1
  );
  const discard = createDiscard(
    winningTile
  );

  for (
    const seat of [0, 1, 3] as const
  ) {
    setPlayerHand(
      state,
      seat,
      createNonWinningHand()
    );
  }

  setPlayerHand(
    state,
    2,
    createPinfuWaitHand()
  );
  state.round.players[0] = {
    ...state.round.players[0],
    discards: [discard]
  };
  state.round.currentSeat = 1;
  state.round.phase = "reaction";
  state.round.lastDiscard = {
    seat: 0,
    discard
  };

  return state;
}

function preparePlayerNagashiState(
  level: SkillLevel | null
): GameState {
  const state = createBaseState(level);
  const finalDiscard = createTile(
    "honor",
    7
  );

  setPlayerHand(state, 0, [finalDiscard]);
  setPlayerHand(state, 1, []);
  setPlayerHand(state, 2, []);
  setPlayerHand(state, 3, []);

  state.round.players[0] = {
    ...state.round.players[0],
    discards: [
      createDiscard(createTile("pin", 9))
    ],
    drawnTileId: finalDiscard.id,
    drawnTileSource: "liveWall"
  };

  for (
    const seat of [1, 2, 3] as const
  ) {
    state.round.players[seat] = {
      ...state.round.players[seat],
      discards: [
        createDiscard(
          createTile("man", 5)
        )
      ]
    };
  }

  state.round.liveWall = [];
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.honba = 1;
  state.round.riichiPool = 2000;

  return state;
}

function getPointChange(
  state: GameState,
  seat: SeatIndex
): number {
  const change =
    state.round.winResult?.pointChanges.find(
      (entry) => entry.seat === seat
    );

  if (!change) {
    throw new Error(
      `座席${seat}の点数変動が見つかりません。`
    );
  }

  return change.change;
}

function roundUpToHundred(
  points: number
): number {
  return Math.ceil(points / 100) * 100;
}

describe("プレイヤースキル1-10のエンジン統合", () => {
  it("プレイヤーのロン受取額へ本場後に倍率を適用し供託点は除外する", () => {
    const normalState =
      preparePlayerRonState(null);
    const skillState =
      preparePlayerRonState(5);
    normalState.round.honba = 2;
    skillState.round.honba = 2;
    normalState.round.riichiPool = 3000;
    skillState.round.riichiPool = 3000;

    const normal = declarePlayerRon(
      normalState
    );
    const skill = declarePlayerRon(
      skillState
    );
    const normalPayment =
      -getPointChange(normal, 1);
    const expectedPayment =
      roundUpToHundred(
        normalPayment * 1.5
      );

    expect(
      -getPointChange(skill, 1)
    ).toBe(expectedPayment);
    expect(getPointChange(skill, 0)).toBe(
      expectedPayment + 3000
    );
  });

  it("プレイヤーのツモ和了では各支払者へ個別に倍率を適用する", () => {
    const normal = declarePlayerTsumo(
      preparePlayerTsumoState(null)
    );
    const skill = declarePlayerTsumo(
      preparePlayerTsumoState(5)
    );

    for (
      const seat of [1, 2, 3] as const
    ) {
      expect(
        -getPointChange(skill, seat)
      ).toBe(
        roundUpToHundred(
          -getPointChange(normal, seat) *
            1.5
        )
      );
    }
  });

  it("プレイヤーの放銃時はプレイヤーの支払額を増加させる", () => {
    const normal = skipPlayerRon(
      prepareSelectedEnemyRonState(
        null,
        "enemy-1"
      )
    );
    const skill = skipPlayerRon(
      prepareSelectedEnemyRonState(
        5,
        "enemy-1"
      )
    );

    expect(
      -getPointChange(skill, 0)
    ).toBe(
      roundUpToHundred(
        -getPointChange(normal, 0) * 1.5
      )
    );
  });

  it("E-20と重なる支払いでは2倍と1.5倍を乗算する", () => {
    const normal = skipPlayerRon(
      prepareSelectedEnemyRonState(
        null,
        "enemy-1"
      )
    );
    const combined = skipPlayerRon(
      prepareSelectedEnemyRonState(
        5,
        "enemy-10"
      )
    );

    expect(
      -getPointChange(combined, 0)
    ).toBe(
      roundUpToHundred(
        -getPointChange(normal, 0) * 3
      )
    );
  });

  it("E-18による無効化中は倍率を適用しない", () => {
    const normal = declarePlayerRon(
      preparePlayerRonState(null)
    );
    const disabledState =
      preparePlayerRonState(
        5,
        "enemy-6"
      );

    if (!disabledState.akuukan) {
      throw new Error(
        "亜空間対局状態がありません。"
      );
    }

    disabledState.akuukan =
      disableAkuukanSource(
        disabledState.akuukan,
        "player-skill:1-10"
      );

    const disabled = declarePlayerRon(
      disabledState
    );

    expect(getPointChange(disabled, 0)).toBe(
      getPointChange(normal, 0)
    );
  });

  it("プレイヤーの流し満貫へ本場後に倍率を適用し供託点は除外する", () => {
    const normalState =
      preparePlayerNagashiState(null);
    const skillState =
      preparePlayerNagashiState(5);
    const normal = playPlayerDiscard(
      normalState,
      normalState.round.players[0]
        .hand[0].id,
      () => 0.5
    );
    const skill = playPlayerDiscard(
      skillState,
      skillState.round.players[0]
        .hand[0].id,
      () => 0.5
    );
    const normalChanges = new Map(
      normal.round.nagashiManganResult
        ?.pointChanges.map(
          ({ seat, change }) => [
            seat,
            change
          ]
        ) ?? []
    );
    const skillChanges = new Map(
      skill.round.nagashiManganResult
        ?.pointChanges.map(
          ({ seat, change }) => [
            seat,
            change
          ]
        ) ?? []
    );

    for (
      const seat of [1, 2, 3] as const
    ) {
      expect(
        -(skillChanges.get(seat) ?? 0)
      ).toBe(
        roundUpToHundred(
          -(normalChanges.get(seat) ?? 0) *
            1.5
        )
      );
    }

    const expectedPlayerChange =
      [1, 2, 3].reduce(
        (total, seat) =>
          total -
          (skillChanges.get(
            seat as SeatIndex
          ) ?? 0),
        2000
      );

    expect(skillChanges.get(0)).toBe(
      expectedPlayerChange
    );
  });
});
