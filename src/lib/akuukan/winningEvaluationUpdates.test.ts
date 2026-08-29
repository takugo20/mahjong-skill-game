import {
  describe,
  expect,
  it
} from "vitest";
import {
  createAkuukanNormalYakuCandidate,
  createAkuukanYakumanCandidate,
  getAkuukanNormalYakuFinalHan,
  getAkuukanYakumanMultiplier
} from "./winningEvaluation";
import {
  addAkuukanNormalYakuHan,
  cancelAkuukanNormalYakuOpenReduction,
  excludeAkuukanNormalYakuByOverlap,
  excludeAkuukanYakumanByOverlap,
  grantAkuukanNormalYaku,
  grantAkuukanYakuman,
  invalidateAkuukanNormalYaku,
  invalidateAkuukanYakuman,
  setAkuukanNormalYakuFixedHan
} from "./winningEvaluationUpdates";

function createOpenSanshokuCandidate() {
  return createAkuukanNormalYakuCandidate({
    id: "sanshokuDoujun",
    name: "三色同順",
    closedHan: 2,
    standardHan: 1,
    standardEligible: true
  });
}

describe("亜空間麻雀の通常役候補更新", () => {
  it("能力による成立許可を元候補を変えずに追加する", () => {
    const original =
      createAkuukanNormalYakuCandidate({
        id: "pinfu",
        name: "平和",
        closedHan: 1,
        standardHan: 0,
        standardEligible: false
      });
    const updated = grantAkuukanNormalYaku(
      original,
      "player-skill:2-6",
      1
    );

    expect(updated).not.toBe(original);
    expect(updated.abilityGrants).toEqual([
      {
        sourceId: "player-skill:2-6",
        han: 1
      }
    ]);
    expect(original.abilityGrants).toEqual([]);
    expect(
      getAkuukanNormalYakuFinalHan(updated)
    ).toBe(1);
  });

  it("同じ発動元の成立許可を二重登録せず値だけ更新する", () => {
    const original =
      createAkuukanNormalYakuCandidate({
        id: "pinfu",
        name: "平和",
        closedHan: 1,
        standardHan: 0,
        standardEligible: false
      });
    const first = grantAkuukanNormalYaku(
      original,
      "player-skill:2-6",
      1
    );
    const duplicate = grantAkuukanNormalYaku(
      first,
      "player-skill:2-6",
      1
    );
    const replaced = grantAkuukanNormalYaku(
      duplicate,
      "player-skill:2-6",
      2
    );
    const anotherSource =
      grantAkuukanNormalYaku(
        replaced,
        "enemy-ability:E-14",
        3
      );

    expect(duplicate).toBe(first);
    expect(replaced.abilityGrants).toEqual([
      {
        sourceId: "player-skill:2-6",
        han: 2
      }
    ]);
    expect(
      anotherSource.abilityGrants
    ).toHaveLength(2);
    expect(
      getAkuukanNormalYakuFinalHan(
        anotherSource
      )
    ).toBe(3);
  });

  it("役無効化の発動元を重複なく記録する", () => {
    const original =
      createOpenSanshokuCandidate();
    const invalidated =
      invalidateAkuukanNormalYaku(
        original,
        "enemy-ability:E-7"
      );
    const duplicate =
      invalidateAkuukanNormalYaku(
        invalidated,
        "enemy-ability:E-7"
      );

    expect(invalidated.invalidatedBy).toEqual([
      "enemy-ability:E-7"
    ]);
    expect(duplicate).toBe(invalidated);
    expect(original.invalidatedBy).toEqual([]);
    expect(
      getAkuukanNormalYakuFinalHan(
        invalidated
      )
    ).toBe(0);
  });

  it("上位役との重複除外を元候補を変えずに設定する", () => {
    const original =
      createAkuukanNormalYakuCandidate({
        id: "iipeikou",
        name: "一盃口",
        closedHan: 1,
        standardHan: 1,
        standardEligible: true
      });
    const excluded =
      excludeAkuukanNormalYakuByOverlap(
        original,
        "ryanpeikou"
      );
    const duplicate =
      excludeAkuukanNormalYakuByOverlap(
        excluded,
        "ryanpeikou"
      );

    expect(excluded.excludedBy).toBe(
      "ryanpeikou"
    );
    expect(duplicate).toBe(excluded);
    expect(original.excludedBy).toBeNull();
    expect(
      getAkuukanNormalYakuFinalHan(
        excluded
      )
    ).toBe(0);
  });

  it("喰い下がり無効・固定翻・翻加算を順番に適用する", () => {
    const original =
      createOpenSanshokuCandidate();
    const openReductionCancelled =
      cancelAkuukanNormalYakuOpenReduction(
        original,
        "player-skill:2-1"
      );
    const fixed =
      setAkuukanNormalYakuFixedHan(
        openReductionCancelled,
        "player-skill:1-7",
        4
      );
    const added = addAkuukanNormalYakuHan(
      fixed,
      "player-skill:2-8",
      2
    );
    const duplicate =
      addAkuukanNormalYakuHan(
        added,
        "player-skill:2-8",
        2
      );

    expect(
      openReductionCancelled
        .openReductionCancelledBy
    ).toEqual(["player-skill:2-1"]);
    expect(fixed.fixedHanChanges).toEqual([
      {
        sourceId: "player-skill:1-7",
        han: 4
      }
    ]);
    expect(added.hanAdditions).toEqual([
      {
        sourceId: "player-skill:2-8",
        han: 2
      }
    ]);
    expect(duplicate).toBe(added);
    expect(
      getAkuukanNormalYakuFinalHan(added)
    ).toBe(6);
    expect(
      getAkuukanNormalYakuFinalHan(original)
    ).toBe(1);
  });

  it("同じ発動元の固定翻と加算翻を置き換える", () => {
    const original =
      createOpenSanshokuCandidate();
    const fixedOnce =
      setAkuukanNormalYakuFixedHan(
        original,
        "player-skill:1-7",
        3
      );
    const fixedTwice =
      setAkuukanNormalYakuFixedHan(
        fixedOnce,
        "player-skill:1-7",
        4
      );
    const addedOnce = addAkuukanNormalYakuHan(
      fixedTwice,
      "player-skill:2-8",
      1
    );
    const addedTwice = addAkuukanNormalYakuHan(
      addedOnce,
      "player-skill:2-8",
      2
    );

    expect(
      fixedTwice.fixedHanChanges
    ).toEqual([
      {
        sourceId: "player-skill:1-7",
        han: 4
      }
    ]);
    expect(addedTwice.hanAdditions).toEqual([
      {
        sourceId: "player-skill:2-8",
        han: 2
      }
    ]);
    expect(
      getAkuukanNormalYakuFinalHan(
        addedTwice
      )
    ).toBe(6);
  });

  it("0以下または整数でない翻数を拒否する", () => {
    const candidate =
      createOpenSanshokuCandidate();

    expect(() =>
      grantAkuukanNormalYaku(
        candidate,
        "player-skill:2-6",
        0
      )
    ).toThrow(
      "成立許可翻数は1以上の整数で指定してください。"
    );
    expect(() =>
      setAkuukanNormalYakuFixedHan(
        candidate,
        "player-skill:1-7",
        1.5
      )
    ).toThrow(
      "固定翻数は1以上の整数で指定してください。"
    );
    expect(() =>
      addAkuukanNormalYakuHan(
        candidate,
        "player-skill:2-8",
        -1
      )
    ).toThrow(
      "加算翻数は1以上の整数で指定してください。"
    );
  });
});

describe("亜空間麻雀の役満候補更新", () => {
  it("能力による役満成立許可を重複なく更新する", () => {
    const original =
      createAkuukanYakumanCandidate({
        id: "fourConcealedTriplets",
        name: "四暗刻",
        standardMultiplier: 1,
        standardEligible: false
      });
    const granted = grantAkuukanYakuman(
      original,
      "player-skill:3-1",
      1
    );
    const duplicate = grantAkuukanYakuman(
      granted,
      "player-skill:3-1",
      1
    );
    const replaced = grantAkuukanYakuman(
      duplicate,
      "player-skill:3-1",
      2
    );

    expect(duplicate).toBe(granted);
    expect(replaced.abilityGrants).toEqual([
      {
        sourceId: "player-skill:3-1",
        multiplier: 2
      }
    ]);
    expect(original.abilityGrants).toEqual([]);
    expect(
      getAkuukanYakumanMultiplier(replaced)
    ).toBe(2);
    expect(() =>
      grantAkuukanYakuman(
        original,
        "player-skill:3-1",
        0
      )
    ).toThrow(
      "役満倍率は1以上の整数で指定してください。"
    );
  });

  it("役満無効化の発動元を重複なく記録する", () => {
    const original =
      createAkuukanYakumanCandidate({
        id: "nineGates",
        name: "九蓮宝燈",
        standardMultiplier: 1,
        standardEligible: true
      });
    const invalidated = invalidateAkuukanYakuman(
      original,
      "enemy-ability:E-17"
    );
    const duplicate = invalidateAkuukanYakuman(
      invalidated,
      "enemy-ability:E-17"
    );

    expect(invalidated.invalidatedBy).toEqual([
      "enemy-ability:E-17"
    ]);
    expect(duplicate).toBe(invalidated);
    expect(original.invalidatedBy).toEqual([]);
    expect(
      getAkuukanYakumanMultiplier(
        invalidated
      )
    ).toBe(0);
  });

  it("上位役満との重複除外を元候補を変えずに設定する", () => {
    const original =
      createAkuukanYakumanCandidate({
        id: "nineGates",
        name: "九蓮宝燈",
        standardMultiplier: 1,
        standardEligible: true
      });
    const excluded =
      excludeAkuukanYakumanByOverlap(
        original,
        "pureNineGates"
      );
    const duplicate =
      excludeAkuukanYakumanByOverlap(
        excluded,
        "pureNineGates"
      );

    expect(excluded.excludedBy).toBe(
      "pureNineGates"
    );
    expect(duplicate).toBe(excluded);
    expect(original.excludedBy).toBeNull();
    expect(
      getAkuukanYakumanMultiplier(excluded)
    ).toBe(0);
  });
});
