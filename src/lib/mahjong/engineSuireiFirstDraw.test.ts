import { describe, expect, it } from "vitest";
import { createInitialGameState, drawTile, startNextRound } from "./engine";
import { calculateShanten } from "./hand";
import { disableAkuukanSource } from "../akuukan/state";
import type { SeatIndex, Tile } from "./types";

function fixture(seat: SeatIndex = 2) {
  const state = createInitialGameState(() => 0.5, { enemyId: "enemy-14", equippedSkills: [] });
  const hand: Tile[] = [
    ...[1, 2, 3, 4, 5, 6].map(rank => ({ suit: "man" as const, rank })),
    ...[1, 2, 3].map(rank => ({ suit: "pin" as const, rank })),
    ...[7, 8, 9].map(rank => ({ suit: "sou" as const, rank })),
    { suit: "honor" as const, rank: 5 }
  ].map((tile, index) => ({ ...tile, id: "hand-" + index, red: false }));
  const win: Tile = { id: "win", suit: "honor", rank: 5, red: false };
  const safe: Tile = { id: "safe", suit: "honor", rank: 6, red: false };
  state.round.players[seat] = { ...state.round.players[seat], hand, melds: [],
    discards: [], drawnTileId: null, normalDrawCount: 0 };
  state.round.currentSeat = seat;
  state.round.phase = "drawing";
  state.round.liveWall = [win, safe];
  return { state, hand, win, safe };
}

describe("翠玲の第一ツモ制限", () => {
  it.each([true, false])("親=%sでも初回は和了牌を避け、2回目は引ける", isDealer => {
    const { state, hand, win, safe } = fixture();
    state.round.players[2].isDealer = isDealer;
    state.round.players[2].seatWind = isDealer ? "east" : "west";
    const first = drawTile(state, 2, () => 0);
    expect(first.round.players[2].drawnTileId).toBe(safe.id);
    expect(first.round.players[2].normalDrawCount).toBe(1);
    expect(calculateShanten(first.round.players[2].hand).minimum).not.toBe(-1);
    expect(first.round.liveWall).toEqual([win]);
    expect(state.round.liveWall).toEqual([win, safe]);
    const next = { ...first, round: { ...first.round, phase: "drawing" as const,
      players: first.round.players.map(p => p.seat === 2 ? { ...p, hand, drawnTileId: null } : p) } };
    const second = drawTile(next, 2, () => 0);
    expect(second.round.players[2].drawnTileId).toBe(win.id);
    expect(calculateShanten(second.round.players[2].hand).minimum).toBe(-1);
  });

  it.each([0, 1, 3] as const)("席%sの第一ツモには制限しない", seat => {
    const { state, win } = fixture(seat);
    expect(drawTile(state, seat, () => 0).round.players[seat].drawnTileId).toBe(win.id);
  });

  it("能力無効時には制限しない", () => {
    const { state, win } = fixture();
    state.akuukan = disableAkuukanSource(state.akuukan!, "enemy-ability:E-26");
    expect(drawTile(state, 2, () => 0).round.players[2].drawnTileId).toBe(win.id);
  });

  it("河牌転送の和了牌も初回は保留し、次のツモで受け取る", () => {
    const { state, hand, win, safe } = fixture();
    state.round.liveWall = [safe];
    state.akuukan!.playerSkill3_13Transfer = {
      targetPlayerId: state.round.players[2].id,
      remainingCollectionTurns: 0, reservedTiles: [win]
    };
    const first = drawTile(state, 2, () => 0);
    expect(first.round.players[2].drawnTileId).toBe(safe.id);
    expect(first.akuukan!.playerSkill3_13Transfer!.reservedTiles).toEqual([win]);
    const next = { ...first, round: { ...first.round, phase: "drawing" as const,
      players: first.round.players.map(p => p.seat === 2 ? { ...p, hand, drawnTileId: null } : p) } };
    expect(drawTile(next, 2, () => 0).round.players[2].drawnTileId).toBe(win.id);
  });

  it("以前の中断データでも既に打牌していれば再制限しない", () => {
    const { state, win, safe } = fixture();
    delete state.round.players[2].normalDrawCount;
    state.round.players[2].discards = [{
      tile: safe, riichiDeclaration: false, tsumogiri: true, faceDown: false, called: false
    }];
    expect(drawTile(state, 2, () => 0).round.players[2].drawnTileId).toBe(win.id);
  });

  it("次局でツモ回数をリセットする", () => {
    const { state } = fixture();
    state.round.players[2].normalDrawCount = 8;
    state.round.phase = "roundEnd";
    state.round.abortiveDrawResult = { reason: "nineTerminals", declarerSeat: 0, distinctYaochuCount: 9 };
    const next = startNextRound(state, () => 0.5);
    expect(next.round.players[2].normalDrawCount).toBe(0);
  });
});
