import {
  countDistinctYaochuTypes,
  getAbortiveDrawLabel,
  getFourKansDrawResult,
  getFourRiichiDrawResult,
  getFourWindsDrawResult,
  getNineTerminalsDrawResult
} from "./abortiveDraw";
import {
  createInitialGameState
} from "./engine";
import type {
  Discard,
  GameState,
  Meld,
  SeatIndex,
  Tile,
  TileSuit
} from "./types";
import {
  describe,
  expect,
  it
} from "vitest";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number,
  red = false
): Tile {
  serialNumber += 1;

  return {
    id: `abortive-draw-${serialNumber}`,
    suit,
    rank,
    red
  };
}

function createTiles(
  suit: TileSuit,
  rank: number,
  count: number
): Tile[] {
  return Array.from(
    { length: count },
    () => createTile(suit, rank)
  );
}

function createState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );

  state.round.phase = "discarding";
  state.round.currentSeat = 0;
  state.round.kanCount = 0;
  state.round.players =
    state.round.players.map(
      (player) => ({
        ...player,
        melds: [],
        discards: [],
        riichi: false,
        doubleRiichi: false,
        ippatsu: false,
        drawnTileId: null,
        drawnTileSource: null
      })
    );

  return state;
}

const YAOCHU_TILE_TYPES = [
  ["man", 1],
  ["man", 9],
  ["pin", 1],
  ["pin", 9],
  ["sou", 1],
  ["sou", 9],
  ["honor", 1],
  ["honor", 2],
  ["honor", 3],
  ["honor", 4],
  ["honor", 5],
  ["honor", 6],
  ["honor", 7]
] as const;

function createFirstDrawHand(
  distinctYaochuCount: number
): Tile[] {
  const selectedTypes =
    YAOCHU_TILE_TYPES.slice(
      0,
      distinctYaochuCount
    );
  const hand = selectedTypes.map(
    ([suit, rank]) =>
      createTile(suit, rank)
  );

  let fillerIndex = 0;

  while (
    hand.length < 14 &&
    selectedTypes.length > 0
  ) {
    const [suit, rank] =
      selectedTypes[
        fillerIndex %
          selectedTypes.length
      ];

    hand.push(createTile(suit, rank));
    fillerIndex += 1;
  }

  return hand;
}

function setFirstDraw(
  state: GameState,
  seat: SeatIndex,
  distinctYaochuCount: number
): void {
  const hand = createFirstDrawHand(
    distinctYaochuCount
  );
  const drawnTile = hand[hand.length - 1];

  state.round.currentSeat = seat;
  state.round.phase = "discarding";
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand,
    melds: [],
    discards: [],
    drawnTileId: drawnTile.id,
    drawnTileSource: "liveWall"
  };
}

function createDiscard(
  rank: number,
  called = false
): Discard {
  return {
    tile: createTile("honor", rank),
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called
  };
}

function setFirstWindDiscards(
  state: GameState,
  ranks: readonly [
    number,
    number,
    number,
    number
  ]
): void {
  state.round.players =
    state.round.players.map(
      (player) => ({
        ...player,
        melds: [],
        discards: [
          createDiscard(
            ranks[player.seat]
          )
        ]
      })
    );
}

function createKanMeld(
  rank: number
): Meld {
  return {
    kind: "closedKan",
    tiles: createTiles(
      "honor",
      rank,
      4
    )
  };
}

describe("九種九牌の判定", () => {
  it("赤牌を除外し同一の么九牌を重複させず種類を数える", () => {
    const tiles = [
      createTile("man", 1),
      createTile("man", 1),
      createTile("man", 9),
      createTile("honor", 1),
      createTile("honor", 7),
      createTile("pin", 5, true)
    ];

    expect(
      countDistinctYaochuTypes(tiles)
    ).toBe(4);
  });

  it("第1ツモ後に異なる么九牌が9種類あれば宣言できる", () => {
    const state = createState();

    setFirstDraw(state, 0, 9);

    expect(
      getNineTerminalsDrawResult(
        state.round,
        0
      )
    ).toEqual({
      reason: "nineTerminals",
      declarerSeat: 0,
      distinctYaochuCount: 9
    });
  });

  it("8種類以下では宣言できない", () => {
    const state = createState();

    setFirstDraw(state, 0, 8);

    expect(
      getNineTerminalsDrawResult(
        state.round,
        0
      )
    ).toBeNull();
  });

  it("自分が第1打を終えた後は宣言できない", () => {
    const state = createState();

    setFirstDraw(state, 0, 9);
    state.round.players[0].discards = [
      createDiscard(1)
    ];

    expect(
      getNineTerminalsDrawResult(
        state.round,
        0
      )
    ).toBeNull();
  });

  it("副露または槓の成立後は宣言できない", () => {
    const calledState = createState();

    setFirstDraw(calledState, 0, 9);
    calledState.round.players[1].melds = [{
      kind: "pon",
      tiles: createTiles(
        "honor",
        5,
        3
      ),
      calledFrom: 2
    }];

    const kanState = createState();

    setFirstDraw(kanState, 0, 9);
    kanState.round.kanCount = 1;

    expect(
      getNineTerminalsDrawResult(
        calledState.round,
        0
      )
    ).toBeNull();
    expect(
      getNineTerminalsDrawResult(
        kanState.round,
        0
      )
    ).toBeNull();
  });

  it("他家の通常の第1打後でも子は宣言できる", () => {
    const state = createState();

    state.round.players[0].discards = [
      createDiscard(1)
    ];
    state.round.players[1].discards = [
      createDiscard(2)
    ];
    setFirstDraw(state, 2, 9);

    expect(
      getNineTerminalsDrawResult(
        state.round,
        2
      )
    ).toMatchObject({
      reason: "nineTerminals",
      declarerSeat: 2
    });
  });

  it("嶺上牌や自分以外の手番では宣言できない", () => {
    const rinshanState = createState();

    setFirstDraw(rinshanState, 0, 9);
    rinshanState.round.players[0]
      .drawnTileSource = "rinshan";

    const otherTurnState = createState();

    setFirstDraw(otherTurnState, 0, 9);
    otherTurnState.round.currentSeat = 1;

    expect(
      getNineTerminalsDrawResult(
        rinshanState.round,
        0
      )
    ).toBeNull();
    expect(
      getNineTerminalsDrawResult(
        otherTurnState.round,
        0
      )
    ).toBeNull();
  });
});

describe("四風連打の判定", () => {
  it("4人の第1打が同じ風牌なら成立する", () => {
    const state = createState();

    setFirstWindDiscards(
      state,
      [1, 1, 1, 1]
    );

    expect(
      getFourWindsDrawResult(
        state.round
      )
    ).toEqual({
      reason: "fourWinds",
      wind: "east"
    });
  });

  it("異なる風牌が混ざっていれば成立しない", () => {
    const state = createState();

    setFirstWindDiscards(
      state,
      [1, 1, 1, 2]
    );

    expect(
      getFourWindsDrawResult(
        state.round
      )
    ).toBeNull();
  });

  it("同じ三元牌4枚では成立しない", () => {
    const state = createState();

    setFirstWindDiscards(
      state,
      [5, 5, 5, 5]
    );

    expect(
      getFourWindsDrawResult(
        state.round
      )
    ).toBeNull();
  });

  it("誰かが第2打を終えていれば成立しない", () => {
    const state = createState();

    setFirstWindDiscards(
      state,
      [1, 1, 1, 1]
    );
    state.round.players[0].discards.push(
      createDiscard(1)
    );

    expect(
      getFourWindsDrawResult(
        state.round
      )
    ).toBeNull();
  });

  it("副露または槓が成立していれば対象外にする", () => {
    const calledState = createState();

    setFirstWindDiscards(
      calledState,
      [1, 1, 1, 1]
    );
    calledState.round.players[1].melds = [{
      kind: "pon",
      tiles: createTiles(
        "honor",
        1,
        3
      ),
      calledFrom: 0
    }];

    const kanState = createState();

    setFirstWindDiscards(
      kanState,
      [1, 1, 1, 1]
    );
    kanState.round.kanCount = 1;

    expect(
      getFourWindsDrawResult(
        calledState.round
      )
    ).toBeNull();
    expect(
      getFourWindsDrawResult(
        kanState.round
      )
    ).toBeNull();
  });
});

describe("四家立直の判定", () => {
  it("4人全員の立直成立後に途中流局とする", () => {
    const state = createState();

    state.round.players.forEach(
      (player) => {
        player.riichi = true;
      }
    );

    expect(
      getFourRiichiDrawResult(
        state.round
      )
    ).toEqual({
      reason: "fourRiichi",
      riichiSeats: [0, 1, 2, 3]
    });
  });

  it("1人でも立直未成立なら流局にしない", () => {
    const state = createState();

    state.round.players.forEach(
      (player) => {
        player.riichi = true;
      }
    );
    state.round.players[3].riichi = false;

    expect(
      getFourRiichiDrawResult(
        state.round
      )
    ).toBeNull();
  });
});

describe("四槓散了の判定", () => {
  it("複数人による4回の槓なら成立する", () => {
    const state = createState();

    state.round.kanCount = 4;
    state.round.players[0].melds = [
      createKanMeld(1),
      createKanMeld(2)
    ];
    state.round.players[1].melds = [
      createKanMeld(3),
      createKanMeld(4)
    ];

    expect(
      getFourKansDrawResult(
        state.round
      )
    ).toEqual({
      reason: "fourKans",
      kanCountsBySeat: [2, 2, 0, 0]
    });
  });

  it("4回すべて同一人物の槓なら続行する", () => {
    const state = createState();

    state.round.kanCount = 4;
    state.round.players[0].melds = [
      createKanMeld(1),
      createKanMeld(2),
      createKanMeld(3),
      createKanMeld(4)
    ];

    expect(
      getFourKansDrawResult(
        state.round
      )
    ).toBeNull();
  });

  it("槓回数と槓面子の合計が4でなければ成立しない", () => {
    const counterState = createState();

    counterState.round.kanCount = 3;
    counterState.round.players[0].melds = [
      createKanMeld(1),
      createKanMeld(2)
    ];
    counterState.round.players[1].melds = [
      createKanMeld(3),
      createKanMeld(4)
    ];

    const meldState = createState();

    meldState.round.kanCount = 4;
    meldState.round.players[0].melds = [
      createKanMeld(1),
      createKanMeld(2)
    ];
    meldState.round.players[1].melds = [
      createKanMeld(3)
    ];

    expect(
      getFourKansDrawResult(
        counterState.round
      )
    ).toBeNull();
    expect(
      getFourKansDrawResult(
        meldState.round
      )
    ).toBeNull();
  });
});

describe("途中流局の表示名", () => {
  it("すべての途中流局理由を日本語へ変換する", () => {
    expect([
      getAbortiveDrawLabel(
        "nineTerminals"
      ),
      getAbortiveDrawLabel(
        "fourWinds"
      ),
      getAbortiveDrawLabel(
        "fourRiichi"
      ),
      getAbortiveDrawLabel(
        "fourKans"
      ),
      getAbortiveDrawLabel(
        "tripleRon"
      )
    ]).toEqual([
      "九種九牌",
      "四風連打",
      "四家立直",
      "四槓散了",
      "三家和"
    ]);
  });
});
