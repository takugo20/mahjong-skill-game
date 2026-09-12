import { describe, expect, it } from "vitest";
import {
  activatePlayerSkill4_22,
  canActivatePlayerSkill4_22,
  createInitialGameState,
  startNextRound
} from "./engine";
import { getTileTypeIndex } from "./hand";
import type { GameState, Tile } from "./types";

function createState(): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{ id: "4-22", level: 1 }]
    }
  );
  state.playerMp = 900;
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  return state;
}

function countTypes(tiles: readonly Tile[]) {
  const counts = new Map<number, number>();
  for (const tile of tiles) {
    const key = getTileTypeIndex(tile);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()];
}

function hasSequence(tiles: readonly Tile[]): boolean {
  for (const suit of ["man", "pin", "sou"] as const) {
    const ranks = new Set(
      tiles.filter((tile) => tile.suit === suit)
        .map((tile) => tile.rank)
    );
    for (let start = 1; start <= 7; start += 1) {
      if (
        ranks.has(start) &&
        ranks.has(start + 1) &&
        ranks.has(start + 2)
      ) {
        return true;
      }
    }
  }
  return false;
}

describe("4-22のエンジン統合", () => {
  it("発動でMPを消費し予約を追加するが現在の手牌は変えない", () => {
    const state = createState();
    expect(canActivatePlayerSkill4_22(state)).toBe(true);

    const result = activatePlayerSkill4_22(state);
    expect(result.playerMp).toBe(500);
    expect(result.round).toBe(state.round);
    expect(result.akuukan?.nextRoundEffects).toHaveLength(1);
    expect(result.akuukan?.nextRoundEffects[0]).toMatchObject({
      sourceId: "player-skill:4-22",
      remainingTurns: null
    });
    expect(canActivatePlayerSkill4_22(result)).toBe(false);
    expect(activatePlayerSkill4_22(result)).toBe(result);
    expect(state.playerMp).toBe(900);
    expect(state.akuukan?.nextRoundEffects).toHaveLength(0);
  });

  it("CPU手番・打牌選択以外・MP不足では発動しない", () => {
    const state = createState();
    const cases: GameState[] = [
      {
        ...state,
        round: { ...state.round, currentSeat: 1 }
      },
      {
        ...state,
        round: { ...state.round, phase: "reaction" }
      },
      { ...state, playerMp: 399 }
    ];
    for (const current of cases) {
      expect(canActivatePlayerSkill4_22(current)).toBe(false);
      expect(activatePlayerSkill4_22(current)).toBe(current);
    }
  });

  it("次局配牌で順子を保証し予約を消費して136枚を維持する", () => {
    const activated = activatePlayerSkill4_22(createState());
    const settled: GameState = {
      ...activated,
      round: {
        ...activated.round,
        phase: "roundEnd",
        abortiveDrawResult: {
          reason: "nineTerminals",
          declarerSeat: 0,
          distinctYaochuCount: 9
        }
      }
    };
    const result = startNextRound(settled, () => 0);
    expect(result.round).not.toBe(settled.round);
    expect(
      hasSequence(result.round.players[0].hand)
    ).toBe(true);
    expect(result.akuukan).toBeDefined();
    expect([
      ...(result.akuukan?.activeEffects ?? []),
      ...(result.akuukan?.nextRoundEffects ?? [])
    ].some(
      (effect) => effect.sourceId === "player-skill:4-22"
    )).toBe(false);
    expect(result.akuukan?.usedSources.turn)
      .not.toContain("player-skill:4-22");

    const allTiles = [
      ...result.round.liveWall,
      ...result.round.deadWall,
      ...result.round.players.flatMap(
        (player) => [
          ...player.hand,
          ...player.melds.flatMap((meld) => meld.tiles),
          ...player.discards.map((discard) => discard.tile)
        ]
      )
    ];
    expect(allTiles).toHaveLength(136);
    expect(new Set(allTiles.map((tile) => tile.id)).size).toBe(136);
    expect(countTypes(allTiles)).toHaveLength(34);
    expect(countTypes(allTiles).every((count) => count === 4)).toBe(true);
    expect(allTiles.filter((tile) => tile.red)).toHaveLength(3);
  });
});
