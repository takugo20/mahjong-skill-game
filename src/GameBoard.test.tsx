import {
  renderToStaticMarkup
} from "react-dom/server";
import {
  describe,
  expect,
  it
} from "vitest";
import {
  GameBoard
} from "./GameBoard";
import {
  createInitialGameState
} from "./lib/mahjong/engine";
import type {
  RoundWinResult,
  SeatIndex,
  Tile,
  TileSuit
} from "./lib/mahjong/types";

let uiTileSerialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  uiTileSerialNumber += 1;

  return {
    id: `game-board-${uiTileSerialNumber}`,
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

function createRiichiReadyState() {
  const state = createInitialGameState(
    () => 0.5
  );
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
    ippatsu: false,
    drawnTileId: hand[13].id
  };
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;

  return state;
}

function createMeldCallReactionState() {
  const state = createInitialGameState(
    () => 0.5
  );
  const calledTile =
    createTile("man", 4);
  const firstFour =
    createTile("man", 4);
  const secondFour =
    createTile("man", 4);
  const redFive = {
    ...createTile("man", 5),
    red: true
  };
  const firstNormalFive =
    createTile("man", 5);
  const secondNormalFive =
    createTile("man", 5);
  const six = createTile("man", 6);

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      firstFour,
      secondFour,
      redFive,
      firstNormalFive,
      secondNormalFive,
      six
    ],
    melds: [],
    discards: [],
    riichi: false,
    ippatsu: false,
    drawnTileId: null
  };
  state.round.phase = "reaction";
  state.round.lastDiscard = {
    seat: 3,
    discard: {
      tile: calledTile,
      tsumogiri: false,
      riichiDeclaration: false,
      faceDown: false,
      called: false
    }
  };
  state.round.meldCallOptions = [
    {
      id: "ui-pon",
      kind: "pon",
      callerSeat: 0,
      discarderSeat: 3,
      calledTileId: calledTile.id,
      handTileIds: [
        firstFour.id,
        secondFour.id
      ]
    },
    {
      id: "ui-chi-red",
      kind: "chi",
      callerSeat: 0,
      discarderSeat: 3,
      calledTileId: calledTile.id,
      handTileIds: [
        redFive.id,
        six.id
      ]
    },
    {
      id: "ui-chi-normal-first",
      kind: "chi",
      callerSeat: 0,
      discarderSeat: 3,
      calledTileId: calledTile.id,
      handTileIds: [
        firstNormalFive.id,
        six.id
      ]
    },
    {
      id: "ui-chi-normal-second",
      kind: "chi",
      callerSeat: 0,
      discarderSeat: 3,
      calledTileId: calledTile.id,
      handTileIds: [
        secondNormalFive.id,
        six.id
      ]
    }
  ];

  return state;
}

function createDisplayMeld(
  kind: "chi" | "pon",
  suit: TileSuit,
  ranks: readonly number[],
  calledFrom: SeatIndex
) {
  const tiles = createTiles(suit, ranks);

  return {
    kind,
    tiles,
    calledFrom,
    calledTileId: tiles[0].id
  };
}

function createMeldDisplayState() {
  const state = createInitialGameState(
    () => 0.5
  );

  state.round.players[0].melds = [
    createDisplayMeld(
      "chi",
      "man",
      [1, 2, 3],
      3
    )
  ];
  state.round.players[1].melds = [
    createDisplayMeld(
      "pon",
      "honor",
      [5, 5, 5],
      0
    )
  ];
  state.round.players[2].melds = [
    createDisplayMeld(
      "pon",
      "pin",
      [7, 7, 7],
      1
    )
  ];
  state.round.players[3].melds = [
    createDisplayMeld(
      "chi",
      "sou",
      [4, 5, 6],
      2
    )
  ];

  return state;
}

function createRonResult(
  winnerSeat: SeatIndex,
  loserSeat: SeatIndex,
  tileId: string,
  yakuNames: string[],
  han: number,
  totalPoints: number
): RoundWinResult {
  return {
    winMethod: "ron",
    winnerSeat,
    loserSeat,
    winningTile: {
      id: tileId,
      suit: "man",
      rank: 5,
      red: false
    },
    yakuNames,
    han,
    fu: 30,
    yakumanMultiplier: 0,
    limitName: null,
    totalPoints,
    pointChanges: []
  };
}

describe("対局画面", () => {
  it("半荘戦と表示し配り直し操作を表示しない", () => {
    const html = renderToStaticMarkup(
      <GameBoard />
    );

    expect(html).toContain("半荘戦");
    expect(html).not.toContain("配り直し");
  });

  
  it("プレイヤーと全CPUの副露面子を表示する", () => {
    const html = renderToStaticMarkup(
      <GameBoard
        initialState={
          createMeldDisplayState()
        }
      />
    );

    for (
      const label of [
        "あなたの面子",
        "CPU・右の面子",
        "能力者CPUの面子",
        "CPU・左の面子"
      ]
    ) {
      expect(html).toContain(
        `aria-label="${label}"`
      );
    }

    for (
      const position of [
        "bottom",
        "top",
        "left",
        "right"
      ]
    ) {
      expect(html).toContain(
        `meld-area--${position}`
      );
    }

    expect(
      html.match(/data-meld-kind="chi"/g)
    ).toHaveLength(2);
    expect(
      html.match(/data-meld-kind="pon"/g)
    ).toHaveLength(2);
    expect(
      html.match(
        /data-called-tile="true"/g
      )
    ).toHaveLength(4);
    expect(
      html.match(
        /meld-tile meld-tile--called/g
      )
    ).toHaveLength(4);
  });

  it("ポンと複数のチー候補を区別して表示する", () => {
    const html = renderToStaticMarkup(
      <GameBoard
        initialState={
          createMeldCallReactionState()
        }
      />
    );

    expect(html).toContain(
      "ポン・チー可能"
    );
    expect(html).toContain(
      ">ポン</button>"
    );
    expect(html).toContain(
      ">チー 赤5+6</button>"
    );
    expect(html).toContain(
      ">チー 5+6</button>"
    );
    expect(
      html.match(/>チー 5\+6<\/button>/g)
    ).toHaveLength(1);
    expect(html).toContain(
      ">見逃す</button>"
    );
    expect(html).not.toContain(
      ">ロン</button>"
    );
  });

  it("ロンとポンが可能な場合はロンを先に表示する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const calledTile =
      createTile("honor", 1);
    const firstEast =
      createTile("honor", 1);
    const secondEast =
      createTile("honor", 1);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        firstEast,
        secondEast,
        ...createTiles(
          "man",
          [1, 2, 3]
        ),
        ...createTiles(
          "pin",
          [1, 2, 3]
        ),
        ...createTiles(
          "sou",
          [1, 2, 3]
        ),
        ...createTiles(
          "honor",
          [5, 5]
        )
      ],
      melds: [],
      discards: [],
      riichi: false,
      ippatsu: false,
      drawnTileId: null
    };
    state.round.phase = "reaction";
    state.round.lastDiscard = {
      seat: 1,
      discard: {
        tile: calledTile,
        tsumogiri: false,
        riichiDeclaration: false,
        faceDown: false,
        called: false
      }
    };
    state.round.meldCallOptions = [
      {
        id: "ui-ron-and-pon",
        kind: "pon",
        callerSeat: 0,
        discarderSeat: 1,
        calledTileId: calledTile.id,
        handTileIds: [
          firstEast.id,
          secondEast.id
        ]
      }
    ];

    const html = renderToStaticMarkup(
      <GameBoard initialState={state} />
    );
    const ronButtonIndex =
      html.indexOf(">ロン</button>");
    const ponButtonIndex =
      html.indexOf(">ポン</button>");

    expect(html).toContain("ロン可能");
    expect(ronButtonIndex).toBeGreaterThan(-1);
    expect(ponButtonIndex).toBeGreaterThan(
      ronButtonIndex
    );
  });
  
    it("立直可能牌と立直ボタンを表示する", () => {
    const html = renderToStaticMarkup(
      <GameBoard
        initialState={createRiichiReadyState()}
      />
    );

    expect(html).toContain(
      "青枠の牌で立直可能"
    );
    expect(html).toContain(
      'class="secondary-button riichi-button" disabled=""'
    );
    expect(
      html.match(
        /mahjong-tile--highlighted/g
      )
    ).toHaveLength(4);
  });

  it("立直中表示と横向き宣言牌の識別情報を表示する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const declarationTile =
      createTile("man", 5);
    const declarationDiscard = {
      tile: declarationTile,
      tsumogiri: false,
      riichiDeclaration: true,
      faceDown: false,
      called: false
    };

    state.round.players[0] = {
      ...state.round.players[0],
      riichi: true,
      ippatsu: true,
      discards: [declarationDiscard]
    };
    state.round.players[1] = {
      ...state.round.players[1],
      riichi: true,
      ippatsu: false
    };
    state.round.lastDiscard = {
      seat: 0,
      discard: declarationDiscard
    };

    const html = renderToStaticMarkup(
      <GameBoard initialState={state} />
    );

    expect(html).toContain(
      'class="discard-tile discard-tile--riichi"'
    );
    expect(html).toContain(
      'data-riichi-declaration="true"'
    );
    expect(
      html.match(/riichi-status-badge/g)
    ).toHaveLength(2);
  });

    it("通常立直とダブル立直の表示を切り替える", () => {
    const state = createRiichiReadyState();

    state.round.players[0] = {
      ...state.round.players[0],
      riichi: true,
      doubleRiichi: true,
      ippatsu: true
    };
    state.round.players[1] = {
      ...state.round.players[1],
      riichi: true,
      doubleRiichi: false,
      ippatsu: false
    };

    const html = renderToStaticMarkup(
      <GameBoard initialState={state} />
    );

    expect(html).toContain(
      '<span class="riichi-status-badge">ダブル立直</span>'
    );
    expect(html).toContain(
      '<span class="riichi-status-badge">立直</span>'
    );
    expect(html).toContain(
      "ダブル立直中・ツモ切り"
    );
    expect(
      html.match(/riichi-status-badge/g)
    ).toHaveLength(2);
  });

  it("ダブロン結果に2人分の和了内容と合算した点数移動を表示する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.phase = "roundEnd";
    state.round.players[0].score = 25000;
    state.round.players[1].score = 8000;
    state.round.players[2].score = 34000;
    state.round.players[3].score = 33000;
    state.round.winResult = null;
    state.round.doubleRonResult = {
      loserSeat: 1,
      winResults: [
        createRonResult(
          2,
          1,
          "double-ron-first",
          ["立直", "断么九"],
          2,
          9000
        ),
        createRonResult(
          3,
          1,
          "double-ron-second",
          ["混一色"],
          3,
          8000
        )
      ],
      pointChanges: [
        {
          playerId: "player-0",
          seat: 0,
          pointsBefore: 25000,
          change: 0,
          pointsAfter: 25000
        },
        {
          playerId: "player-1",
          seat: 1,
          pointsBefore: 25000,
          change: -17000,
          pointsAfter: 8000
        },
        {
          playerId: "player-2",
          seat: 2,
          pointsBefore: 25000,
          change: 9000,
          pointsAfter: 34000
        },
        {
          playerId: "player-3",
          seat: 3,
          pointsBefore: 25000,
          change: 8000,
          pointsAfter: 33000
        }
      ],
      riichiPoolRecipientSeat: 2
    };
    state.round.drawResult = null;
    state.round.abortiveDrawResult = null;

    const html = renderToStaticMarkup(
      <GameBoard initialState={state} />
    );

    expect(html).toContain(
      'aria-label="ダブロン結果"'
    );
    expect(html).toContain("2人和了");
    expect(html).toContain("立直");
    expect(html).toContain("断么九");
    expect(html).toContain("混一色");
    expect(html).toContain("9,000点");
    expect(html).toContain("8,000点");
    expect(html).toContain("供託取得");
    expect(html).toContain("-17,000");
    expect(html).toContain("+9,000");
    expect(html).toContain("+8,000");
    expect(html).toContain("次局へ");
  });

  it("三家和結果に宣言者と供託持ち越しを表示する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.phase = "roundEnd";
    state.round.riichiPool = 2000;
    state.round.winResult = null;
    state.round.doubleRonResult = null;
    state.round.drawResult = null;
    state.round.abortiveDrawResult = {
      reason: "tripleRon",
      discarderSeat: 0,
      ronCandidateSeats: [1, 2, 3]
    };

    const html = renderToStaticMarkup(
      <GameBoard initialState={state} />
    );

    expect(html).toContain(
      'aria-label="三家和結果"'
    );
    expect(html).toContain("三家和");
    expect(html).toContain("3人ロン");
    expect(html).toContain("CPU・右");
    expect(html).toContain("能力者CPU");
    expect(html).toContain("CPU・左");
    expect(html).toContain("点数移動なし");
    expect(html).toContain(
      "供託2,000点は次局へ持ち越します。"
    );
    expect(html).toContain("次局へ");
  });

  it("対局終了時に最終順位と供託取得を表示する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.phase = "matchEnd";
    state.round.players[0].score = 31000;
    state.round.players[1].score = 29000;
    state.round.players[2].score = 20000;
    state.round.players[3].score = 20000;
    state.matchResult = {
      provisionalLeaderId: "player-0",
      riichiPoolRecipientId: "player-0",
      riichiPoolAward: 2000,
      rankings: [
        {
          rank: 1,
          playerId: "player-0",
          seat: 0,
          pointsBeforePool: 29000,
          riichiPoolAward: 2000,
          finalPoints: 31000
        },
        {
          rank: 2,
          playerId: "player-1",
          seat: 1,
          pointsBeforePool: 29000,
          riichiPoolAward: 0,
          finalPoints: 29000
        },
        {
          rank: 3,
          playerId: "player-2",
          seat: 2,
          pointsBeforePool: 20000,
          riichiPoolAward: 0,
          finalPoints: 20000
        },
        {
          rank: 4,
          playerId: "player-3",
          seat: 3,
          pointsBeforePool: 20000,
          riichiPoolAward: 0,
          finalPoints: 20000
        }
      ]
    };

    const html = renderToStaticMarkup(
      <GameBoard initialState={state} />
    );

    expect(html).toContain("最終順位");
    expect(html).toContain("1位");
    expect(html).toContain("4位");
    expect(html).toContain("31,000点");
    expect(html).toContain("供託 +2,000点");
    expect(html).toContain("起家");
    expect(html).toContain("新しい対局");
  });
});
