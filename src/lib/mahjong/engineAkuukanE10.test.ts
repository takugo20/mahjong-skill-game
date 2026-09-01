import {
  describe,
  expect,
  it
} from "vitest";
import {
  disableAkuukanSource
} from "../akuukan/state";
import type {
  EnemyId
} from "../akuukan/types";
import {
  createInitialGameState,
  createPlayerDiscardProgression
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
    id: `engine-akuukan-e10-${serialNumber}`,
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

function setEmptyCpu(
  state: GameState,
  seat: 1 | 2 | 3
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

interface E10RiichiState {
  readonly state: GameState;
  readonly playerDiscard: Tile;
  readonly informationBasedDiscard: Tile;
  readonly normalDiscard: Tile;
}

function createE10RiichiState(
  enemyId: EnemyId,
  targetSeat: 1 | 2
): E10RiichiState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId,
      equippedSkills: []
    }
  );
  const playerDiscard = createTile(
    "honor",
    7
  );
  const visibleWaitTiles = [
    ...createTiles("man", [2, 2]),
    ...createTiles("man", [5, 5, 5])
  ];
  const riichiHand = createRiichiHand();
  const informationBasedDiscard =
    riichiHand[12];
  const normalDiscard = riichiHand[13];

  if (
    !informationBasedDiscard ||
    !normalDiscard
  ) {
    throw new Error(
      "E-10テスト用手牌を作成できません。"
    );
  }

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      playerDiscard,
      ...visibleWaitTiles
    ],
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };

  for (const seat of [1, 2, 3] as const) {
    setEmptyCpu(state, seat);
  }

  state.round.players[targetSeat] = {
    ...state.round.players[targetSeat],
    hand: riichiHand.slice(0, -1),
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: null,
    drawnTileSource: null
  };
  state.round.deadWall[4] = createTile(
    "honor",
    1
  );
  state.round.doraIndicatorCount = 1;
  state.round.liveWall = [
    ...(targetSeat === 2
      ? [createTile("honor", 6)]
      : []),
    normalDiscard,
    ...createTiles(
      "honor",
      [2, 3, 4, 5, 6, 7]
    )
  ];
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;

  return {
    state,
    playerDiscard,
    informationBasedDiscard,
    normalDiscard
  };
}

function getRiichiDiscard(
  scenario: E10RiichiState,
  targetSeat: SeatIndex
): Tile {
  const progression =
    createPlayerDiscardProgression(
      scenario.state,
      scenario.playerDiscard.id,
      () => 0.5
    );
  const actionStep =
    progression.cpuSteps.find(
      (step) =>
        step.phase === "action" &&
        step.seat === targetSeat
    );
  const targetPlayer =
    actionStep?.state.round.players[
      targetSeat
    ];
  const riichiDiscard =
    targetPlayer?.discards.find(
      (discard) =>
        discard.riichiDeclaration
    )?.tile;

  if (!riichiDiscard) {
    throw new Error(
      "対象CPUの立直打牌を取得できません。"
    );
  }

  return riichiDiscard;
}

describe("敵6 E-10のエンジン統合", () => {
  it("敵6本人は他家の手牌を数えて残り枚数の多い待ちを選ぶ", () => {
    const scenario = createE10RiichiState(
      "enemy-6",
      2
    );

    expect(
      getRiichiDiscard(scenario, 2).id
    ).toBe(
      scenario.informationBasedDiscard.id
    );
  });

  it("敵6戦の通常CPUには他家の手牌を見せない", () => {
    const scenario = createE10RiichiState(
      "enemy-6",
      1
    );

    expect(
      getRiichiDiscard(scenario, 1).id
    ).toBe(scenario.normalDiscard.id);
  });

  it("E-10が無効なら敵6本人も非公開手牌を数えない", () => {
    const scenario = createE10RiichiState(
      "enemy-6",
      2
    );

    if (!scenario.state.akuukan) {
      throw new Error(
        "亜空間状態がありません。"
      );
    }

    scenario.state.akuukan =
      disableAkuukanSource(
        scenario.state.akuukan,
        "enemy-ability:E-10"
      );

    expect(
      getRiichiDiscard(scenario, 2).id
    ).toBe(scenario.normalDiscard.id);
  });

  it("E-10を持たない敵は非公開手牌を数えない", () => {
    const scenario = createE10RiichiState(
      "enemy-2",
      2
    );

    expect(
      getRiichiDiscard(scenario, 2).id
    ).toBe(scenario.normalDiscard.id);
  });
});
