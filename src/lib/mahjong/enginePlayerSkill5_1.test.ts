import { describe, expect, it } from "vitest";
import {
  createInitialGameState,
  drawTile,
  canPlayerTsumo
} from "./engine";
import type {
  GameState,
  SeatIndex,
  Tile
} from "./types";

function prepareState(
  options: {
    riichi?: boolean;
    ippatsu?: boolean;
    afterFirstDiscard?: boolean;
    seat?: SeatIndex;
  } = {}
): GameState {
  const state = createInitialGameState(() => 0.5, {
    enemyId: "enemy-1",
    equippedSkills: [{ id: "5-1", level: 5 }]
  });

  const seat = options.seat ?? 0;

  // 123萬・123筒・123索・789索・白の、白単騎待ち。
  const hand: Tile[] = [
    ...[1, 2, 3].map((rank) => ({
      id: `hand-man-${rank}`,
      suit: "man" as const,
      rank,
      red: false
    })),
    ...[1, 2, 3].map((rank) => ({
      id: `hand-pin-${rank}`,
      suit: "pin" as const,
      rank,
      red: false
    })),
    ...[1, 2, 3, 7, 8, 9].map((rank) => ({
      id: `hand-sou-${rank}`,
      suit: "sou" as const,
      rank,
      red: false
    })),
    {
      id: "hand-white",
      suit: "honor",
      rank: 5,
      red: false
    }
  ];

  const declaration = {
    tile: {
      id: "declaration",
      suit: "man" as const,
      rank: 9,
      red: false
    },
    tsumogiri: false,
    riichiDeclaration: true,
    faceDown: false,
    called: false
  };

  return {
    ...state,
    round: {
      ...state.round,
      phase: "drawing",
      currentSeat: seat,
      lastDiscard: null,
      liveWall: [
        {
          id: "normal",
          suit: "pin",
          rank: 8,
          red: false
        },
        {
          id: "winning",
          suit: "honor",
          rank: 5,
          red: false
        }
      ],
      players: state.round.players.map((player) =>
        player.seat !== seat
          ? player
          : {
              ...player,
              hand,
              melds: [],
              riichi: options.riichi ?? true,
              ippatsu: options.ippatsu ?? true,
              drawnTileId: null,
              drawnTileSource: null,
              discards: options.afterFirstDiscard
                ? [
                    declaration,
                    {
                      ...declaration,
                      tile: {
                        ...declaration.tile,
                        id: "later-discard"
                      },
                      riichiDeclaration: false
                    }
                  ]
                : [declaration]
            }
      )
    }
  };
}

describe("5-1 紫電一閃のエンジン統合", () => {
  it("最初の通常ツモで和了牌の重量を3倍にする", () => {
    const state = prepareState();
    const before = JSON.stringify(state);

    const normal = drawTile(state, 0, () => 0.249999);
    const winning = drawTile(state, 0, () => 0.25);

    expect(
      normal.round.players[0].drawnTileId
    ).toBe("normal");

    expect(canPlayerTsumo(normal)).toBe(false);

    expect(
      winning.round.players[0].drawnTileId
    ).toBe("winning");

    expect(canPlayerTsumo(winning)).toBe(true);

    expect(
      winning.round.liveWall.map((tile) => tile.id)
    ).toEqual(["normal"]);

    expect(
      winning.round.players[0].hand
    ).toHaveLength(14);

    expect(JSON.stringify(state)).toBe(before);
  });

  it.each([
    {
      label: "一発消滅後",
      options: { ippatsu: false }
    },
    {
      label: "立直未成立",
      options: { riichi: false }
    },
    {
      label: "立直後の打牌済み",
      options: { afterFirstDiscard: true }
    },
    {
      label: "CPUのツモ",
      options: { seat: 1 as const }
    }
  ])("$labelには補正しない", ({ options }) => {
    const state = prepareState(options);
    const seat = state.round.currentSeat;
    const result = drawTile(state, seat, () => 0.9);

    expect(
      result.round.players[seat].drawnTileId
    ).toBe("normal");

    expect(
      result.round.liveWall.map((tile) => tile.id)
    ).toEqual(["winning"]);
  });
});
