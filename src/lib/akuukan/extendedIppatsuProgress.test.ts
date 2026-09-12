import { describe, expect, it } from "vitest";
import {
  createAkuukanPlayerSkill5_4Progress as create,
  recordAkuukanPlayerSkill5_4Discard as discard,
  completeAkuukanPlayerSkill5_4DiscardReactions as complete,
  interruptAkuukanPlayerSkill5_4Progress as interrupt
} from "./extendedIppatsuProgress";
import {
  isAkuukanPlayerSkill5_4IppatsuAvailable as available
} from "./extendedIppatsu";
import { createInitialAkuukanGameState } from "./state";

describe("5-4 一発期間の進行", () => {
  it("立直成立時は0巡で、宣言牌は数えない", () => {
    const initial = create();

    expect(initial.completedTurnsAfterRiichi).toBe(0);
    expect(
      complete(discard(initial, true))
    ).toBe(initial);
  });

  it("自分の打牌への反応完了で初めて1巡進む", () => {
    const initial = create();
    const pending = discard(initial, false);

    expect(pending.completedTurnsAfterRiichi).toBe(0);
    expect(pending.awaitingDiscardReactions).toBe(true);

    const result = complete(pending);

    expect(result.completedTurnsAfterRiichi).toBe(1);
    expect(result.awaitingDiscardReactions).toBe(false);
    expect(initial).toEqual(create());
  });

  it("同じ打牌や反応完了を重複して数えない", () => {
    const pending = discard(create(), false);

    expect(discard(pending, false)).toBe(pending);

    const result = complete(pending);

    expect(complete(result)).toBe(result);
  });

  it("Lv.1の第2巡の反応完了までは有効", () => {
    const akuukan = createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "5-4", level: 1 }]
    });

    const pending = discard(
      complete(discard(create(), false)),
      false
    );

    const check = (
      progress: ReturnType<typeof create>
    ) => available({
      akuukan,
      winnerIsPlayer: true,
      riichiEstablished: true,
      ...progress
    });

    expect(check(pending)).toBe(true);
    expect(check(complete(pending))).toBe(false);
  });

  it("副露・槓による中断後は打牌しても復活しない", () => {
    const stopped = interrupt(
      discard(create(), false)
    );

    expect(stopped.interruptedByCallOrKan).toBe(true);
    expect(stopped.awaitingDiscardReactions).toBe(false);

    expect(
      complete(discard(stopped, false))
    ).toBe(stopped);

    expect(interrupt(stopped)).toBe(stopped);
  });
});
