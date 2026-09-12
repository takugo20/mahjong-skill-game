import { describe, expect, it, vi } from "vitest";
import {
  createInitialGameState,
  declarePlayerOpenKan,
  getPlayerOpenKanCallOptions,
  getPlayerSelfKanOptions,
  playPlayerSelfKan
} from "./engine";
import type { Tile } from "./types";
import { disableAkuukanSource } from "../akuukan/state";

function tile(id: string, rank = 1): Tile {
  return { id, suit: "man", rank, red: false };
}

function prepare(
  kind: "closedKan" | "addedKan" | "openKan"
) {
  const state = createInitialGameState(() => 0.5, {
    enemyId: "enemy-1",
    equippedSkills: [{ id: "5-3", level: 5 }]
  });

  const kan = Array.from(
    { length: 4 },
    (_, i) => tile(`kan-${i}`, 6)
  );
  const others = Array.from(
    { length: 10 },
    (_, i) => ({
      ...tile(`hand-${i}`, i % 9 + 1),
      suit: "pin" as const
    })
  );

  state.round.liveWall = [
    tile("matching", 5),
    tile("replacement")
  ];
  state.round.deadWall = Array.from(
    { length: 14 },
    (_, i) => tile(`dead-${i}`)
  );

  state.round.players.forEach(player => {
    player.hand = [];
    player.melds = [];
    player.discards = [];
    player.riichi = false;
    player.ippatsu = false;
    player.drawnTileId = null;
  });

  const player = state.round.players[0];
  player.hand = [...kan, ...others];
  player.drawnTileId = others[9].id;
  player.drawnTileSource = "liveWall";

  if (kind === "addedKan") {
    player.hand = [kan[3], ...others];
    player.melds = [{
      kind: "pon",
      tiles: kan.slice(0, 3),
      calledFrom: 1,
      calledTileId: kan[0].id
    }];
  } else if (kind === "openKan") {
    player.hand = [...kan.slice(0, 3), ...others];
    player.drawnTileId = null;
    player.drawnTileSource = null;

    const discard = {
      tile: kan[3],
      tsumogiri: false,
      riichiDeclaration: false,
      faceDown: false,
      called: false
    };

    state.round.phase = "reaction";
    state.round.currentSeat = 2;
    state.round.lastDiscard = { seat: 1, discard };
    state.round.players[1].discards = [discard];
    state.round.meldCallOptions = [{
      id: "pon-option",
      kind: "pon",
      callerSeat: 0,
      discarderSeat: 1,
      calledTileId: kan[3].id,
      handTileIds: [kan[0].id, kan[1].id]
    }];
  }

  return state;
}

describe("5-3 槓ドラ抽選のエンジン統合", () => {
  it.each([
    "closedKan",
    "addedKan",
    "openKan"
  ] as const)(
    "%sで新しい表示牌へ補正を適用する",
    kind => {
      const state = prepare(kind);
      const before = JSON.stringify(state);
      const random = vi.fn(() => 0.1);

      const options = kind === "openKan"
        ? getPlayerOpenKanCallOptions(state)
        : getPlayerSelfKanOptions(state);

      const option = options.find(
        candidate => candidate.kind === kind
      );

      expect(option).toBeDefined();

      const result = kind === "openKan"
        ? declarePlayerOpenKan(state, option!.id, random)
        : playPlayerSelfKan(state, option!.id, random);

      expect(result.round.phase).toBe("discarding");

      expect(result.round.deadWall[6]).toBe(
        state.round.liveWall[0]
      );
      expect(result.round.deadWall[4]).toBe(
        state.round.deadWall[4]
      );
      expect(result.round.liveWall[0]).toBe(
        state.round.deadWall[6]
      );

      expect(result.round.kanCount).toBe(1);
      expect(result.round.rinshanDrawCount).toBe(1);
      expect(result.round.doraIndicatorCount).toBe(2);

      expect(
        result.round.players[0].melds[0].kind
      ).toBe(kind);

      expect(
        result.round.players[0].drawnTileId
      ).toBe(state.round.deadWall[0].id);

      expect(random).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(state)).toBe(before);
    }
  );

  it("無効化中は表示牌を交換せず槓を進める", () => {
    const state = prepare("closedKan");

    state.akuukan = disableAkuukanSource(
      state.akuukan!,
      "player-skill:5-3"
    );

    const option = getPlayerSelfKanOptions(state)[0];
    const random = vi.fn(() => 0.1);
    const result = playPlayerSelfKan(
      state,
      option.id,
      random
    );

    expect(result.round.kanCount).toBe(1);
    expect(result.round.deadWall[6]).toBe(
      state.round.deadWall[6]
    );
    expect(random).not.toHaveBeenCalled();
  });
});
