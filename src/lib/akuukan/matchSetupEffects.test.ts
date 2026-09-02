import {
  describe,
  expect,
  it
} from "vitest";
import {
  getAkuukanMatchSetupDisabledSources
} from "./matchSetupEffects";
import type {
  AkuukanMatchSetup
} from "./types";

function createSetup(
  enemyId: AkuukanMatchSetup["enemyId"],
  equippedSkills:
    AkuukanMatchSetup["equippedSkills"]
): AkuukanMatchSetup {
  return {
    enemyId,
    equippedSkills
  };
}

describe("敵6 E-18の対局開始時無効化", () => {
  it("装備中のプレイヤースキルをすべて無効化対象にする", () => {
    const setup = createSetup(
      "enemy-6",
      [
        {
          id: "1-1",
          level: 3
        },
        {
          id: "2-7",
          level: 1
        },
        {
          id: "5-8",
          level: 5
        }
      ]
    );

    expect(
      getAkuukanMatchSetupDisabledSources(
        setup
      )
    ).toEqual([
      "player-skill:1-1",
      "player-skill:2-7",
      "player-skill:5-8"
    ]);
  });

  it("敵6自身のE-10とE-18は無効化対象にしない", () => {
    const disabledSources =
      getAkuukanMatchSetupDisabledSources(
        createSetup("enemy-6", [
          {
            id: "1-1",
            level: 1
          }
        ])
      );

    expect(disabledSources).not.toContain(
      "enemy-ability:E-10"
    );
    expect(disabledSources).not.toContain(
      "enemy-ability:E-18"
    );
  });

  it("プレイヤースキルを装備していなければ空配列を返す", () => {
    expect(
      getAkuukanMatchSetupDisabledSources(
        createSetup("enemy-6", [])
      )
    ).toEqual([]);
  });

  it("E-18を持たない敵なら装備スキルを無効化しない", () => {
    expect(
      getAkuukanMatchSetupDisabledSources(
        createSetup("enemy-5", [
          {
            id: "1-1",
            level: 3
          },
          {
            id: "2-7",
            level: 1
          }
        ])
      )
    ).toEqual([]);
  });

  it("呼び出すたびに独立した配列を返す", () => {
    const setup = createSetup(
      "enemy-6",
      [
        {
          id: "1-1",
          level: 1
        }
      ]
    );
    const first =
      getAkuukanMatchSetupDisabledSources(
        setup
      );
    const second =
      getAkuukanMatchSetupDisabledSources(
        setup
      );

    expect(first).toEqual([
      "player-skill:1-1"
    ]);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
  });
});
