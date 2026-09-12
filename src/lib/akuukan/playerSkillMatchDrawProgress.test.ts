import { describe, expect, it } from "vitest";
import {
  createInitialGameState
} from "../mahjong/engine";
import {
  createInitialAkuukanSaveData
} from "./saveData";
import {
  tryStartAkuukanMatchFromSaveData
} from "./saveDataMatchStart";
import {
  createInitialPlayerSkillGrowthState
} from "./playerSkillProgress";
import {
  createPlayerSkillMatchDrawProgress as create,
  recordPlayerSkillMatchDrawProgress as record
} from "./playerSkillMatchDrawProgress";
import type {
  PlayerSkillRoundDrawResult
} from "./playerSkillRoundDrawProgress";

const draw: PlayerSkillRoundDrawResult = {
  phase: "roundEnd",
  drawResult: {
    tenpaiSeats: [],
    notenSeats: [0, 1, 2, 3],
    pointChanges: []
  }
};

describe("対局中の流局進捗と重複防止", () => {
  it("同じ局結果を再処理しても1回だけ数える", () => {
    const initial = create(
      createInitialPlayerSkillGrowthState()
    );
    const first = record(initial, 1, draw);

    expect(
      record(first, 1, {
        ...draw,
        phase: "matchEnd"
      })
    ).toBe(first);

    expect(
      first.growth.unlockProgress["round-draw-count"]
    ).toBe(1);
    expect(initial.recordedRoundNumbers).toEqual([]);
    expect(
      initial.growth.unlockProgress["round-draw-count"]
    ).toBe(0);
  });

  it("連荘でも別の通し番号なら加算し、古い局の再処理は無視する", () => {
    let state = create(
      createInitialPlayerSkillGrowthState()
    );

    state = record(state, 1, draw);
    state = record(state, 2, draw);

    expect(record(state, 1, draw)).toBe(state);
    expect(
      state.growth.unlockProgress["round-draw-count"]
    ).toBe(2);
    expect(state.recordedRoundNumbers).toEqual([1, 2]);
  });

  it("未確定の局は記録済みにせず、確定後に記録する", () => {
    const initial = create(
      createInitialPlayerSkillGrowthState()
    );

    expect(
      record(initial, 1, {
        ...draw,
        phase: "drawing"
      })
    ).toBe(initial);

    expect(
      record(initial, 1, {
        phase: "roundEnd"
      })
    ).toBe(initial);

    expect(
      record(initial, 1, draw)
        .growth.unlockProgress["round-draw-count"]
    ).toBe(1);
  });

  it("流し満貫は記録済みにするが流局回数を増やさない", () => {
    const initial = create(
      createInitialPlayerSkillGrowthState()
    );

    const state = record(initial, 1, {
      phase: "roundEnd",
      nagashiManganResult: {
        winnerSeats: [0],
        riichiPoolRecipientSeat: 0,
        pointChanges: []
      }
    });

    expect(state.growth).toBe(initial.growth);
    expect(state.recordedRoundNumbers).toEqual([1]);
  });

  it("次の対局では累積進捗を引き継ぎ局番号の記録をリセットする", () => {
    const first = record(
      create(createInitialPlayerSkillGrowthState()),
      1,
      draw
    );
    const next = create(first.growth);

    expect(next.recordedRoundNumbers).toEqual([]);
    expect(
      record(next, 1, draw)
        .growth.unlockProgress["round-draw-count"]
    ).toBe(2);
  });

  it.each([
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1
  ])("不正な局番号%sを拒否する", roundNumber => {
    expect(() =>
      record(
        create(createInitialPlayerSkillGrowthState()),
        roundNumber,
        draw
      )
    ).toThrow(RangeError);
  });

  it("新規対局では局番号1と初期進捗を保持する", () => {
    const state = createInitialGameState(() => 0.5, {
      enemyId: "enemy-1",
      equippedSkills: []
    });

    expect(state.roundSequence).toBe(1);
    expect(
      state.playerSkillDrawProgress?.recordedRoundNumbers
    ).toEqual([]);
    expect(
      state.playerSkillDrawProgress?.growth
        .unlockProgress["round-draw-count"]
    ).toBe(0);
  });

  it("セーブからの対局開始では累積進捗を引き継ぐ", () => {
    const save = createInitialAkuukanSaveData();

    const growth = record(
      create(save.playerSkillGrowth),
      1,
      draw
    ).growth;

    const result = tryStartAkuukanMatchFromSaveData(
      {
        ...save,
        playerSkillGrowth: growth
      },
      "enemy-1",
      () => 0.5
    );

    expect(result.succeeded).toBe(true);
    expect(result.gameState?.roundSequence).toBe(1);
    expect(
      result.gameState?.playerSkillDrawProgress?.growth
    ).toBe(growth);
    expect(
      result.gameState?.playerSkillDrawProgress
        ?.recordedRoundNumbers
    ).toEqual([]);
  });
});
