import { describe, expect, it } from "vitest";
import { createInitialGameState, drawCpuTile, discardTile } from "../mahjong/engine";
import { calculateShanten } from "../mahjong/hand";
import { evaluateWinningHand } from "../mahjong/winning";
import type { Tile, GameState, Discard, MeldCallOption } from "../mahjong/types";
import { chooseEnemyFifteenDiscard, chooseEnemyFifteenRiverDraw,
  shouldEnemyFifteenCall, isEnemyFifteenPlannerEnabled, prefersEnemyFifteenSpecialHand } from "./enemyFifteenPlanner";
import { chooseEnemyRiichi } from "./enemyRiichiStrategy";
import { disableAkuukanSource } from "./state";

let serial = 0;
function tiles(text: string): Tile[] {
  return [...text.matchAll(/([1-9]+)([mpsz])/g)].flatMap(([, digits, suit]) => [...digits].map(rank => ({
    id: `planner-test-${++serial}`, suit: ({ m: "man", p: "pin", s: "sou", z: "honor" } as const)[suit as "m"],
    rank: Number(rank), red: false
  })));
}
const discard = (tile: Tile): Discard => ({ tile, tsumogiri: false, called: false, faceDown: false, riichiDeclaration: false });
function fixture(hand: string, river: string, wall = 60): GameState {
  const s = createInitialGameState(() => 0.5, { enemyId: "enemy-15", equippedSkills: [] });
  s.round.players.forEach(p => { p.hand = []; p.melds = []; p.discards = []; p.riichi = false; p.ippatsu = false; });
  s.round.players[2].hand = tiles(hand);
  s.round.players[0].discards = tiles(river).map(discard);
  s.round.liveWall = Array.from({ length: wall }, () => tiles("5m")[0]);
  s.round.doraIndicatorCount = 0;
  s.round.currentSeat = 2; s.round.phase = "drawing";
  return s;
}

describe("玄晶の河を使った手作り", () => {
  it("再現局面：自分の河の一萬を別の一萬と交換しない", () => {
    let seed = 18;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    let s = createInitialGameState(random, { enemyId: "enemy-15", equippedSkills: [] });
    const p = s.round.players[2];
    const one = s.round.liveWall.find(t => t.suit === "man" && t.rank === 1)!;
    s.round.liveWall = s.round.liveWall.filter(t => t.id !== one.id).slice(0, 50);
    s.round.doraIndicatorCount = 0;
    p.discards.push(discard(one)); s.round.phase = "drawing"; s.round.currentSeat = 2;
    const shape = (hand: Tile[]) => hand.map(t => `${t.suit}:${t.rank}:${t.red}`).sort().join("|");
    const visited = new Set([shape(p.hand)]);
    for (let turn = 0; turn < 5; turn++) {
      const choice = chooseEnemyFifteenRiverDraw(s, s.round.players[2], []);
      const drawn = drawCpuTile(s, 2, random);
      if (!choice) {
        expect(drawn.round.players[2].drawnTileSource).toBe("liveWall");
        break;
      }
      const dropped = chooseEnemyFifteenDiscard(drawn, drawn.round.players[2], [])!;
      expect(dropped.id).toBe(choice.discardPlan!.discardTileId);
      expect(dropped.suit !== choice.tile.suit || dropped.rank !== choice.tile.rank).toBe(true);
      s = discardTile(drawn, dropped.id, false, random);
      expect(s.round.players[2].riverDrawDiscardPlan).toBeUndefined();
      const nextShape = shape(s.round.players[2].hand);
      expect(visited.has(nextShape)).toBe(false); visited.add(nextShape);
      s.round.liveWall = s.round.liveWall.slice(3); s.round.phase = "drawing"; s.round.currentSeat = 2;
    }
  });

  it("拾う前の打牌計画を実際の打牌まで引き継ぐ", () => {
    const s = fixture("11m22p33s4m5p6s7z89m1p", "4m5p6s7z");
    const choice = chooseEnemyFifteenRiverDraw(s, s.round.players[2], []);
    expect(choice?.discardPlan).toBeDefined();
    const after = drawCpuTile(s, 2, () => 0);
    const p = after.round.players[2];
    expect(p.riverDrawDiscardPlan).toEqual(choice!.discardPlan);
    const dropped = chooseEnemyFifteenDiscard(after, p, []);
    expect(dropped?.id).toBe(choice!.discardPlan!.discardTileId);
    const shape = (hand: Tile[]) => hand.map(t => `${t.suit}:${t.rank}:${t.red}`).sort();
    expect(shape(p.hand.filter(t => t.id !== dropped!.id))).not.toEqual(shape(s.round.players[2].hand));
    // A newly imposed legality restriction invalidates the stored choice.
    expect(chooseEnemyFifteenDiscard(after, p, [], [dropped!.id])?.id).not.toBe(dropped!.id);
  });

  it("手牌が変わった後は古い計画を再利用しない", () => {
    const s = fixture("11m22p33s4m5p6s7z89m1p", "4m5p6s7z");
    const after = drawCpuTile(s, 2, () => 0); const p = after.round.players[2];
    expect(p.riverDrawDiscardPlan).toBeDefined();
    const stale = p.riverDrawDiscardPlan!.discardTileId;
    p.hand = p.hand.map(t => t.id === stale ? tiles("2z")[0] : t);
    expect(chooseEnemyFifteenDiscard(after, p, [])?.id).not.toBe(stale);
  });

  it("河の幺九牌を1巡1枚ずつ集め、通常手から国士へ転換して完成する", () => {
    let s = fixture("19m19p19s1z234m456p", "234567z1m");
    let won = false;
    for (let turn = 0; turn < 8; turn++) {
      const p = s.round.players[2];
      const chosen = chooseEnemyFifteenRiverDraw(s, p, []);
      expect(chosen, `turn ${turn}`).not.toBeNull();
      expect(chosen!.tile.suit === "honor" || [1, 9].includes(chosen!.tile.rank)).toBe(true);
      const previousCount = p.hand.length;
      s = drawCpuTile(s, 2, () => 0);
      expect(s.round.players[2].hand).toHaveLength(previousCount + 1);
      const current = s.round.players[2];
      const win = evaluateWinningHand({ concealedTiles: current.hand, melds: [], winningTile: chosen!.tile,
        winMethod: "tsumo", seatWind: current.seatWind, prevailingWind: "east" });
      if (win.valid) { expect(win.best.score.yakumanMultiplier).toBeGreaterThan(0); won = true; break; }
      const drop = chooseEnemyFifteenDiscard(s, current, []);
      expect(drop).not.toBeNull();
      expect(drop!.suit !== "honor" && drop!.rank > 1 && drop!.rank < 9).toBe(true);
      current.hand = current.hand.filter(t => t.id !== drop!.id);
      current.discards.push(discard(drop!));
      s.round.liveWall = s.round.liveWall.slice(3); s.round.phase = "drawing";
    }
    expect(won).toBe(true);
  });

  it("河の対子候補を集めて七対子を完成する", () => {
    let s = fixture("11m22p33s4m5p6s7z89m1p", "4m5p6s7z");
    let won = false;
    for (let i = 0; i < 5; i++) {
      const pick = chooseEnemyFifteenRiverDraw(s, s.round.players[2], []);
      expect(pick).not.toBeNull();
      s = drawCpuTile(s, 2, () => 0);
      const p = s.round.players[2];
      if (calculateShanten(p.hand).sevenPairs === -1) { won = true; break; }
      const drop = chooseEnemyFifteenDiscard(s, p, []);
      expect(drop).not.toBeNull();
      p.hand = p.hand.filter(t => t.id !== drop!.id); p.discards.push(discard(drop!));
      s.round.phase = "drawing"; s.round.liveWall = s.round.liveWall.slice(3);
    }
    expect(won).toBe(true);
  });

  it("和了牌が全て河にあっても立直候補から除外しない", () => {
    const s = fixture("123456m123p789s56z", "555z");
    const p = s.round.players[2]; const drop = p.hand[p.hand.length - 1]!;
    const choice = chooseEnemyRiichi(s, { player: p, doraIndicators: [], riichiDiscardTileIds: [drop.id] });
    expect(choice?.discardTileId).toBe(drop.id);
    expect(choice?.remainingWinningTileCount).toBe(3);
  });

  it("相手立直に対しても、次の河拾いで和了できる聴牌を維持する", () => {
    const s = fixture("123456m123p789s56z", "555z1m");
    s.round.players[0].riichi = true;
    const p = s.round.players[2];
    expect(chooseEnemyFifteenDiscard(s, p, [])?.id).toBe(p.hand[p.hand.length - 1]!.id);
  });

  it("立直一発中は河の和了牌を取得し、山を減らさず一発ツモとして評価できる", () => {
    const s = fixture("123456m123p789s5z", "5z");
    const p = s.round.players[2]; p.riichi = true; p.ippatsu = true;
    const r = drawCpuTile(s, 2, () => 0);
    const after = r.round.players[2];
    expect(after.drawnTileSource).toBe("river"); expect(after.ippatsu).toBe(true);
    expect(r.round.liveWall).toHaveLength(s.round.liveWall.length);
    const win = evaluateWinningHand({ concealedTiles: after.hand, melds: [],
      winningTile: after.hand.find(t => t.id === after.drawnTileId)!,
      winMethod: "tsumo", seatWind: after.seatWind, prevailingWind: "east", riichi: true, ippatsu: after.ippatsu });
    expect(win.valid).toBe(true);
    expect(JSON.stringify(win.valid ? win.best : null)).toContain("一発");
  });

  it("門前で回収できる役牌を安易にポンしない", () => {
    const s = fixture("55z123m456p78s99p1z", "5z9s");
    const p = s.round.players[2]; const called = s.round.players[0].discards[0];
    s.round.lastDiscard = { seat: 0, discard: called };
    const option: MeldCallOption = { id: "pon", kind: "pon", callerSeat: 2, discarderSeat: 0,
      calledTileId: called.tile.id, handTileIds: [p.hand[0].id, p.hand[1].id] };
    expect(shouldEnemyFifteenCall(s, p, [], option, p.hand[p.hand.length - 1]!.id)).toBe(false);
  });

  it("残り1巡で、完成まで7回拾う国士に転換しない", () => {
    const s = fixture("19m19p19s1z234m456p", "234567z1m", 1);
    expect(chooseEnemyFifteenRiverDraw(s, s.round.players[2], [])).toBeNull();
  });

  it("すでに副露した手では、速度を上げる有益なポンを認める", () => {
    const s = fixture("22m456p78s99p1z", "2m9s");
    const p = s.round.players[2];
    p.melds = [{ kind: "pon", tiles: tiles("555z"), calledFrom: 1 }];
    const called = s.round.players[0].discards[0];
    s.round.lastDiscard = { seat: 0, discard: called };
    const option: MeldCallOption = { id: "pon", kind: "pon", callerSeat: 2, discarderSeat: 0,
      calledTileId: called.tile.id, handTileIds: [p.hand[0].id, p.hand[1].id] };
    expect(shouldEnemyFifteenCall(s, p, [], option, p.hand[p.hand.length - 1].id)).toBe(true);
  });

  it("国士の完成が河から見込めるなら九種九牌で流さない方針になる", () => {
    const s = fixture("19m19p19s123z234m56p", "4567z1m");
    expect(prefersEnemyFifteenSpecialHand(s, s.round.players[2], [], true)).toBe(true);
  });

  it("必要な幺九牌が4枚とも副露済みなら国士計画を採用しない", () => {
    const s = fixture("19m19p1s1234567z23m", "1m");
    s.round.players[1].melds = [{ kind: "openKan", tiles: tiles("9999s"), calledFrom: 0 }];
    expect(prefersEnemyFifteenSpecialHand(s, s.round.players[2], [], true)).toBe(false);
  });

  it("通常手でも河から必要牌を拾い、合法な聴牌を作る", () => {
    const s = fixture("123456m123p78s5z6z", "9s5z");
    const picked = chooseEnemyFifteenRiverDraw(s, s.round.players[2], []);
    expect(picked).not.toBeNull();
    const after = drawCpuTile(s, 2, () => 0);
    const p = after.round.players[2];
    const drop = chooseEnemyFifteenDiscard(after, p, []);
    expect(drop).not.toBeNull();
    expect(calculateShanten(p.hand.filter(t => t.id !== drop!.id)).minimum).toBe(0);
  });

  it("裏向き・副露済み・河拾い済みの牌を取得候補にしない", () => {
    const s = fixture("123456m123p789s5z", "555z");
    const d = s.round.players[0].discards;
    d[0].faceDown = true; d[1].called = true; d[2].removedFromRiver = true;
    expect(chooseEnemyFifteenRiverDraw(s, s.round.players[2], [])).toBeNull();
  });

  it("他家の手牌や山の並びを変えても判断は変わらない", () => {
    const s = fixture("11m22p33s4m5p6s7z89m1p", "4m5p6s7z");
    const first = chooseEnemyFifteenRiverDraw(s, s.round.players[2], []);
    s.round.players[0].hand = tiles("1112223334445z");
    s.round.liveWall = s.round.liveWall.map((_, i) => tiles(i % 2 ? "9s" : "1p")[0]);
    expect(chooseEnemyFifteenRiverDraw(s, s.round.players[2], [])?.tile.id).toBe(first?.tile.id);
  });

  it("打牌禁止を守り、能力無効時は専用AIを使わない", () => {
    const s = fixture("123456m123p789s56z", "555z");
    const p = s.round.players[2]; const blocked = p.hand[p.hand.length - 1]!;
    expect(chooseEnemyFifteenDiscard(s, p, [], [blocked.id])?.id).not.toBe(blocked.id);
    s.akuukan = disableAkuukanSource(s.akuukan!, "enemy-ability:E-28");
    expect(isEnemyFifteenPlannerEnabled(s, p)).toBe(false);
    expect(chooseEnemyFifteenDiscard(s, p, [])).toBeNull();
  });
});
