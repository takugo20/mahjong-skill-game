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
    id: `win-dora-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

interface WinResultOptions {
  winnerSeat?: SeatIndex;
  loserSeat?: SeatIndex;
  yakuNames?: string[];
  doraCount: number;
  doraIndicatorTiles: Tile[];
  uraDoraIndicatorTiles?: Tile[];
  yakumanMultiplier?: number;
}

function createWinResult({
  winnerSeat = 0,
  loserSeat = 1,
  yakuNames = ["立直"],
  doraCount,
  doraIndicatorTiles,
  uraDoraIndicatorTiles = [],
  yakumanMultiplier = 0
}: WinResultOptions): RoundWinResult {
  return {
    winMethod: "ron",
    winnerSeat,
    loserSeat,
    winningTile: createTile("honor", 7),
    yakuNames,
    doraCount,
    doraIndicatorTiles,
    uraDoraIndicatorTiles,
    han: yakumanMultiplier > 0 ? 0 : 4,
    fu: yakumanMultiplier > 0 ? null : 30,
    yakumanMultiplier,
    limitName:
      yakumanMultiplier > 0
        ? "役満"
        : null,
    totalPoints:
      yakumanMultiplier > 0
        ? 32000
        : 7700,
    pointChanges: []
  };
}

function createRoundEndState(
  winResult: RoundWinResult
): GameState {
  const state = createInitialGameState(
    () => 0.5
  );

  state.round.phase = "roundEnd";
  state.round.winResult = winResult;
  state.round.doubleRonResult = null;
  state.round.drawResult = null;
  state.round.abortiveDrawResult = null;

  return state;
}

function getResultHtml(
  html: string,
  ariaLabel: string
): string {
  const startIndex = html.indexOf(
    `aria-label="${ariaLabel}"`
  );

  if (startIndex < 0) {
    return "";
  }

  return html.slice(startIndex);
}

describe("和了結果のドラ表示", () => {
  it("通常和了では表ドラ表示牌とドラ合計を表示する", () => {
    const state = createRoundEndState(
      createWinResult({
        yakuNames: ["断么九"],
        doraCount: 3,
        doraIndicatorTiles: [
          createTile("man", 1),
          createTile("pin", 4)
        ]
      })
    );

    const html = getResultHtml(
      renderToStaticMarkup(
        <GameBoard initialState={state} />
      ),
      "和了結果"
    );

    expect(html).toContain("ドラ表示牌");
    expect(html).toContain(
      'aria-label="一萬"'
    );
    expect(html).toContain(
      'aria-label="四筒"'
    );
    expect(html).toContain(
      "<span>ドラ3</span>"
    );
    expect(html).not.toContain(
      "裏ドラ表示牌"
    );
    expect(html).not.toContain(
      'aria-label="中"'
    );
  });

  it("立直和了では裏ドラ表示牌も表示する", () => {
    const state = createRoundEndState(
      createWinResult({
        doraCount: 4,
        doraIndicatorTiles: [
          createTile("sou", 9)
        ],
        uraDoraIndicatorTiles: [
          createTile("honor", 4),
          createTile("honor", 6)
        ]
      })
    );

    state.round.players[0].riichi = true;

    const html = getResultHtml(
      renderToStaticMarkup(
        <GameBoard initialState={state} />
      ),
      "和了結果"
    );

    expect(html).toContain(
      "裏ドラ表示牌"
    );
    expect(html).toContain(
      'aria-label="九索"'
    );
    expect(html).toContain(
      'aria-label="北"'
    );
    expect(html).toContain(
      'aria-label="發"'
    );
    expect(html).toContain(
      "<span>ドラ4</span>"
    );
    expect(
      html.match(/win-result-dora-row/g)
    ).toHaveLength(2);
  });

  it("役満では表示牌を表示してもドラ合計を役一覧へ加えない", () => {
    const state = createRoundEndState(
      createWinResult({
        yakuNames: ["国士無双"],
        doraCount: 6,
        doraIndicatorTiles: [
          createTile("pin", 2)
        ],
        uraDoraIndicatorTiles: [
          createTile("sou", 3)
        ],
        yakumanMultiplier: 1
      })
    );

    state.round.players[0].riichi = true;

    const html = getResultHtml(
      renderToStaticMarkup(
        <GameBoard initialState={state} />
      ),
      "和了結果"
    );

    expect(html).toContain("国士無双");
    expect(html).toContain("ドラ表示牌");
    expect(html).toContain(
      "裏ドラ表示牌"
    );
    expect(html).not.toContain(
      "<span>ドラ6</span>"
    );
  });

  it("ダブロンでは表示牌を1組だけ表示し各和了者のドラ合計を表示する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const doraIndicatorTiles = [
      createTile("man", 8),
      createTile("honor", 3)
    ];
    const uraDoraIndicatorTiles = [
      createTile("honor", 5)
    ];

    state.round.phase = "roundEnd";
    state.round.winResult = null;
    state.round.doubleRonResult = {
      loserSeat: 1,
      winResults: [
        createWinResult({
          winnerSeat: 2,
          loserSeat: 1,
          yakuNames: ["断么九"],
          doraCount: 1,
          doraIndicatorTiles
        }),
        createWinResult({
          winnerSeat: 3,
          loserSeat: 1,
          yakuNames: ["立直"],
          doraCount: 3,
          doraIndicatorTiles,
          uraDoraIndicatorTiles
        })
      ],
      pointChanges: [],
      riichiPoolRecipientSeat: null
    };
    state.round.drawResult = null;
    state.round.abortiveDrawResult = null;
    state.round.players[3].riichi = true;

    const html = getResultHtml(
      renderToStaticMarkup(
        <GameBoard initialState={state} />
      ),
      "ダブロン結果"
    );

    expect(
      html.match(
        /aria-label="ドラ表示牌"/g
      )
    ).toHaveLength(1);
    expect(html).toContain(
      "裏ドラ表示牌"
    );
    expect(html).toContain(
      "<span>ドラ1</span>"
    );
    expect(html).toContain(
      "<span>ドラ3</span>"
    );
    expect(html).not.toContain(
      'aria-label="中"'
    );
  });
});
