import { describe, expect, it } from "vitest";
import { startNextRound } from "../mahjong/engine";
import {
  createInitialAkuukanSaveData
} from "./saveData";
import {
  tryStartAkuukanMatchFromSaveData
} from "./saveDataMatchStart";
import {
  settleAkuukanGameMatchProgress as settle
} from "./gameMatchProgress";
import { disableAkuukanSource } from "./state";

function prepare() {
  const save = {
    ...createInitialAkuukanSaveData(),
    equippedSkills: [{
      id: "1-1" as const,
      level: 1 as const
    }]
  };

  const started = tryStartAkuukanMatchFromSaveData(
    save,
    "enemy-1",
    () => 0.5
  );

  if (!started.succeeded) {
    throw new Error("テストの対局開始に失敗しました。");
  }

  const state = started.gameState;
  state.round.phase = "roundEnd";

  state.round.players.forEach((player, index) => {
    player.score = [40000, 30000, 30100, -100][index];
  });

  return { state, save };
}

describe("対局終了と成長処理の接続", () => {
  it("最終順位の確定後に経験値と解放を反映する", () => {
    const { state, save } = prepare();
    const result = startNextRound(state, () => 0.5);

    expect(result.round.phase).toBe("matchEnd");
    expect(
      result.matchProgress?.settlement?.experiencePerSkill
    ).toBe(500);
    expect(
      result.playerSkillDrawProgress?.growth
        .skills["1-1"].currentExp
    ).toBe(500);
    expect(
      result.matchProgress?.settlement?.unlockedSkillIds
    ).toContain("1-5");
    expect(
      save.playerSkillGrowth.skills["1-1"].currentExp
    ).toBe(0);
  });

  it("終了処理を再実行しても経験値や1位回数が増えない", () => {
    const result = startNextRound(
      prepare().state,
      () => 0.5
    );

    expect(settle(result)).toBe(result);
    expect(
      startNextRound(result, () => 0.5)
    ).toBe(result);
    expect(
      result.matchProgress?.settlement?.enemyProgress
        .enemies["enemy-1"].firstPlaceCount
    ).toBe(1);
  });

  it("無効化された開始時の装備にも経験値を付与する", () => {
    const { state } = prepare();

    state.akuukan = disableAkuukanSource(
      state.akuukan!,
      "player-skill:1-1"
    );

    const result = startNextRound(state, () => 0.5);

    expect(
      result.playerSkillDrawProgress?.growth
        .skills["1-1"].currentExp
    ).toBe(500);
  });

  it("対局が終わっていなければ成長処理を行わない", () => {
    const { state } = prepare();

    expect(settle(state)).toBe(state);
    expect(state.matchProgress?.settlement).toBeNull();
  });
});
