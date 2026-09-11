import {
  describe,
  expect,
  it
} from "vitest";
import {
  canPlayerTsumo,
  createInitialGameState,
  declarePlayerTsumo
} from "./engine";
import type {
  GameState,
  Tile
} from "./types";

function createExchangeWinState(): GameState {
  const initial = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "4-18",
        level: 2
      }]
    }
  );

  const faces: Array<
    [Tile["suit"], number]
  > = [
    ["man", 1],
    ["man", 2],
    ["man", 3],
    ["pin", 1],
    ["pin", 2],
    ["pin", 3],
    ["sou", 1],
    ["sou", 2],
    ["sou", 3],
    ["sou", 4],
    ["sou", 5],
    ["sou", 6],
    ["honor", 1],
    ["honor", 1]
  ];

  const hand: Tile[] = faces.map(
    ([suit, rank], index) => ({
      id: `exchange-win-${index}`,
      suit,
      rank,
      red: false
    })
  );

  return {
    ...initial,
    round: {
      ...initial.round,
      currentSeat: 0,
      phase: "discarding",
      turnNumber: 8,
      handExchangeWinningTileIds: [
        "exchange-win-11"
      ],
      players: initial.round.players.map(
        (player) => ({
          ...player,
          discards: [{
            tile: {
              id: `previous-discard-${player.seat}`,
              suit: "honor",
              rank: 4,
              red: false
            },
            tsumogiri: true,
            riichiDeclaration: false,
            called: false
          }],
          ...(player.seat === 0
            ? {
                hand,
                riichi: false,
                doubleRiichi: false,
                ippatsu: false,
                drawnTileId:
                  "exchanged-out-drawn-tile",
                drawnTileSource:
                  "liveWall" as const
              }
            : {})
        }))
    }
  };
}

describe("4-18の交換和了", () => {
  it("元のツモ牌が手牌になくても交換牌で和了できる", () => {
    const state = createExchangeWinState();

    expect(
      state.round.players[0].hand.some(
        (tile) =>
          tile.id ===
          state.round.players[0].drawnTileId
      )
    ).toBe(false);

    expect(
      canPlayerTsumo(state)
    ).toBe(true);

    const result = declarePlayerTsumo(
      state,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.winResult?.winningTile.id
    ).toBe("exchange-win-11");
  });

  it("複数の交換候補から実際の和了牌を採用する", () => {
    const initial = createExchangeWinState();

    const state: GameState = {
      ...initial,
      round: {
        ...initial.round,
        handExchangeWinningTileIds: [
          "exchange-win-8",
          "exchange-win-11"
        ]
      }
    };

    expect(
      canPlayerTsumo(state)
    ).toBe(true);

    const result = declarePlayerTsumo(
      state,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect([
      "exchange-win-8",
      "exchange-win-11"
    ]).toContain(
      result.round.winResult?.winningTile.id
    );
  });

  it("通常山が空でも交換和了に海底摸月を付けない", () => {
    const initial = createExchangeWinState();

    const state: GameState = {
      ...initial,
      round: {
        ...initial.round,
        liveWall: []
      }
    };

    const result = declarePlayerTsumo(
      state,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.winResult
    ).not.toBeNull();
    expect(
      JSON.stringify(
        result.round.winResult
      )
    ).not.toContain("海底摸月");
  });
});
