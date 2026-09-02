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
  drawTile
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
  rank: number,
  red = false
): Tile {
  serialNumber += 1;

  return {
    id: `engine-akuukan-e23-${serialNumber}`,
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
  readonly seat?: SeatIndex;
  readonly discards?: Discard[];
  readonly liveWall: Tile[];
}

function prepareDrawState(
  input: PrepareDrawStateInput
): GameState {
  const seat = input.seat ?? 0;
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: input.enemyId ?? "enemy-12",
      equippedSkills: []
    }
  );

  return {
    ...state,
    round: {
      ...state.round,
      currentSeat: seat,
      phase: "drawing",
      liveWall: input.liveWall,
      lastDiscard: null,
      players: state.round.players.map(
        (player) =>
          player.seat === seat
            ? {
                ...player,
                discards: input.discards ?? [],
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
    (tile) => tile.id === player.drawnTileId
  );

  if (!drawnTile) {
    throw new Error(
      `座席${seat}のツモ牌が見つかりません。`
    );
  }

  return drawnTile;
}

describe("敵12 E-23のエンジン統合", () => {
  it("50％未満では直前の捨て牌と同じ牌種を通常山から取得する", () => {
    const previousDiscard = createDiscard(
      createTile("man", 3)
    );
    const firstPin = createTile("pin", 3);
    const matchingMan = createTile("man", 3);
    const laterSou = createTile("sou", 7);
    const state = prepareDrawState({
      discards: [previousDiscard],
      liveWall: [
        firstPin,
        matchingMan,
        laterSou
      ]
    });

    const result = drawTile(
      state,
      0,
      () => 0.499999
    );

    expect(getDrawnTile(result, 0)).toBe(
      matchingMan
    );
    expect(
      result.round.players[0]
        .drawnTileSource
    ).toBe("liveWall");
    expect(result.round.liveWall).toEqual([
      firstPin,
      laterSou
    ]);
    expect(
      result.round.players[0].discards
    ).toEqual([previousDiscard]);
  });

  it("50％以上では同じ牌種を除外して別牌種を取得する", () => {
    const matchingMan = createTile("man", 3);
    const differentPin = createTile("pin", 3);
    const laterMan = createTile("man", 3);
    const state = prepareDrawState({
      discards: [
        createDiscard(createTile("man", 3))
      ],
      liveWall: [
        matchingMan,
        differentPin,
        laterMan
      ]
    });

    const result = drawTile(
      state,
      0,
      () => 0.5
    );

    expect(getDrawnTile(result, 0)).toBe(
      differentPin
    );
    expect(result.round.liveWall).toEqual([
      matchingMan,
      laterMan
    ]);
  });

  it("全体の直前打牌ではなくツモる者自身の最新捨て牌を参照する", () => {
    const oldMan = createTile("man", 3);
    const latestSou = createTile("sou", 7);
    const state = prepareDrawState({
      discards: [
        createDiscard(createTile("man", 3)),
        createDiscard(createTile("sou", 7))
      ],
      liveWall: [oldMan, latestSou]
    });
    const otherPlayerDiscard = createDiscard(
      createTile("pin", 9)
    );

    state.round.lastDiscard = {
      seat: 3,
      discard: otherPlayerDiscard
    };

    const result = drawTile(
      state,
      0,
      () => 0
    );

    expect(getDrawnTile(result, 0)).toBe(
      latestSou
    );
    expect(result.round.liveWall).toEqual([
      oldMan
    ]);
  });

  it("赤牌と通常牌を同じ牌種として扱う", () => {
    const firstHonor = createTile("honor", 1);
    const normalFiveMan = createTile(
      "man",
      5
    );
    const state = prepareDrawState({
      discards: [
        createDiscard(
          createTile("man", 5, true)
        )
      ],
      liveWall: [
        firstHonor,
        normalFiveMan
      ]
    });

    const result = drawTile(
      state,
      0,
      () => 0
    );

    expect(getDrawnTile(result, 0)).toBe(
      normalFiveMan
    );
    expect(result.round.liveWall).toEqual([
      firstHonor
    ]);
  });

  it("能力者本人以外のCPUにもE-23を適用する", () => {
    const firstHonor = createTile("honor", 2);
    const matchingPin = createTile("pin", 4);
    const state = prepareDrawState({
      seat: 1,
      discards: [
        createDiscard(createTile("pin", 4))
      ],
      liveWall: [firstHonor, matchingPin]
    });

    const result = drawTile(
      state,
      1,
      () => 0
    );

    expect(getDrawnTile(result, 1)).toBe(
      matchingPin
    );
    expect(result.round.liveWall).toEqual([
      firstHonor
    ]);
  });

  it("能力者CPU本人にはE-23を適用しない", () => {
    const firstHonor = createTile("honor", 3);
    const matchingSou = createTile("sou", 6);
    const state = prepareDrawState({
      seat: 2,
      discards: [
        createDiscard(createTile("sou", 6))
      ],
      liveWall: [firstHonor, matchingSou]
    });

    const result = drawTile(
      state,
      2,
      () => 0
    );

    expect(getDrawnTile(result, 2)).toBe(
      firstHonor
    );
    expect(result.round.liveWall).toEqual([
      matchingSou
    ]);
  });

  it("本人の捨て牌がまだなければ先頭牌を取得し乱数を消費しない", () => {
    let randomCallCount = 0;
    const firstHonor = createTile("honor", 4);
    const laterMan = createTile("man", 1);
    const state = prepareDrawState({
      liveWall: [firstHonor, laterMan]
    });

    const result = drawTile(
      state,
      0,
      () => {
        randomCallCount += 1;
        return 0;
      }
    );

    expect(getDrawnTile(result, 0)).toBe(
      firstHonor
    );
    expect(result.round.liveWall).toEqual([
      laterMan
    ]);
    expect(randomCallCount).toBe(0);
  });

  it("同じ牌種が通常山になければ先頭牌を取得し乱数を消費しない", () => {
    let randomCallCount = 0;
    const firstPin = createTile("pin", 1);
    const laterSou = createTile("sou", 1);
    const state = prepareDrawState({
      discards: [
        createDiscard(createTile("man", 1))
      ],
      liveWall: [firstPin, laterSou]
    });

    const result = drawTile(
      state,
      0,
      () => {
        randomCallCount += 1;
        return 0;
      }
    );

    expect(getDrawnTile(result, 0)).toBe(
      firstPin
    );
    expect(result.round.liveWall).toEqual([
      laterSou
    ]);
    expect(randomCallCount).toBe(0);
  });

  it("同じ牌種しか通常山になければ先頭牌を取得し乱数を消費しない", () => {
    let randomCallCount = 0;
    const firstSou = createTile("sou", 7);
    const secondSou = createTile("sou", 7);
    const state = prepareDrawState({
      discards: [
        createDiscard(createTile("sou", 7))
      ],
      liveWall: [firstSou, secondSou]
    });

    const result = drawTile(
      state,
      0,
      () => {
        randomCallCount += 1;
        return 0.75;
      }
    );

    expect(getDrawnTile(result, 0)).toBe(
      firstSou
    );
    expect(result.round.liveWall).toEqual([
      secondSou
    ]);
    expect(randomCallCount).toBe(0);
  });

  it("E-23を持たない敵または能力無効時は通常ツモを変更しない", () => {
    let randomCallCount = 0;
    const previousDiscard = createDiscard(
      createTile("man", 8)
    );
    const firstHonor = createTile("honor", 5);
    const matchingMan = createTile("man", 8);
    const liveWall = [firstHonor, matchingMan];
    const otherEnemyState = prepareDrawState({
      enemyId: "enemy-10",
      discards: [previousDiscard],
      liveWall
    });
    const e23State = prepareDrawState({
      discards: [previousDiscard],
      liveWall
    });

    if (!e23State.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    const disabledState: GameState = {
      ...e23State,
      akuukan: disableAkuukanSource(
        e23State.akuukan,
        "enemy-ability:E-23"
      )
    };
    const random = () => {
      randomCallCount += 1;
      return 0;
    };
    const otherEnemyResult = drawTile(
      otherEnemyState,
      0,
      random
    );
    const disabledResult = drawTile(
      disabledState,
      0,
      random
    );

    expect(
      getDrawnTile(otherEnemyResult, 0)
    ).toBe(firstHonor);
    expect(
      getDrawnTile(disabledResult, 0)
    ).toBe(firstHonor);
    expect(randomCallCount).toBe(0);
  });
});
