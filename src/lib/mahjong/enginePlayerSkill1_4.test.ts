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
  drawTile
} from "./engine";
import type {
  Discard,
  GameState,
  SeatIndex,
  Tile,
  TileSuit
} from "./types";

const DORA_INDICATOR_INDEXES = [
  4,
  6,
  8,
  10,
  12
];

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number,
  red = false
): Tile {
  serialNumber += 1;

  return {
    id: `engine-player-skill-1-4-${serialNumber}`,
    suit,
    rank,
    red
  };
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

interface PrepareDrawStateInput {
  readonly enemyId?: EnemyId;
  readonly level?: SkillLevel;
  readonly seat?: SeatIndex;
  readonly hand?: Tile[];
  readonly discards?: Discard[];
  readonly liveWall: Tile[];
  readonly doraIndicators: Tile[];
}

function prepareDrawState(
  input: PrepareDrawStateInput
): GameState {
  const seat = input.seat ?? 0;
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: input.enemyId ?? "enemy-1",
      equippedSkills: [{
        id: "1-4",
        level: input.level ?? 1
      }]
    }
  );
  const deadWall = Array.from(
    { length: 14 },
    () => createTile("honor", 7)
  );

  input.doraIndicators.forEach(
    (indicator, index) => {
      const deadWallIndex =
        DORA_INDICATOR_INDEXES[index];

      if (deadWallIndex !== undefined) {
        deadWall[deadWallIndex] =
          indicator;
      }
    }
  );

  return {
    ...state,
    round: {
      ...state.round,
      currentSeat: seat,
      phase: "drawing",
      liveWall: input.liveWall,
      deadWall,
      doraIndicatorCount:
        input.doraIndicators.length,
      lastDiscard: null,
      players: state.round.players.map(
        (player) =>
          player.seat === seat
            ? {
                ...player,
                hand: input.hand ?? [],
                melds: [],
                discards:
                  input.discards ?? [],
                drawnTileId: null,
                drawnTileSource: null
              }
            : player
      )
    }
  };
}

function getDrawnTile(
  state: GameState,
  seat: SeatIndex
): Tile {
  const player = state.round.players[seat];
  const drawnTile = player.hand.find(
    (tile) =>
      tile.id === player.drawnTileId
  );

  if (!drawnTile) {
    throw new Error(
      `座席${seat}のツモ牌が見つかりません。`
    );
  }

  return drawnTile;
}

function createSequenceRandom(
  values: readonly number[]
): {
  readonly random: () => number;
  readonly getCallCount: () => number;
} {
  let callCount = 0;

  return {
    random: () => {
      const value =
        values[callCount] ?? 0;
      callCount += 1;
      return value;
    },
    getCallCount: () => callCount
  };
}

describe("プレイヤースキル1-4のエンジン統合", () => {
  it("E-1で表示牌が見えなくても表ドラへ1.1倍の重量を適用する", () => {
    const firstTile = createTile(
      "pin",
      1
    );
    const doraTile = createTile(
      "man",
      4
    );
    const state = prepareDrawState({
      liveWall: [
        firstTile,
        doraTile,
        createTile("pin", 2)
      ],
      doraIndicators: [
        createTile("man", 3)
      ]
    });
    const result = drawTile(
      state,
      0,
      () => 0.33
    );

    expect(getDrawnTile(result, 0)).toBe(
      doraTile
    );
    expect(result.round.liveWall).toEqual([
      firstTile,
      state.round.liveWall[2]
    ]);
  });

  it("追加済みの表ドラ表示牌も補正へ反映する", () => {
    const firstTile = createTile(
      "pin",
      1
    );
    const addedDoraTile = createTile(
      "sou",
      4
    );
    const state = prepareDrawState({
      liveWall: [
        firstTile,
        addedDoraTile
      ],
      doraIndicators: [
        createTile("honor", 1),
        createTile("sou", 3)
      ]
    });
    const result = drawTile(
      state,
      0,
      () => 1 / 2.1
    );

    expect(getDrawnTile(result, 0)).toBe(
      addedDoraTile
    );
    expect(result.round.liveWall).toEqual([
      firstTile
    ]);
  });

  it("E-22の候補除外後に残った牌だけで重量抽選する", () => {
    const forbiddenDora = createTile(
      "man",
      1
    );
    const allowedNormal = createTile(
      "pin",
      1
    );
    const allowedDora = createTile(
      "sou",
      4
    );
    const state = prepareDrawState({
      enemyId: "enemy-11",
      level: 5,
      hand: [createTile("man", 1)],
      liveWall: [
        forbiddenDora,
        allowedNormal,
        allowedDora
      ],
      doraIndicators: [
        createTile("man", 9),
        createTile("sou", 3)
      ]
    });
    const result = drawTile(
      state,
      0,
      () => 0.34
    );

    expect(getDrawnTile(result, 0)).toBe(
      allowedDora
    );
    expect(result.round.liveWall).toEqual([
      forbiddenDora,
      allowedNormal
    ]);
  });

  it("E-23の牌種決定後に残った牌へ重量抽選を適用する", () => {
    const matchingDora = createTile(
      "man",
      3
    );
    const differentNormal = createTile(
      "pin",
      1
    );
    const differentDora = createTile(
      "sou",
      4
    );
    const state = prepareDrawState({
      enemyId: "enemy-12",
      level: 5,
      discards: [
        createDiscard(
          createTile("man", 3)
        )
      ],
      liveWall: [
        matchingDora,
        differentNormal,
        differentDora
      ],
      doraIndicators: [
        createTile("man", 2),
        createTile("sou", 3)
      ]
    });
    const random = createSequenceRandom([
      0.5,
      0.34
    ]);
    const result = drawTile(
      state,
      0,
      random.random
    );

    expect(getDrawnTile(result, 0)).toBe(
      differentDora
    );
    expect(result.round.liveWall).toEqual([
      matchingDora,
      differentNormal
    ]);
    expect(random.getCallCount()).toBe(2);
  });

  it("CPUの通常ツモには1-4を適用しない", () => {
    const firstTile = createTile(
      "pin",
      1
    );
    const doraTile = createTile(
      "man",
      4
    );
    const state = prepareDrawState({
      seat: 1,
      liveWall: [firstTile, doraTile],
      doraIndicators: [
        createTile("man", 3)
      ]
    });
    const random = createSequenceRandom([
      0.999
    ]);
    const result = drawTile(
      state,
      1,
      random.random
    );

    expect(getDrawnTile(result, 1)).toBe(
      firstTile
    );
    expect(random.getCallCount()).toBe(0);
  });

  it("敵6のE-18で無効化されていれば補正しない", () => {
    const firstTile = createTile(
      "pin",
      1
    );
    const doraTile = createTile(
      "man",
      4
    );
    const state = prepareDrawState({
      enemyId: "enemy-6",
      liveWall: [firstTile, doraTile],
      doraIndicators: [
        createTile("man", 3)
      ]
    });
    const random = createSequenceRandom([
      0.999
    ]);
    const result = drawTile(
      state,
      0,
      random.random
    );

    expect(getDrawnTile(result, 0)).toBe(
      firstTile
    );
    expect(random.getCallCount()).toBe(0);
  });
});
