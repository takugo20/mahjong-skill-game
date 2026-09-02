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
  GameState,
  Meld,
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
    id: `engine-akuukan-e22-${serialNumber}`,
    suit,
    rank,
    red
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

function createPon(
  suit: TileSuit,
  rank: number
): Meld {
  return {
    kind: "pon",
    tiles: createTiles(
      suit,
      [rank, rank, rank]
    )
  };
}

interface PrepareDrawStateInput {
  readonly enemyId?: EnemyId;
  readonly seat?: SeatIndex;
  readonly concealedTiles: Tile[];
  readonly liveWall: Tile[];
  readonly melds?: Meld[];
}

function prepareDrawState(
  input: PrepareDrawStateInput
): GameState {
  const seat = input.seat ?? 0;
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: input.enemyId ?? "enemy-11",
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
      players: state.round.players.map(
        (player) =>
          player.seat === seat
            ? {
                ...player,
                hand: input.concealedTiles,
                melds: input.melds ?? [],
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

describe("敵11 E-22のエンジン統合", () => {
  it("プレイヤーの通常ツモでは手牌にない最初の牌種を取得する", () => {
    const firstMan = createTile("man", 1);
    const firstPin = createTile("pin", 2);
    const newSou = createTile("sou", 9);
    const laterHonor = createTile("honor", 7);
    const state = prepareDrawState({
      concealedTiles: [
        createTile("man", 1),
        createTile("pin", 2)
      ],
      liveWall: [
        firstMan,
        firstPin,
        newSou,
        laterHonor
      ]
    });

    const result = drawTile(state, 0);

    expect(getDrawnTile(result, 0)).toBe(
      newSou
    );
    expect(
      result.round.players[0]
        .drawnTileSource
    ).toBe("liveWall");
    expect(result.round.liveWall).toEqual([
      firstMan,
      firstPin,
      laterHonor
    ]);
  });

  it("能力者CPU本人は手牌と同じ牌種でも山の先頭から通常ツモする", () => {
    const firstMan = createTile("man", 1);
    const laterSou = createTile("sou", 9);
    const state = prepareDrawState({
      seat: 2,
      concealedTiles: [
        createTile("man", 1)
      ],
      liveWall: [firstMan, laterSou]
    });

    const result = drawTile(state, 2);

    expect(getDrawnTile(result, 2)).toBe(
      firstMan
    );
    expect(result.round.liveWall).toEqual([
      laterSou
    ]);
  });

  it("能力者本人以外のCPUにも同種牌ツモ禁止を適用する", () => {
    const firstPin = createTile("pin", 4);
    const newHonor = createTile("honor", 5);
    const state = prepareDrawState({
      seat: 1,
      concealedTiles: [
        createTile("pin", 4)
      ],
      liveWall: [firstPin, newHonor]
    });

    const result = drawTile(state, 1);

    expect(getDrawnTile(result, 1)).toBe(
      newHonor
    );
    expect(result.round.liveWall).toEqual([
      firstPin
    ]);
  });

  it("手牌にない牌種が山に残っていなければ先頭牌へ戻る", () => {
    const firstMan = createTile("man", 1);
    const secondPin = createTile("pin", 2);
    const thirdMan = createTile("man", 1);
    const state = prepareDrawState({
      concealedTiles: [
        createTile("man", 1),
        createTile("pin", 2)
      ],
      liveWall: [
        firstMan,
        secondPin,
        thirdMan
      ]
    });

    const result = drawTile(state, 0);

    expect(getDrawnTile(result, 0)).toBe(
      firstMan
    );
    expect(result.round.liveWall).toEqual([
      secondPin,
      thirdMan
    ]);
  });

  it("赤牌と通常牌を同じ牌種として通常ツモ候補から除外する", () => {
    const normalFiveMan = createTile(
      "man",
      5
    );
    const newThreeSou = createTile("sou", 3);
    const state = prepareDrawState({
      concealedTiles: [
        createTile("man", 5, true)
      ],
      liveWall: [
        normalFiveMan,
        newThreeSou
      ]
    });

    const result = drawTile(state, 0);

    expect(getDrawnTile(result, 0)).toBe(
      newThreeSou
    );
    expect(result.round.liveWall).toEqual([
      normalFiveMan
    ]);
  });

  it("副露にだけ存在する牌種は通常ツモ候補から除外しない", () => {
    const firstMan = createTile("man", 1);
    const laterPin = createTile("pin", 2);
    const state = prepareDrawState({
      concealedTiles: [
        createTile("pin", 2)
      ],
      melds: [createPon("man", 1)],
      liveWall: [firstMan, laterPin]
    });

    const result = drawTile(state, 0);

    expect(getDrawnTile(result, 0)).toBe(
      firstMan
    );
    expect(result.round.liveWall).toEqual([
      laterPin
    ]);
  });

  it("E-22を無効にすると山の先頭から通常ツモする", () => {
    const firstMan = createTile("man", 1);
    const laterSou = createTile("sou", 9);
    const state = prepareDrawState({
      concealedTiles: [
        createTile("man", 1)
      ],
      liveWall: [firstMan, laterSou]
    });

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    const disabledState: GameState = {
      ...state,
      akuukan: disableAkuukanSource(
        state.akuukan,
        "enemy-ability:E-22"
      )
    };
    const result = drawTile(disabledState, 0);

    expect(getDrawnTile(result, 0)).toBe(
      firstMan
    );
    expect(result.round.liveWall).toEqual([
      laterSou
    ]);
  });

  it("E-22を持たない敵との対局では通常ツモを変更しない", () => {
    const firstMan = createTile("man", 1);
    const laterSou = createTile("sou", 9);
    const state = prepareDrawState({
      enemyId: "enemy-10",
      concealedTiles: [
        createTile("man", 1)
      ],
      liveWall: [firstMan, laterSou]
    });

    const result = drawTile(state, 0);

    expect(getDrawnTile(result, 0)).toBe(
      firstMan
    );
    expect(result.round.liveWall).toEqual([
      laterSou
    ]);
  });
});
