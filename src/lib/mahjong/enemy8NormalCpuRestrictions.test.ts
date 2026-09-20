import { expect, it } from "vitest";
import { createInitialGameState } from "./engine";
import { createCpuDiscardInput } from "./cpuDiscard";
import { createInitialAkuukanGameState, disableAkuukanSource } from "../akuukan/state";
import { isAkuukanCallAllowed, isAkuukanRonAllowed } from "../akuukan/callLegality";
import { areAkuukanRiverTilesVisible } from "../akuukan/informationVisibility";

it("錆月戦の両無能力CPUは自分の河だけを打牌評価に利用する", () => {
  const state = createInitialGameState(() => 0.5);
  state.akuukan = createInitialAkuukanGameState({ enemyId: "enemy-8", equippedSkills: [] });
  for (const player of state.round.players) {
    player.discards = [{
      tile: { id: `river-${player.seat}`, suit: "man", rank: player.seat + 1, red: false },
      tsumogiri: false, riichiDeclaration: false, faceDown: false, called: false
    }];
  }
  for (const seat of [1, 3] as const) {
    const input = createCpuDiscardInput(state, state.round.players[seat], []);
    expect(input.visibleTiles.filter(t => t.id.startsWith("river-")).map(t => t.id))
      .toEqual([`river-${seat}`]);
  }
  const enemy = createCpuDiscardInput(state, state.round.players[2], []);
  expect(enemy.visibleTiles.filter(t => t.id.startsWith("river-"))).toHaveLength(4);
  state.akuukan = disableAkuukanSource(state.akuukan, "enemy-ability:E-13");
  for (const seat of [1, 3] as const) {
    expect(createCpuDiscardInput(state, state.round.players[seat], [])
      .visibleTiles.filter(t => t.id.startsWith("river-"))).toHaveLength(4);
  }
});

it("無能力CPUの河表示は本人と別の無能力CPUを区別する", () => {
  const akuukan = createInitialAkuukanGameState({ enemyId: "enemy-8", equippedSkills: [] });
  for (const own of [true, false]) {
    expect(areAkuukanRiverTilesVisible({
      akuukan, viewer: "normalOpponent", riverOwner: "normalOpponent", viewerIsRiverOwner: own
    })).toBe(own);
  }
});

it("無能力CPUの副露とロンを禁止し、無効化された場合は許可する", () => {
  const enabled = createInitialAkuukanGameState({ enemyId: "enemy-8", equippedSkills: [] });
  for (const disabled of [false, true]) {
    const akuukan = disabled ? disableAkuukanSource(enabled, "enemy-ability:E-13") : enabled;
    for (const kind of ["chi", "pon", "openKan"] as const) {
      expect(isAkuukanCallAllowed({ akuukan, owner: "normalOpponent", kind, score: 25000 })).toBe(disabled);
    }
    expect(isAkuukanRonAllowed({ akuukan, winner: "normalOpponent" })).toBe(disabled);
  }
});
