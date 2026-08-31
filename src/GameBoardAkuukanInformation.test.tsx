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
  disableAkuukanSource
} from "./lib/akuukan/state";
import {
  createInitialGameState
} from "./lib/mahjong/engine";
import type {
  GameState,
  RoundWinResult,
  SeatIndex,
  Tile,
  TileSuit
} from "./lib/mahjong/types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id:
      `game-board-information-` +
      serialNumber,
    suit,
    rank,
    red: false
  };
}

function createAkuukanState(
  enemyId:
    | "enemy-1"
    | "enemy-2"
    | "enemy-8"
): GameState {
  return createInitialGameState(
    () => 0.5,
    {
      enemyId,
      equippedSkills: []
    }
  );
}

function setTwoDoraIndicators(
  state: GameState
): Tile[] {
  const indicators = [
    createTile("man", 1),
    createTile("pin", 4)
  ];

  state.round.deadWall[4] =
    indicators[0];
  state.round.deadWall[6] =
    indicators[1];
  state.round.doraIndicatorCount = 2;

  return indicators;
}

function getHtmlFromMarker(
  html: string,
  marker: string
): string {
  const startIndex = html.indexOf(marker);

  return startIndex < 0
    ? ""
    : html.slice(startIndex);
}

function getDoraPanelHtml(
  html: string
): string {
  const startIndex = html.indexOf(
    'class="dora-panel"'
  );

  if (startIndex < 0) {
    return "";
  }

  const endIndex = html.indexOf(
    "</section>",
    startIndex
  );

  return endIndex < 0
    ? html.slice(startIndex)
    : html.slice(startIndex, endIndex);
}

function countFaceDownTiles(
  html: string
): number {
  return (
    html.match(
      /aria-label="裏向きの牌"/g
    )?.length ?? 0
  );
}

function setOneDiscardForEveryPlayer(
  state: GameState
): Tile[] {
  const tiles = [
    createTile("man", 1),
    createTile("pin", 2),
    createTile("sou", 3),
    createTile("honor", 4)
  ];

  for (const seat of [0, 1, 2, 3] as const) {
    state.round.players[seat] = {
      ...state.round.players[seat],
      discards: [
        {
          tile: tiles[seat],
          tsumogiri: false,
          riichiDeclaration: false,
          faceDown: false,
          called: false
        }
      ]
    };
  }

  return tiles;
}

function getRiverHtml(
  html: string,
  playerName: string
): string {
  const marker =
    `aria-label="${playerName}の河"`;
  const startIndex = html.indexOf(marker);

  if (startIndex < 0) {
    return "";
  }

  const endIndex = html.indexOf(
    "</div>",
    startIndex
  );

  return endIndex < 0
    ? html.slice(startIndex)
    : html.slice(startIndex, endIndex + 6);
}

function createWinResult(
  winnerSeat: SeatIndex,
  doraIndicatorTiles: Tile[],
  uraDoraIndicatorTiles: Tile[] = []
): RoundWinResult {
  return {
    winMethod: "ron",
    winnerSeat,
    loserSeat: 1,
    winningTile: createTile(
      "honor",
      7
    ),
    yakuNames: ["立直"],
    doraCount: 3,
    doraIndicatorTiles,
    uraDoraIndicatorTiles,
    han: 4,
    fu: 30,
    yakumanMultiplier: 0,
    limitName: null,
    totalPoints: 7700,
    pointChanges: []
  };
}

describe("E-1の画面表示", () => {
  it("中央のドラ表示牌をすべて裏向きにする", () => {
    const state = createAkuukanState(
      "enemy-1"
    );

    setTwoDoraIndicators(state);

    const html = getDoraPanelHtml(
      renderToStaticMarkup(
        <GameBoard initialState={state} />
      )
    );

    expect(countFaceDownTiles(html)).toBe(2);
    expect(html).not.toContain(
      'aria-label="一萬"'
    );
    expect(html).not.toContain(
      'aria-label="四筒"'
    );
  });

  it("E-1が無効なら中央の表示牌を表向きにする", () => {
    const state = createAkuukanState(
      "enemy-1"
    );

    setTwoDoraIndicators(state);

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態がありません。"
      );
    }

    state.akuukan = disableAkuukanSource(
      state.akuukan,
      "enemy-ability:E-1"
    );

    const html = getDoraPanelHtml(
      renderToStaticMarkup(
        <GameBoard initialState={state} />
      )
    );

    expect(countFaceDownTiles(html)).toBe(0);
    expect(html).toContain(
      'aria-label="一萬"'
    );
    expect(html).toContain(
      'aria-label="四筒"'
    );
  });

  it("E-1を持たない敵なら中央の表示牌を表向きにする", () => {
    const state = createAkuukanState(
      "enemy-2"
    );

    setTwoDoraIndicators(state);

    const html = getDoraPanelHtml(
      renderToStaticMarkup(
        <GameBoard initialState={state} />
      )
    );

    expect(countFaceDownTiles(html)).toBe(0);
    expect(html).toContain(
      'aria-label="一萬"'
    );
    expect(html).toContain(
      'aria-label="四筒"'
    );
  });

  it("和了結果では表ドラだけ伏せて裏ドラと翻数を表示する", () => {
    const state = createAkuukanState(
      "enemy-1"
    );
    const doraIndicators =
      setTwoDoraIndicators(state);
    const uraDoraIndicator =
      createTile("honor", 5);

    state.round.phase = "roundEnd";
    state.round.winResult =
      createWinResult(
        0,
        doraIndicators,
        [uraDoraIndicator]
      );
    state.round.doubleRonResult = null;
    state.round.drawResult = null;
    state.round.nagashiManganResult = null;
    state.round.abortiveDrawResult = null;

    const html = getHtmlFromMarker(
      renderToStaticMarkup(
        <GameBoard initialState={state} />
      ),
      'aria-label="和了結果"'
    );

    expect(countFaceDownTiles(html)).toBe(2);
    expect(html).not.toContain(
      'aria-label="一萬"'
    );
    expect(html).not.toContain(
      'aria-label="四筒"'
    );
    expect(html).toContain(
      'aria-label="白"'
    );
    expect(html).toContain(
      "<span>ドラ3</span>"
    );
  });

  it("ダブロン結果でも表ドラだけを裏向きにする", () => {
    const state = createAkuukanState(
      "enemy-1"
    );
    const doraIndicators =
      setTwoDoraIndicators(state);
    const uraDoraIndicator =
      createTile("honor", 5);

    state.round.phase = "roundEnd";
    state.round.winResult = null;
    state.round.doubleRonResult = {
      loserSeat: 1,
      winResults: [
        createWinResult(
          2,
          doraIndicators
        ),
        createWinResult(
          3,
          doraIndicators,
          [uraDoraIndicator]
        )
      ],
      pointChanges: [],
      riichiPoolRecipientSeat: null
    };
    state.round.drawResult = null;
    state.round.nagashiManganResult = null;
    state.round.abortiveDrawResult = null;

    const html = getHtmlFromMarker(
      renderToStaticMarkup(
        <GameBoard initialState={state} />
      ),
      'aria-label="ダブロン結果"'
    );

    expect(countFaceDownTiles(html)).toBe(2);
    expect(html).not.toContain(
      'aria-label="一萬"'
    );
    expect(html).not.toContain(
      'aria-label="四筒"'
    );
    expect(html).toContain(
      'aria-label="白"'
    );
  });
});

describe("E-13の河表示", () => {
  const tileLabels = [
    "一萬",
    "二筒",
    "三索",
    "北"
  ] as const;

  it("敵8戦では他家3人の河を裏向きにして自分の河を表向きにする", () => {
    const state = createAkuukanState(
      "enemy-8"
    );

    setOneDiscardForEveryPlayer(state);

    const html = renderToStaticMarkup(
      <GameBoard initialState={state} />
    );
    const playerRiver = getRiverHtml(
      html,
      state.round.players[0].name
    );

    expect(
      countFaceDownTiles(playerRiver)
    ).toBe(0);
    expect(playerRiver).toContain(
      `aria-label="${tileLabels[0]}"`
    );

    for (const seat of [1, 2, 3] as const) {
      const opponentRiver = getRiverHtml(
        html,
        state.round.players[seat].name
      );

      expect(
        countFaceDownTiles(opponentRiver)
      ).toBe(1);
      expect(opponentRiver).not.toContain(
        `aria-label="${tileLabels[seat]}"`
      );
    }
  });

  it("E-13が無効なら4人の河を表向きにする", () => {
    const state = createAkuukanState(
      "enemy-8"
    );

    setOneDiscardForEveryPlayer(state);

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態がありません。"
      );
    }

    state.akuukan = disableAkuukanSource(
      state.akuukan,
      "enemy-ability:E-13"
    );

    const html = renderToStaticMarkup(
      <GameBoard initialState={state} />
    );

    for (const seat of [0, 1, 2, 3] as const) {
      const river = getRiverHtml(
        html,
        state.round.players[seat].name
      );

      expect(
        countFaceDownTiles(river)
      ).toBe(0);
      expect(river).toContain(
        `aria-label="${tileLabels[seat]}"`
      );
    }
  });

  it("E-13を持たない敵なら4人の河を表向きにする", () => {
    const state = createAkuukanState(
      "enemy-2"
    );

    setOneDiscardForEveryPlayer(state);

    const html = renderToStaticMarkup(
      <GameBoard initialState={state} />
    );

    for (const seat of [0, 1, 2, 3] as const) {
      const river = getRiverHtml(
        html,
        state.round.players[seat].name
      );

      expect(
        countFaceDownTiles(river)
      ).toBe(0);
      expect(river).toContain(
        `aria-label="${tileLabels[seat]}"`
      );
    }
  });
});
