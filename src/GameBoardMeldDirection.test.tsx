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
  Meld,
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
    id: `meld-direction-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createMeld(
  kind: "chi" | "pon",
  suit: TileSuit,
  ranks: readonly number[],
  calledFrom: SeatIndex,
  calledTileIndex: number
): Meld {
  const tiles = ranks.map(
    (rank) => createTile(suit, rank)
  );

  return {
    kind,
    tiles,
    calledFrom,
    calledTileId:
      tiles[calledTileIndex].id
  };
}

function getMeldTileClassNames(
  html: string,
  kind: "chi" | "pon",
  calledFrom: SeatIndex
): string[] {
  const marker =
    `data-meld-kind="${kind}" ` +
    `data-called-from="${calledFrom}"`;
  const markerIndex = html.indexOf(marker);

  if (markerIndex < 0) {
    return [];
  }

  const groupEndIndex = html.indexOf(
    "</div>",
    markerIndex
  );
  const groupHtml = html.slice(
    markerIndex,
    groupEndIndex
  );

  return Array.from(
    groupHtml.matchAll(
      /class="(meld-tile(?: meld-tile--called)?)"/g
    ),
    (match) => match[1]
  );
}

describe("副露牌の表示方向", () => {
  it("鳴いた相手に応じて横向き牌を正しい位置へ表示する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.players[0].melds = [
      createMeld(
        "chi",
        "man",
        [4, 5, 6],
        3,
        2
      ),
      createMeld(
        "pon",
        "pin",
        [4, 4, 4],
        3,
        2
      ),
      createMeld(
        "pon",
        "sou",
        [5, 5, 5],
        2,
        2
      ),
      createMeld(
        "pon",
        "honor",
        [6, 6, 6],
        1,
        0
      )
    ];

    const html = renderToStaticMarkup(
      <GameBoard initialState={state} />
    );
    const normalTile = "meld-tile";
    const calledTile =
      "meld-tile meld-tile--called";

    expect(
      getMeldTileClassNames(
        html,
        "chi",
        3
      )
    ).toEqual([
      calledTile,
      normalTile,
      normalTile
    ]);
    expect(
      getMeldTileClassNames(
        html,
        "pon",
        3
      )
    ).toEqual([
      calledTile,
      normalTile,
      normalTile
    ]);
    expect(
      getMeldTileClassNames(
        html,
        "pon",
        2
      )
    ).toEqual([
      normalTile,
      calledTile,
      normalTile
    ]);
    expect(
      getMeldTileClassNames(
        html,
        "pon",
        1
      )
    ).toEqual([
      normalTile,
      normalTile,
      calledTile
    ]);
  });
});
